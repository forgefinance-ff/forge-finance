/** Acesso liberado pelo admin vale até a data definida (sem data = sem prazo). */
export function isManualAccessValid(periodEnd: string | null | undefined, now = new Date()): boolean {
  if (!periodEnd) return true;
  return new Date(periodEnd).getTime() > now.getTime();
}

/** Teste grátis do Pro ativo (30 dias a partir do cadastro). */
export function isTrialActive(trialEndsAt: string | null | undefined, now = new Date()): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > now.getTime();
}

/** Dias que faltam no teste (arredonda para cima; 0 se acabou). */
export function trialDaysLeft(trialEndsAt: string | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86_400_000));
}
