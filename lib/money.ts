/**
 * Converte o valor digitado em reais. Aceita "1.234,56", "1234,56",
 * "1234.56", "1.500" (mil e quinhentos), "R$ 50,00" e "-10,00".
 */
export function parseAmount(raw: string): number {
  let value = String(raw ?? "").replace(/R\$|\s|\u00A0/gi, "").trim();
  if (!value) return Number.NaN;
  let negative = false;
  if (/^[-\u2212]/.test(value)) {
    negative = true;
    value = value.slice(1);
  }
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma > lastDot) {
    value = value.replace(/\./g, "").replace(",", "."); // 1.234,56
  } else if (lastComma !== -1) {
    value = value.replace(/,/g, ""); // 1,234.56
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, ""); // 1.500 = mil e quinhentos
  }
  if (!/^\d+(\.\d+)?$/.test(value)) return Number.NaN;
  const n = Number(value);
  return negative ? -n : n;
}

/** 1234.5 -> "1234,50" (para preencher campos de valor). */
export function amountToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toFixed(2).replace(".", ",");
}
