/** Acesso liberado pelo admin vale até a data definida (sem data = sem prazo). */
export function isManualAccessValid(periodEnd: string | null | undefined, now = new Date()): boolean {
  if (!periodEnd) return true;
  return new Date(periodEnd).getTime() > now.getTime();
}

/** Teste grátis ativo (30 dias a partir do cadastro), com tudo liberado. */
export function isTrialActive(trialEndsAt: string | null | undefined, now = new Date()): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > now.getTime();
}

/** Dias que faltam no teste (arredonda para cima; 0 se acabou). */
export function trialDaysLeft(trialEndsAt: string | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86_400_000));
}

export type AccessRow = {
  plan_id: string;
  status: string;
  access_source: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
};

function isCurrent(row: AccessRow): boolean {
  return row.status === "active" || row.status === "past_due";
}

/** WhatsApp: Forge Pessoal, Forge MEI, acesso liberado pelo admin e teste grátis. */
export function grantsWhatsApp(row: AccessRow, now = new Date()): boolean {
  if (row.access_source === "admin") return isManualAccessValid(row.current_period_end, now);
  if (isTrialActive(row.trial_ends_at, now)) return true;
  return (row.plan_id === "pessoal" || row.plan_id === "pro") && isCurrent(row);
}

/** Modo Empresa: só o Forge MEI (id "pro"), acesso liberado pelo admin e teste grátis. */
export function grantsBusiness(row: AccessRow, now = new Date()): boolean {
  if (row.access_source === "admin") return isManualAccessValid(row.current_period_end, now);
  if (isTrialActive(row.trial_ends_at, now)) return true;
  return row.plan_id === "pro" && isCurrent(row);
}
