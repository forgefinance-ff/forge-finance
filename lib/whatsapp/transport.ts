import { sendConfirmButtons, sendText, sendUndoButton } from "./meta";

/**
 * Para onde vão as respostas do bot. Em produção é a API da Meta; no
 * simulador de desenvolvimento, uma lista em memória.
 */
export type Transport = {
  text: (to: string, body: string) => Promise<void>;
  buttons: (to: string, body: string, pendingId: string) => Promise<void>;
  undo: (to: string, body: string, undoId: string) => Promise<void>;
};

export const metaTransport: Transport = {
  text: async (to, body) => {
    await sendText(to, body);
  },
  buttons: sendConfirmButtons,
  undo: sendUndoButton,
};

export type SimulatedMessage =
  | { kind: "text"; body: string }
  | { kind: "buttons"; body: string; pendingId: string }
  | { kind: "undo"; body: string; undoId: string };

export function memoryTransport(sink: SimulatedMessage[]): Transport {
  return {
    text: async (_to, body) => {
      sink.push({ kind: "text", body: body.slice(0, 4000) });
    },
    buttons: async (_to, body, pendingId) => {
      sink.push({ kind: "buttons", body: body.slice(0, 1000), pendingId });
    },
    undo: async (_to, body, undoId) => {
      sink.push({ kind: "undo", body: body.slice(0, 1000), undoId });
    },
  };
}
