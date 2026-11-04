import crypto from "node:crypto";

const GRAPH = `https://graph.facebook.com/${
  process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0"
}`;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Confere a assinatura X-Hub-Signature-256 enviada pela Meta. */
export function verifySignature(rawBody: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;

  if (!secret || !header?.startsWith("sha256=")) return false;

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  );
  const received = Buffer.from(header.slice("sha256=".length));

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

async function sendMessage(to: string, message: Record<string, unknown>): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    console.error("WhatsApp: WHATSAPP_PHONE_NUMBER_ID/ACCESS_TOKEN ausentes.");
    return false;
  }

  const response = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...message }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    console.error("WhatsApp send error", response.status, await response.text());
    return false;
  }
  return true;
}

export async function sendText(to: string, body: string) {
  return sendMessage(to, {
    type: "text",
    text: { body: body.slice(0, 4000), preview_url: false },
  });
}

/**
 * Mensagem de modelo (template) aprovado na Meta. É o único jeito de o bot
 * puxar conversa fora da janela de 24 h desde a última mensagem do usuário.
 * Parâmetros não podem ter quebra de linha.
 */
export async function sendTemplate(
  to: string,
  name: string,
  params: string[],
  language = "pt_BR"
) {
  return sendMessage(to, {
    type: "template",
    template: {
      name,
      language: { code: language },
      components: params.length
        ? [
            {
              type: "body",
              parameters: params.map((text) => ({
                type: "text",
                text: text.replace(/\s+/g, " ").trim().slice(0, 1000),
              })),
            },
          ]
        : [],
    },
  });
}

export async function sendConfirmButtons(
  to: string,
  body: string,
  pendingId: string
) {
  await sendMessage(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1000) },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: `confirm:${pendingId}`, title: "✅ Confirmar" },
          },
          {
            type: "reply",
            reply: { id: `cancel:${pendingId}`, title: "❌ Cancelar" },
          },
        ],
      },
    },
  });
}

/** Baixa um áudio recebido (2 passos: descobre a URL, depois baixa). */
export async function downloadMedia(mediaId: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN ausente.");

  const metaResponse = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!metaResponse.ok) throw new Error(`media meta ${metaResponse.status}`);

  const meta = (await metaResponse.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
  };

  if (!meta.url) throw new Error("media sem url");
  if (meta.file_size && meta.file_size > MAX_AUDIO_BYTES) {
    throw new Error("AUDIO_TOO_LARGE");
  }

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!fileResponse.ok) throw new Error(`media file ${fileResponse.status}`);

  const buffer = await fileResponse.arrayBuffer();

  if (buffer.byteLength > MAX_AUDIO_BYTES) throw new Error("AUDIO_TOO_LARGE");

  return { buffer, mimeType: meta.mime_type ?? "audio/ogg" };
}
