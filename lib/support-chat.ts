/** Tipos do chat com a equipe (compartilhados entre o balão e o servidor). */
export type SupportChatMessage = {
  id: number;
  sender: "user" | "admin";
  body: string;
  created_at: string;
};

export type SupportChatThread = {
  status: "open" | "closed";
  messages: SupportChatMessage[];
};

export const SUPPORT_MAX_LENGTH = 2000;
