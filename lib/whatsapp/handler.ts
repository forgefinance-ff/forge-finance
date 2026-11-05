import { AsyncLocalStorage } from "node:async_hooks";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { parseScope, SCOPE_EMOJI, SCOPE_LABEL } from "@/lib/scope";
import { hasWhatsAppAccess } from "@/lib/billing/access";
import { executeAuto, executePending, remember, runAgent, undoTransactions } from "./agent/agent";
import { canAutoExecute, type PreparedAction } from "./agent/write-tools";
import { downloadMedia } from "./meta";
import { transcribeAudio } from "./transcribe";
import { appUrl, connectUrl, getOrCreateOnboardingToken } from "./onboarding";
import { formatBRL, formatDayMonth, normalize } from "./text";
import { metaTransport, type Transport } from "./transport";

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

/** Lançamento pendente no formato antigo (antes do agente). */
type LegacyItem = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category_id: string;
  category_name: string;
  account_id: string;
  account_name: string;
  scope?: string;
  date: string;
};

const MAX_MESSAGES_PER_HOUR = 30;

export const WHATSAPP_HELP = `*Forge Finance no WhatsApp* 💜

Faço tudo o que o app faz, por texto ou áudio. Lançamentos eu registro na hora, com um botão para *desfazer*. Exclusões e mudanças eu sempre confirmo antes.

*Lançamentos*
• "gastei 45 no mercado"
• "recebi 1500 de freelance no Nubank"
• "apaga o último lançamento"
• "desfazer" (desfaz o último registro)

*Consultas*
• "qual meu saldo?"
• "quanto gastei com mercado esse mês?"
• "o que vence essa semana?"

*Empresa (MEI)* 🏢
• "conta a receber da Maria, 300, dia 15"
• "a Maria pagou"
• "cobrar a Maria" (te mando o link para enviar)
• "como está meu limite do MEI?"

*Cadastros*
• "cria a meta Viagem de 5 mil"
• "guarda 200 na meta Viagem"
• "cadastra o cliente João, 11 91234-5678"

Comandos: *conta padrão Nubank* • *ajuda*`;

/* ---------- envio (Meta em produção; memória no simulador) ---------- */

const transportStore = new AsyncLocalStorage<Transport>();

const out: Transport = {
  text: (to, body) => (transportStore.getStore() ?? metaTransport).text(to, body),
  buttons: (to, body, id) => (transportStore.getStore() ?? metaTransport).buttons(to, body, id),
  undo: (to, body, id) => (transportStore.getStore() ?? metaTransport).undo(to, body, id),
};

export async function handleIncoming(message: IncomingMessage, transport: Transport = metaTransport) {
  return transportStore.run(transport, () => handle(message));
}

async function handle(message: IncomingMessage) {
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
    await out.text(message.from, "Muitas mensagens em pouco tempo. Tente de novo daqui a pouco. 🙏");
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
    await out.text(message.from, "Ops, algo deu errado do meu lado. Tente de novo em instantes.");
  }
}

/* ------------------------------ vinculação ------------------------------ */

