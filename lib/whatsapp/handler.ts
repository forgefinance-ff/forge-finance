import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { downloadMedia, sendConfirmButtons, sendText } from "./meta";
import { parseTransactionMessage, type ParsedItem } from "./parse";
import { transcribeAudio } from "./transcribe";
import {
  formatBRL,
  formatDayMonth,
  isRealDate,
  normalize,
  shiftDate,
  todayInBrazil,
} from "./text";

export type IncomingMessage = {
  id: string;
  from: string;
  type: "text" | "audio" | "button" | "other";
  text?: string;
  audioId?: string;
  buttonId?: string;
};

type Admin = ReturnType<typeof createAdminClient>;

type Link = {
  user_id: string;
  phone: string;
  default_account_id: string | null;
};

type Category = { id: string; name: string; type: "income" | "expense" };
type Account = { id: string; name: string };

type ResolvedItem = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category_id: string;
  category_name: string;
  account_id: string;
  account_name: string;
  date: string;
};

const MAX_MESSAGES_PER_HOUR = 30;

const HELP = `*Forge Finance no WhatsApp* 💜

Registre gastos e receitas por texto ou áudio:
• "gastei 45 no mercado"
• "recebi 1500 de freelance"
• "ontem paguei 80 de uber no Nubank"

Antes de salvar, eu sempre peço a sua confirmação.

Comandos:
• *conta padrão Nubank* — define a conta usada quando você não citar nenhuma
• *ajuda* — mostra esta mensagem`;

export async function handleIncoming(message: IncomingMessage) {
  const admin = createAdminClient();

  // 1) Idempotência: a Meta reenvia o webhook se demorarmos a responder.
  const { error: dedupeError } = await admin
    .from("whatsapp_processed_messages")
    .insert({ wamid: message.id, phone: message.from });

  if (dedupeError) {
    if (dedupeError.code !== "23505") {
      console.error("WhatsApp dedupe error", dedupeError.code);
    }
    return;
  }

  // 2) Limite simples por número.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("whatsapp_processed_messages")
    .select("wamid", { count: "exact", head: true })
    .eq("phone", message.from)
    .gte("created_at", since);

  if ((count ?? 0) > MAX_MESSAGES_PER_HOUR) {
    await sendText(
      message.from,
      "Muitas mensagens em pouco tempo. Tente de novo daqui a pouco. 🙏"
    );
    return;
  }

  try {
    const { data: link } = await admin
      .from("whatsapp_links")
      .select("user_id, phone, default_account_id")
      .eq("phone", message.from)
      .maybeSingle();

    if (!link) {
      await handleUnlinked(admin, message);
      return;
    }

    await handleLinked(admin, link as Link, message);
  } catch (error) {
    console.error("WhatsApp handler error", error);
    await sendText(
      message.from,
      "Ops, algo deu errado do meu lado. Tente de novo em instantes."
    );
  }
}

/* ------------------------------ vinculação ------------------------------ */

async function handleUnlinked(admin: Admin, message: IncomingMessage) {
  const match = message.text?.match(/^\s*vincular\s+(\d{6})\s*$/i);

  if (!match) {
    await sendText(
      message.from,
      "Olá! 👋 Este número ainda não está vinculado ao Forge Finance.\n\nNo app, abra a página *WhatsApp*, gere um código e envie aqui: *VINCULAR 123456*"
    );
    return;
  }

  const { data: codeRow } = await admin
    .from("whatsapp_link_codes")
    .select("code, user_id")
    .eq("code", match[1])
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!codeRow) {
    await sendText(
      message.from,
      "Código inválido ou expirado. Gere um novo na página *WhatsApp* do app."
    );
    return;
  }

  const { error } = await admin.from("whatsapp_links").upsert(
    { user_id: codeRow.user_id, phone: message.from, verified_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("WhatsApp link error", error.code);
    await sendText(
      message.from,
      error.code === "23505"
        ? "Este número já está vinculado a outra conta do Forge Finance."
        : "Não consegui vincular agora. Tente gerar um novo código."
    );
    return;
  }

  await admin.from("whatsapp_link_codes").delete().eq("code", codeRow.code);
  revalidatePath("/whatsapp");

  await sendText(
    message.from,
    `✅ Número vinculado!\n\n${HELP}`
  );
}

/* ------------------------------ fluxo normal ------------------------------ */

