import { AsyncLocalStorage } from "node:async_hooks";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { parseScope, SCOPE_EMOJI, SCOPE_LABEL } from "@/lib/scope";
import { hasWhatsAppAccess } from "@/lib/billing/access";
import { executeAuto, executePending, remember, runAgent, undoTransactions } from "./agent/agent";
import { budgetAlertFor } from "./budget-alert";
import { canAutoExecute, type PreparedAction } from "./agent/write-tools";
import { downloadMedia } from "./meta";
import { transcribeAudio } from "./transcribe";
import { appUrl, connectUrl, getOrCreateOnboardingToken } from "./onboarding";
import { formatBRL, formatDayMonth, normalize } from "./text";
import { BUTTON_BODY_MAX, fitButtonBody, isAcknowledgement, isIgnoredNumber, LINK_CODE, linkedDecision, unlinkedDecision } from "./guard";
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
  //    A mensagem fica "processing" até terminar. Se o servidor cair no meio,
  //    depois de 2 minutos um reenvio da Meta pode reprocessar.
  if (!(await claimMessage(admin, message))) return;

  // 2) Números ignorados de vez (ex.: robôs de empresas): nem responde.
  if (isIgnoredNumber(message.from)) {
    await markDone(admin, message.id);
    return;
  }

  // 3) Contagens para a trava anti-loop (incluem a mensagem atual).
  const [lastHour, lastDay] = await Promise.all([
    countSince(admin, message.from, 60 * 60 * 1000),
    countSince(admin, message.from, 24 * 60 * 60 * 1000),
  ]);

  let linked = false;
  try {
    const { data: link } = await admin
      .from("whatsapp_links")
      .select("user_id, phone, default_account_id")
      .eq("phone", message.from)
      .maybeSingle();

    if (!link) {
      // Sem conta: link de cadastro no máximo 1x a cada 24 h; depois, silêncio.
      // É isso que impede um robô de conversar com o bot sem parar.
      const decision = unlinkedDecision({
        isLinkCode: LINK_CODE.test(message.text ?? ""),
        lastHour,
        lastDay,
      });
      if (decision !== "silent") await handleUnlinked(admin, message);
      return;
    }

    linked = true;
    const decision = linkedDecision(lastHour, lastDay);
    if (decision === "warn") {
      await out.text(message.from, "Muitas mensagens em pouco tempo. Vou pausar as respostas por um tempo. 🙏");
      return;
    }
    if (decision === "silent") return;

    await handleLinked(admin, link as Link, message);
  } catch (error) {
    console.error("WhatsApp handler error", error);
    // Só avisa quem tem conta: para números desconhecidos (ou robôs), silêncio.
    if (linked) await out.text(message.from, "Ops, algo deu errado do meu lado. Tente de novo em instantes.");
  } finally {
    await admin
      .from("whatsapp_processed_messages")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("wamid", message.id);
  }
}

async function markDone(admin: Admin, wamid: string) {
  await admin
    .from("whatsapp_processed_messages")
    .update({ status: "done", finished_at: new Date().toISOString() })
    .eq("wamid", wamid);
}

/** Quantas mensagens este número mandou na janela (conta a atual). */
async function countSince(admin: Admin, phone: string, ms: number): Promise<number> {
  const { count } = await admin
    .from("whatsapp_processed_messages")
    .select("wamid", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", new Date(Date.now() - ms).toISOString());
  return count ?? 0;
}

const STALE_MS = 2 * 60 * 1000;

/** true = esta execução é dona da mensagem e deve processá-la. */
async function claimMessage(admin: Admin, message: IncomingMessage): Promise<boolean> {
  const { error } = await admin
    .from("whatsapp_processed_messages")
    .insert({ wamid: message.id, phone: message.from, status: "processing" });

  if (!error) return true;
  if (error.code !== "23505") {
    console.error("WhatsApp dedupe error", error.code);
    return false;
  }

  // Já vimos esta mensagem. Só retoma se ficou presa em "processing".
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await admin
    .from("whatsapp_processed_messages")
    .update({ status: "processing", created_at: new Date().toISOString() })
    .eq("wamid", message.id)
    .eq("status", "processing")
    .lt("created_at", staleBefore)
    .select("wamid");

  return (data ?? []).length > 0;
}

/* ------------------------------ vinculação ------------------------------ */

async function handleUnlinked(admin: Admin, message: IncomingMessage) {
  const match = message.text?.match(LINK_CODE);

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

    // "obrigado", "valeu", "👍"...: não precisa de resposta (e cada resposta é cobrada).
    if (isAcknowledgement(message.text)) return;

    if (["ajuda", "menu", "help", "oi", "ola"].includes(normalized)) {
      await out.text(link.phone, WHATSAPP_HELP);
      return;
    }

    if (["sim", "confirmar", "confirmo", "ok"].includes(normalized)) {
      if (await decideLatest(admin, link, "confirm")) return;
      // Nada pendente: "ok" é só um "entendi"; "sim" pode responder uma pergunta do assistente.
      if (normalized === "ok") return;
      await askAgent(admin, link, message.text, false);
      return;
    }

    if (["nao", "cancelar", "cancela"].includes(normalized)) {
      if (await decideLatest(admin, link, "cancel")) return;
      await askAgent(admin, link, message.text, false);
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

  // Sempre UMA mensagem (cada mensagem enviada é cobrada pela Meta).
  const compact = `${echo}${heading}\n\n${result.actions.map((a) => a.summary.split("\n")[0]).join("\n")}`;
  await out.buttons(link.phone, fitButtonBody(body.length <= BUTTON_BODY_MAX ? body : compact), pending.id);
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

  const alert = await budgetAlertFor(admin, link.user_id, transactionIds);
  const body = `${echo}${text}${alert ? `\n\n${alert}` : ""}`;

  if (error || !undoRow) {
    console.error("WhatsApp undo save error", error?.code);
    await out.text(link.phone, `${body}\n\nSe algo estiver errado, mande "apaga o último lançamento".`);
    return;
  }

  // Sempre UMA mensagem (cada mensagem enviada é cobrada pela Meta).
  await out.undo(link.phone, fitButtonBody(body), undoRow.id);
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

/** true = havia algo pendente e foi decidido. */
async function decideLatest(admin: Admin, link: Link, action: "confirm" | "cancel"): Promise<boolean> {
  const { data } = await admin
    .from("whatsapp_pending")
    .select("id")
    .eq("user_id", link.user_id)
    .eq("phone", link.phone)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;

  await decide(admin, link, action, data.id);
  return true;
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
