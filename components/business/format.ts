export const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (value: number | null, digits = 1) =>
  value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;

export function variation(current: number, base: number) {
  if (!base) return null;
  return ((current - base) / Math.abs(base)) * 100;
}

export function dateBR(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
