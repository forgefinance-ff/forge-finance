import { NextResponse } from "next/server";

import { verifySignature } from "@/lib/whatsapp/meta";
import { handleIncoming, type IncomingMessage } from "@/lib/whatsapp/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Verificação do webhook (a Meta chama uma vez ao configurar). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

type MetaMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  audio?: { id?: string };
  interactive?: { button_reply?: { id?: string } };
};

type MetaPayload = {
  entry?: { changes?: { value?: { messages?: MetaMessage[] } }[] }[];
};

function toIncoming(message: MetaMessage): IncomingMessage {
  if (message.type === "text") {
    return { id: message.id, from: message.from, type: "text", text: message.text?.body };
  }

  if (message.type === "audio") {
    return { id: message.id, from: message.from, type: "audio", audioId: message.audio?.id };
  }

  if (message.type === "interactive" && message.interactive?.button_reply?.id) {
    return {
      id: message.id,
      from: message.from,
      type: "button",
      buttonId: message.interactive.button_reply.id,
    };
  }

  return { id: message.id, from: message.from, type: "other" };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: MetaPayload;

  try {
    payload = JSON.parse(rawBody) as MetaPayload;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        try {
          await handleIncoming(toIncoming(message));
        } catch (error) {
          console.error("WhatsApp webhook error", error);
        }
      }
    }
  }

  // Sempre 200: a Meta reenvia se receber erro, e a deduplicação já nos protege.
  return NextResponse.json({ ok: true });
}
