/**
 * Telefone brasileiro guardado só com dígitos: DDD + número (10 ou 11 dígitos).
 * Aceita "+55 (11) 91234-5678", "11912345678" etc. Retorna null se inválido.
 */
export function normalizeBrPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) return null;
  if (digits.startsWith("0")) return null;

  return digits;
}

export function formatBrPhone(digits: string | null | undefined): string {
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const split = rest.length === 9 ? 5 : 4;

  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Link wa.me com DDI 55 e mensagem pronta. */
export function whatsappLink(digits: string, message: string): string {
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}
