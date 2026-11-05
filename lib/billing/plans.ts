export type PlanId = "free" | "pro";
export type BillingInterval = "month" | "year";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceCents: number;
  monthlyAiLimit: number;
  features: string[];
  missing: string[];
};

/**
 * Preços do Forge Pro mostrados no app. Precisam ser IGUAIS aos preços
 * cadastrados no Stripe (STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_PRO_YEARLY).
 */
export const PRO_PRICING: Record<BillingInterval, { cents: number }> = {
  month: { cents: 1990 },
  year: { cents: 19900 },
};

// Catálogo de apresentação; o acesso efetivo vem do banco, nunca deste arquivo sozinho.
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "free",
    name: "Forge Free",
    description: "O essencial para organizar suas finanças pelo app.",
    monthlyPriceCents: 0,
    monthlyAiLimit: 10,
    features: [
      "Dashboard, contas e transações",
      "Cartões, categorias e metas",
      "Orçamento e relatórios",
      "Assistente de IA: 10 consultas por mês",
    ],
    missing: ["Registro pelo WhatsApp"],
  },
  {
    id: "pro",
    name: "Forge Pro",
    description: "Seu dinheiro organizado por mensagem ou áudio, sem abrir o app.",
    monthlyPriceCents: PRO_PRICING.month.cents,
    monthlyAiLimit: 100,
    features: [
      "Tudo do Forge Free",
      "Registro de gastos pelo WhatsApp, por texto ou áudio",
      "Consultas e cadastros direto no WhatsApp",
      "Pessoal + Empresa (MEI) no mesmo lugar",
      "Assistente de IA: 100 consultas por mês",
    ],
    missing: [],
  },
];

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatMonthlyPrice(cents: number): string {
  if (cents === 0) return "Gratuito";
  return `${formatBRL(cents)}/mês`;
}

/** Quanto o anual sai por mês e quanto economiza em relação ao mensal. */
export function yearlyComparison() {
  const perMonth = Math.round(PRO_PRICING.year.cents / 12);
  const savings = PRO_PRICING.month.cents * 12 - PRO_PRICING.year.cents;
  return { perMonth, savings };
}
