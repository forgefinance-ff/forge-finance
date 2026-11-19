/**
 * Planos à venda: Free, Forge Pessoal e Forge MEI.
 * O id "pro" é o Forge MEI: quem já tinha o antigo Forge Pro continua com tudo.
 */
export type PlanId = "free" | "pessoal" | "pro";
export type PaidPlanId = Exclude<PlanId, "free">;
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
 * Preços mostrados no app. Precisam ser IGUAIS aos preços cadastrados no Stripe
 * (STRIPE_PRICE_PESSOAL_MONTHLY/YEARLY e STRIPE_PRICE_MEI_MONTHLY/YEARLY).
 * O anual tem desconto de 2 meses grátis.
 */
export const PLAN_PRICING: Record<PaidPlanId, Record<BillingInterval, { cents: number }>> = {
  pessoal: { month: { cents: 1990 }, year: { cents: 19900 } },
  pro: { month: { cents: 2990 }, year: { cents: 29900 } },
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
    missing: ["Registro pelo WhatsApp", "Modo Empresa (MEI)"],
  },
  {
    id: "pessoal",
    name: "Forge Pessoal",
    description: "Suas finanças pessoais organizadas por mensagem ou áudio.",
    monthlyPriceCents: PLAN_PRICING.pessoal.month.cents,
    monthlyAiLimit: 100,
    features: [
      "Tudo do Forge Free",
      "Registro de gastos pelo WhatsApp, por texto ou áudio",
      "Consultas e cadastros direto no WhatsApp",
      "Assistente de IA: 100 consultas por mês",
    ],
    missing: ["Modo Empresa (MEI)"],
  },
  {
    id: "pro",
    name: "Forge MEI",
    description: "Pessoal e Empresa no mesmo lugar, sem misturar as contas.",
    monthlyPriceCents: PLAN_PRICING.pro.month.cents,
    monthlyAiLimit: 100,
    features: [
      "Tudo do Forge Pessoal",
      "Modo Empresa: clientes, contas a pagar e a receber",
      "Controle do DAS e do limite do MEI",
      "WhatsApp para o pessoal e para a empresa",
    ],
    missing: [],
  },
];

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === "pessoal" || value === "pro";
}

/** Valor usado na URL (?tipo=pessoal ou ?tipo=mei). Sem valor válido, vale o MEI. */
export function parsePaidPlan(value: unknown): PaidPlanId {
  return value === "pessoal" ? "pessoal" : "pro";
}

export function planSlug(plan: PaidPlanId): "pessoal" | "mei" {
  return plan === "pessoal" ? "pessoal" : "mei";
}

export function planName(plan: PlanId): string {
  return PLAN_CATALOG.find((item) => item.id === plan)?.name ?? "Forge Free";
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatMonthlyPrice(cents: number): string {
  if (cents === 0) return "Gratuito";
  return `${formatBRL(cents)}/mês`;
}

/** Quanto o anual sai por mês e quanto economiza em relação ao mensal. */
export function yearlyComparison(plan: PaidPlanId) {
  const { month, year } = PLAN_PRICING[plan];
  const perMonth = Math.round(year.cents / 12);
  const savings = month.cents * 12 - year.cents;
  return { perMonth, savings };
}
