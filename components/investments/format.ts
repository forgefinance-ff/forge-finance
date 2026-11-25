export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const money = (v: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: v !== 0 && Math.abs(v) < 1 ? 6 : 2,
  }).format(v);

export const signedPct = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v)
    ? "—"
    : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export const signedBrl = (v: number) => `${v > 0 ? "+" : ""}${brl(v)}`;

export const qty = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: v % 1 === 0 ? 0 : 8 });

export const toneClass = (v: number | null | undefined) =>
  v == null || v === 0 ? "text-muted-foreground" : v > 0 ? "text-success" : "text-danger";

export function timeAgo(ms: number | null, now: number): string {
  if (!ms) return "—";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return "agora";
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