async function handleUnlinked(admin: Admin, message: IncomingMessage) {
  const match = message.text?.match(/^\s*vincular\s+(\d{6})\s*$/i);

  if (!match) {
    // Primeiro acesso: manda um link que cria a conta (ou entra) e já
    // conecta este número, sem precisar de código.
    const token = await getOrCreateOnboardingToken(admin, message.from);

    await out.text(
      message.from,
      `Olá! 👋 Eu sou o assistente do *Forge Finance*.\n\nPara começar, toque no link abaixo, crie sua conta (ou entre, se já tiver uma) e este número fica conectado na hora:\n\n${connectUrl(token)}\n\nO link vale por 24 horas e só funciona para este número.\n\nJá usa o app? Também dá para vincular pela página *WhatsApp*, enviando aqui *VINCULAR* e o código.`
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
    await out.text(message.from, "Código inválido ou expirado. Gere um novo na página *WhatsApp* do app.");
    return;
  }

  const { error } = await admin.from("whatsapp_links").upsert(
    { user_id: codeRow.user_id, phone: message.from, verified_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("WhatsApp link error", error.code);
    await out.text(
      message.from,
      error.code === "23505"
        ? "Este número já está vinculado a outra conta do Forge Finance."
        : "Não consegui vincular agora. Tente gerar um novo código."
    );
    return;
  }

  await admin.from("whatsapp_link_codes").delete().eq("code", codeRow.code);
  revalidatePath("/whatsapp");

  await out.text(message.from, `✅ Número vinculado!\n\n${WHATSAPP_HELP}`);
}

/* ------------------------------ fluxo normal ------------------------------ */

async function handleLinked(admin: Admin, link: Link, message: IncomingMessage) {
  // WhatsApp é do Forge Pro (com a cobrança desligada, todos usam).
  if (!(await hasWhatsAppAccess(admin, link.user_id))) {
    await paywall(admin, link);
    return;
  }

  if (message.type === "button" && message.buttonId) {
    const [action, pendingId] = message.buttonId.split(":");

    if ((action === "confirm" || action === "cancel") && pendingId) {
      await decide(admin, link, action, pendingId);
    }
    if (action === "undo" && pendingId) {
      await undo(admin, link, pendingId);
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
      await out.text(
        link.phone,
        (error as Error).message === "AUDIO_TOO_LARGE"
          ? "Esse áudio é muito longo. Mande um áudio curto ou escreva o pedido."
          : "Não consegui ouvir esse áudio. Tente de novo ou escreva o pedido."
      );
      return;
    }

    if (!transcript) {
      await out.text(link.phone, "Não consegui entender o áudio. Tente de novo? 🎙️");
      return;
    }

    await askAgent(admin, link, transcript, true);
    return;
  }

  if (message.type === "text" && message.text) {
    const normalized = normalize(message.text);

    if (["ajuda", "menu", "help", "oi", "ola"].includes(normalized)) {
      await out.text(link.phone, WHATSAPP_HELP);
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

    if (["desfazer", "desfaz", "desfaca"].includes(normalized)) {
      await undoLatest(admin, link);
      return;
    }

    const defaultAccount = normalized.match(/^conta padrao\s+(.+)$/);

    if (defaultAccount) {
      await setDefaultAccount(admin, link, defaultAccount[1]);
      return;
    }

    await askAgent(admin, link, message.text, false);
    return;
  }

  await out.text(link.phone, "Envie um texto ou um áudio com o seu pedido. 🙂");
}

/**
 * Pergunta ao agente: responde direto, grava lançamentos simples na hora
 * (uma mensagem só, com botão "Desfazer") ou pede confirmação do resto.
 */
async function askAgent(admin: Admin, link: Link, text: string, fromAudio: boolean) {
  const echo = fromAudio ? `🎙️ Entendi: “${text.slice(0, 200)}”\n\n` : "";
  const result = await runAgent(admin, link, text);

  await remember(admin, link.user_id, link.phone, "user", text);

  if (result.kind === "reply") {
    await remember(admin, link.user_id, link.phone, "assistant", result.text);
    await out.text(link.phone, `${echo}${result.text}`);
    return;
  }

  if (canAutoExecute(result.actions)) {
    await autoRegister(admin, link, result.actions, echo);
    return;
  }

  const { data: pending, error } = await admin
    .from("whatsapp_pending")
    .insert({
      user_id: link.user_id,
      phone: link.phone,
      payload: { version: 2, actions: result.actions },
    })
    .select("id")
    .single();

  if (error || !pending) {
    console.error("WhatsApp pending error", error?.code);
    await out.text(link.phone, "Não consegui preparar a ação. Tente de novo.");
    return;
  }

  const heading =
    result.actions.length > 1 ? `Confirmar estas ${result.actions.length} ações?` : "Confirmar?";
  const body = `${echo}${heading}\n\n${result.actions.map((a) => a.summary).join("\n\n")}`;

  await remember(
    admin,
    link.user_id,
    link.phone,
    "assistant",
    `Aguardando confirmação:\n${result.actions.map((a) => a.summary).join("\n")}`
  );

  // O corpo com botões aceita até 1000 caracteres; acima disso, manda o texto antes.
  if (body.length > 1000) {
    await out.text(link.phone, body);
    await out.buttons(link.phone, heading, pending.id);
  } else {
    await out.buttons(link.phone, body, pending.id);
  }
}

/* ------------------------------ registro direto ------------------------------ */

async function autoRegister(admin: Admin, link: Link, actions: PreparedAction[], echo: string) {
  const { text, transactionIds } = await executeAuto(admin, link, actions);
  await remember(admin, link.user_id, link.phone, "assistant", text);

  if (!transactionIds.length) {
    await out.text(link.phone, `${echo}${text}`);
    return;
  }

  const { data: undoRow, error } = await admin
    .from("whatsapp_undo")
    .insert({
      user_id: link.user_id,
      phone: link.phone,
      transaction_ids: transactionIds,
      summary: actions.map((a) => a.summary.split("\n")[0]).join("\n"),
    })
    .select("id")
    .single();

  const body = `${echo}${text}`;

  if (error || !undoRow) {
    console.error("WhatsApp undo save error", error?.code);
    await out.text(link.phone, `${body}\n\nSe algo estiver errado, mande "apaga o último lançamento".`);
    return;
  }

  // O corpo com botão aceita até 1000 caracteres; acima disso, manda o texto antes.
  if (body.length > 1000) {
    await out.text(link.phone, body);
    await out.undo(link.phone, "Algo errado? Toque para desfazer.", undoRow.id);
  } else {
    await out.undo(link.phone, body, undoRow.id);
  }
}

async function undo(admin: Admin, link: Link, undoId: string) {
  // DELETE ... RETURNING: só um clique "ganha" (sem desfazer duas vezes).
  const { data } = await admin
    .from("whatsapp_undo")
    .delete()
    .eq("id", undoId)
    .eq("user_id", link.user_id)
    .gt("expires_at", new Date().toISOString())
    .select("transaction_ids, summary")
    .maybeSingle();

  if (!data) {
    await out.text(link.phone, "Esse registro já foi desfeito ou passou do prazo de 24h. Para apagar, mande \"apaga o último lançamento\".");
    return;
  }

  const reply = await undoTransactions(admin, link, data.transaction_ids as string[], data.summary as string);
  await remember(admin, link.user_id, link.phone, "assistant", reply);
  await out.text(link.phone, reply);
}

async function undoLatest(admin: Admin, link: Link) {
  const { data } = await admin
    .from("whatsapp_undo")
    .select("id")
    .eq("user_id", link.user_id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    await out.text(link.phone, "Não há registro recente para desfazer.");
    return;
  }

  await undo(admin, link, data.id);
}

/* ------------------------------ plano ------------------------------ */

/** Aviso de que o WhatsApp é do Forge Pro: no máximo uma vez por dia (cada mensagem custa). */
async function paywall(admin: Admin, link: Link) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("whatsapp_paywall_notices")
    .select("last_sent_at")
    .eq("user_id", link.user_id)
    .gt("last_sent_at", since)
    .maybeSingle();

  if (recent) return;

  await admin
    .from("whatsapp_paywall_notices")
    .upsert({ user_id: link.user_id, last_sent_at: new Date().toISOString() }, { onConflict: "user_id" });

  await out.text(
    link.phone,
    `O registro pelo WhatsApp é do *Forge Pro* 💜\n\nCom ele você lança gastos por texto ou áudio, consulta saldo e cria metas sem abrir o app.\n\nAssine aqui: ${appUrl()}/planos\n\nVocê continua usando o app normalmente no plano gratuito.`
  );
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
    await out.text(link.phone, "Não há nada aguardando confirmação.");
    return;
  }

  await decide(admin, link, action, data.id);
}

/** Converte pendências do formato antigo em ações do agente. */
function toActions(payload: unknown): PreparedAction[] {
  const data = payload as { version?: number; actions?: PreparedAction[]; items?: LegacyItem[] };

  if (data.version === 2) return data.actions ?? [];

  return (data.items ?? []).map((item) => ({
    tool: "registrar_lancamento",
    scope: parseScope(item.scope),
    summary: `${item.type === "expense" ? "🔴" : "🟢"} ${item.description} — ${formatBRL(item.amount)}\n${SCOPE_EMOJI[parseScope(item.scope)]} ${SCOPE_LABEL[parseScope(item.scope)]} • ${item.category_name} • ${item.account_name} • ${formatDayMonth(item.date)}`,
    payload: {
      account_id: item.account_id,
      category_id: item.category_id,
      type: item.type,
      description: item.description,
      amount: item.amount,
      date: item.date,
    },
  }));
}

async function decide(admin: Admin, link: Link, action: "confirm" | "cancel", pendingId: string) {
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
    await out.text(link.phone, "Esse pedido já foi tratado ou expirou.");
    return;
  }

  if (action === "cancel") {
    await remember(admin, link.user_id, link.phone, "assistant", "Usuário cancelou. Nada foi feito.");
    await out.text(link.phone, "Cancelado. Nada foi feito. 👍");
    return;
  }

  const reply = await executePending(admin, link, toActions(pending.payload));

  await remember(admin, link.user_id, link.phone, "assistant", reply);
  await out.text(link.phone, reply);
}

/* ------------------------------ conta padrão ------------------------------ */

async function setDefaultAccount(admin: Admin, link: Link, wantedRaw: string) {
  const { data } = await admin
    .from("accounts")
    .select("id, name, scope")
    .eq("user_id", link.user_id);

  const accounts = data ?? [];
  const wanted = normalize(wantedRaw);
  const account = accounts.find((a) => {
    const name = normalize(a.name);
    return name === wanted || name.includes(wanted) || wanted.includes(name);
  });

  if (!account) {
    await out.text(
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

  const scope = parseScope(account.scope);
  const scopeNote = accounts.some((a) => a.scope === "business")
    ? ` (${SCOPE_EMOJI[scope]} ${SCOPE_LABEL[scope]})`
    : "";

  await out.text(link.phone, `Conta padrão: *${account.name}*${scopeNote} ✅`);
}
