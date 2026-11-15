import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplate, sendText } from "@/lib/whatsapp/meta";

import { adminEmails } from "./emails";
import { oneLine, parsePhones, supportNotifyText } from "./notify-text";

/**
 * Para quem vai o aviso: ADMIN_WHATSAPP (se definido) ou, senão, o WhatsApp
 * que cada e-mail de ADMIN_EMAILS conectou no app.
 */
async function adminPhones(): Promise<string[]> {
  const fixed = parsePhones(process.env.ADMIN_WHATSAPP);
  if (fixed.length) return fixed;

  const emails = adminEmails();
  if (!emails.length) return [];
  const { data, error } = await createAdminClient().rpc("ff_admin_whatsapp_phones", { p_emails: emails });
  if (error) {
    console.error("support notify: phones", error.code);
    return [];
  }
  return parsePhones(((data ?? []) as { phone: string }[]).map((r) => r.phone).join(","));
}

/**
 * Avisa a equipe no WhatsApp que chegou mensagem de suporte.
 * Com WHATSAPP_SUPPORT_TEMPLATE usa o modelo aprovado na Meta (chega sempre).
 * Sem ele manda texto, que a Meta só entrega se o admin falou com o bot nas
 * últimas 24 h.
 */
export async function notifyAdminsOfSupport(opts: { who: string; body: string }): Promise<void> {
  try {
    const phones = await adminPhones();
    if (!phones.length) return;

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const url = `${base}/admin/suporte`;
    const template = process.env.WHATSAPP_SUPPORT_TEMPLATE;
    const language = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG || "pt_BR";

    await Promise.all(
      phones.map(async (phone) => {
        const ok = template
          ? await sendTemplate(phone, template, [oneLine(opts.who, 80), oneLine(opts.body, 200)], language)
          : await sendText(phone, supportNotifyText({ ...opts, url }));
        if (!ok) console.error("support notify: falhou para um admin", template ? "template" : "texto");
      })
    );
  } catch (error) {
    // O aviso nunca pode atrapalhar o envio da mensagem do usuário.
    console.error("support notify", error instanceof Error ? error.message : error);
  }
}
