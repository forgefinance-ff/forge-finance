/** Contatos de suporte (mude pelas variáveis na Vercel, sem mexer no código). */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "thiagopaes957@gmail.com";

/** WhatsApp de suporte, só dígitos com DDI (ex.: 5521999999999). Vazio = sem botão. */
export const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "") || null;
