/** Partes puras do aviso de suporte (sem servidor, para dar para testar). */

/** "5521999999999, +55 (11) 98888-7777" -> ["5521999999999", "5511988887777"] */
export function parsePhones(raw: string | null | undefined): string[] {
  return [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((p) => p.replace(/\D/g, ""))
        .filter((p) => p.length >= 10)
    ),
  ];
}

/** Uma linha, sem quebras (templates da Meta não aceitam quebra de linha). */
export function oneLine(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function supportNotifyText(opts: { who: string; body: string; url: string }): string {
  return [
    "📩 *Nova mensagem no suporte do Forge*",
    `De: ${oneLine(opts.who, 80)}`,
    `"${oneLine(opts.body, 300)}"`,
    "",
    `Responder: ${opts.url}`,
  ].join("\n");
}