async function handleLinked(admin: Admin, link: Link, message: IncomingMessage) {
  if (message.type === "button" && message.buttonId) {
    const [action, pendingId] = message.buttonId.split(":");

    if ((action === "confirm" || action === "cancel") && pendingId) {
      await decide(admin, link, action, pendingId);
    }
    return;
  }

  if (message.type === "audio" && message.audioId) {
    let transcript = "";

    try {
      const { buffer, mimeType } = await downloadMedia(message.audioId);
      transcript = await transcribeAudio(buffer, mimeType);
    } catch (error) {
      console.error("WhatsApp audio error", (error as Error).message);
      await sendText(
        link.phone,
        (error as Error).message === "AUDIO_TOO_LARGE"
          ? "Esse áudio é muito longo. Mande um áudio curto ou escreva o lançamento."
          : "Não consegui ouvir esse áudio. Tente de novo ou escreva o lançamento."
      );
      return;
    }

    if (!transcript) {
      await sendText(link.phone, "Não consegui entender o áudio. Tente de novo? 🎙️");
      return;
    }

    await registerFromText(admin, link, transcript, true);
    return;
  }

  if (message.type === "text" && message.text) {
    const normalized = normalize(message.text);

    if (["ajuda", "menu", "help", "oi", "ola"].includes(normalized)) {
      await sendText(link.phone, HELP);
      return;
    }

    if (["sim", "confirmar", "confirmo", "ok"].includes(normalized)) {
      await decideLatest(admin, link, "confirm");
      return;
    }

    if (["nao", "cancelar", "cancela"].includes(normalized)) {
      await decideLatest(admin, link, "cancel");
      return;
    }

    const defaultAccount = normalized.match(/^conta padrao\s+(.+)$/);

    if (defaultAccount) {
      await setDefaultAccount(admin, link, defaultAccount[1]);
      return;
    }

    await registerFromText(admin, link, message.text, false);
    return;
  }

  await sendText(link.phone, "Envie um texto ou um áudio com o gasto ou a receita. 🙂");
}

async function loadContext(admin: Admin, userId: string) {
  const [{ data: categories }, { data: accounts }] = await Promise.all([
    admin.from("categories").select("id, name, type").eq("user_id", userId),
    admin.from("accounts").select("id, name").eq("user_id", userId),
  ]);

  return {
    categories: (categories ?? []) as Category[],
    accounts: (accounts ?? []) as Account[],
  };
}

function resolveCategory(name: string, type: "income" | "expense", categories: Category[]) {
  const same = categories.filter((c) => c.type === type);
  const target = normalize(name);

  return (
    same.find((c) => normalize(c.name) === target) ??
    same.find((c) => normalize(c.name) === "outros") ??
    null
  );
}

function resolveAccount(hint: string | null | undefined, accounts: Account[], defaultId: string | null) {
  if (hint && hint.trim()) {
    const wanted = normalize(hint);

    return (
      accounts.find((a) => {
        const n = normalize(a.name);
        return n === wanted || n.includes(wanted) || wanted.includes(n);
      }) ?? null
    );
  }

  if (defaultId) {
    const found = accounts.find((a) => a.id === defaultId);
    if (found) return found;
  }

  if (accounts.length === 1) return accounts[0];

  return null;
}

async function registerFromText(
  admin: Admin,
  link: Link,
  text: string,
  fromAudio: boolean
) {
  const { categories, accounts } = await loadContext(admin, link.user_id);

  if (accounts.length === 0) {
    await sendText(
      link.phone,
      "Você ainda não tem nenhuma conta cadastrada. Crie uma conta no app e tente de novo."
    );
    return;
  }

  const today = todayInBrazil();

  const result = await parseTransactionMessage(text, {
    today,
    categories: categories.map((c) => ({ name: c.name, type: c.type })),
    accounts: accounts.map((a) => ({ name: a.name })),
  });

  if (!result.ok) {
    await sendText(link.phone, result.reply);
    return;
  }

  const resolved: ResolvedItem[] = [];

  for (const item of result.items) {
    const problem = validateDate(item, today);

    if (problem) {
      await sendText(link.phone, problem);
      return;
    }

    const category = resolveCategory(item.category, item.type, categories);

    if (!category) {
      await sendText(
        link.phone,
        `Não encontrei uma categoria de ${
          item.type === "expense" ? "despesa" : "receita"
        } para "${item.description}". Crie uma categoria (ex.: "Outros") no app e tente de novo.`
      );
      return;
    }

    const account = resolveAccount(item.account, accounts, link.default_account_id);

    if (!account) {
      await sendText(
        link.phone,
        `Em qual conta? Mande de novo citando a conta, por exemplo: "${item.description} ${formatBRL(item.amount)} no ${accounts[0].name}".\n\nSuas contas: ${accounts
          .map((a) => a.name)
          .join(", ")}.\nDica: *conta padrão ${accounts[0].name}* define uma conta padrão.`
      );
      return;
    }

    resolved.push({
      type: item.type,
      amount: Math.round(item.amount * 100) / 100,
      description: item.description,
      category_id: category.id,
      category_name: category.name,
      account_id: account.id,
      account_name: account.name,
      date: item.date,
    });
  }

  const { data: pending, error } = await admin
    .from("whatsapp_pending")
    .insert({ user_id: link.user_id, phone: link.phone, payload: { items: resolved } })
    .select("id")
    .single();

  if (error || !pending) {
    console.error("WhatsApp pending error", error?.code);
    await sendText(link.phone, "Não consegui preparar o lançamento. Tente de novo.");
    return;
  }

  const lines = resolved.map(
    (r) =>
      `${r.type === "expense" ? "🔴" : "🟢"} ${r.description} — ${formatBRL(r.amount)}\n${r.category_name} • ${r.account_name} • ${formatDayMonth(r.date)}`
  );

  const heading = resolved.length > 1 ? "Confirmar estes lançamentos?" : "Confirmar este lançamento?";
  const echo = fromAudio ? `🎙️ Entendi: “${text.slice(0, 200)}”\n\n` : "";

  await sendConfirmButtons(link.phone, `${echo}${heading}\n\n${lines.join("\n\n")}`, pending.id);
}

