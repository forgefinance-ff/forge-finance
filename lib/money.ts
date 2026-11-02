/** Converte o valor digitado em reais: aceita "1.234,56", "1234,56" e "1234.56". */
export function parseAmount(raw: string): number {
  const value = raw.trim();
  if (!value) return Number.NaN;
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  return Number(normalized);
}

/** 1234.5 -> "1234,50" (para preencher campos de valor). */
export function amountToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toFixed(2).replace(".", ",");
}
