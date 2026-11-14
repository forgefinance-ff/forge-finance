/** Traduz as mensagens mais comuns do Supabase Auth para português. */
export function authErrorMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("user already registered")) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Sem conexão com o servidor. Verifique sua internet.";
  return message;
}
