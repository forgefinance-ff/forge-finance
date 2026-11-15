/** Acesso liberado pelo admin vale até a data definida (sem data = sem prazo). */
export function isManualAccessValid(periodEnd: string | null | undefined, now = new Date()): boolean {
  if (!periodEnd) return true;
  return new Date(periodEnd).getTime() > now.getTime();
}