function validateDate(item: ParsedItem, today: string): string | null {
  if (!isRealDate(item.date)) {
    return "Não entendi a data. Diga, por exemplo, \"ontem\" ou \"dia 15\".";
  }

  if (item.date < shiftDate(today, -366) || item.date > shiftDate(today, 31)) {
    return `A data ${formatDayMonth(item.date)} parece fora do esperado. Mande de novo com a data correta.`;
  }

  return null;
}

/* ------------------------------ confirmação ------------------------------ */

async function decideLatest(admin: Admin, link: Link, action: "confirm" | "cancel") {
  const { data } = await admin
    .from("whatsapp_pending")
    .select("id")
    .eq("user_id", link.user_id)
    .eq("phone", link.phone)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    await sendText(link.phone, "Não há nenhum lançamento aguardando confirmação.");
    return;
  }

  await decide(admin, link, action, data.id);
}

async function decide(
  admin: Admin,
  link: Link,
  action: "confirm" | "cancel",
  pendingId: string
) {
  // DELETE ... RETURNING garante que só um clique/mensagem "ganha" (sem duplicar).
  const { data: pending } = await admin
    .from("whatsapp_pending")
    .delete()
    .eq("id", pendingId)
    .eq("user_id", link.user_id)
    .gt("expires_at", new Date().toISOString())
    .select("payload")
    .maybeSingle();

  if (!pending) {
    await sendText(link.phone, "Esse lançamento já foi tratado ou expirou.");
    return;
  }

  if (action === "cancel") {
    await sendText(link.phone, "Cancelado. Nada foi salvo. 👍");
    return;
  }

  const items = ((pending.payload as { items?: ResolvedItem[] }).items ?? []) as ResolvedItem[];

  const { error } = await admin.from("transactions").insert(
    items.map((item) => ({
      user_id: link.user_id,
      account_id: item.account_id,
      category_id: item.category_id,
      type: item.type,
      title: item.description,
      description: item.description,
      amount: item.amount,
      transaction_date: item.date,
    }))
  );

  if (error) {
    console.error("WhatsApp insert error", error.code);
    await sendText(link.phone, "Não consegui salvar o lançamento. Tente registrar de novo.");
    return;
  }

  // Mesmo comportamento do app: ajusta o saldo da conta (um ajuste por conta).
  const deltas = new Map<string, number>();

  for (const item of items) {
    const delta = item.type === "income" ? item.amount : -item.amount;
    deltas.set(item.account_id, (deltas.get(item.account_id) ?? 0) + delta);
  }

  let balanceFailed = false;

  for (const [accountId, delta] of deltas) {
    const { data: account, error: readError } = await admin
      .from("accounts")
      .select("current_balance")
      .eq("id", accountId)
      .eq("user_id", link.user_id)
      .single();

    if (readError || !account) {
      balanceFailed = true;
      continue;
    }

    const { error: updateError } = await admin
      .from("accounts")
      .update({ current_balance: Number(account.current_balance) + delta })
      .eq("id", accountId)
      .eq("user_id", link.user_id);

    if (updateError) balanceFailed = true;
  }

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios");

  await sendText(
    link.phone,
    balanceFailed
      ? "✅ Lançamento salvo, mas não consegui atualizar o saldo da conta. Confira no app."
      : items.length > 1
        ? `✅ ${items.length} lançamentos salvos!`
        : "✅ Lançamento salvo!"
  );
}

/* ------------------------------ conta padrão ------------------------------ */

async function setDefaultAccount(admin: Admin, link: Link, wantedRaw: string) {
  const { accounts } = await loadContext(admin, link.user_id);
  const account = resolveAccount(wantedRaw, accounts, null);

  if (!account) {
    await sendText(
      link.phone,
      `Não achei essa conta. Suas contas: ${accounts.map((a) => a.name).join(", ") || "(nenhuma)"}.`
    );
    return;
  }

  await admin
    .from("whatsapp_links")
    .update({ default_account_id: account.id })
    .eq("user_id", link.user_id);

  revalidatePath("/whatsapp");
  await sendText(link.phone, `Conta padrão: *${account.name}* ✅`);
}
