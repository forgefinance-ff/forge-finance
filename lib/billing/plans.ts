export type PlanId = "free" | "plus" | "business";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  monthlyPriceCents: number;
  monthlyAiLimit: number;
  availableNow: boolean;
  features: string[];
  plannedFeatures: string[];
};

// Catálogo de apresentação; autorizações efetivas vêm do banco/RPC, nunca deste arquivo sozinho.
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "free",
    name: "Forge Free",
    description: "O essencial para organizar suas finanças durante o beta.",
    monthlyPriceCents: 0,
    monthlyAiLimit: 10,
    availableNow: true,
    features: ["Dashboard e patrimônio", "Contas e transações", "Cartões e categorias", "Investimentos e metas", "Relatórios básicos", "Até 10 consultas de IA por mês, se a IA estiver configurada"],
    plannedFeatures: [],
  },
  {
    id: "plus",
    name: "Forge Plus",
    description: "Inteligência financeira ampliada. Plano futuro, sem cobrança no beta.",
    monthlyPriceCents: 1990,
    monthlyAiLimit: 100,
    availableNow: false,
    features: [],
    plannedFeatures: ["Cota ampliada de IA", "Análises avançadas", "Projeções financeiras"],
  },
  {
    id: "business",
    name: "Forge Business",
    description: "Uma futura experiência financeira para pequenos negócios.",
    monthlyPriceCents: 7990,
    monthlyAiLimit: 250,
    availableNow: false,
    features: [],
    plannedFeatures: ["Espaços financeiros empresariais", "Organizações e membros", "Centro de custos", "Relatórios operacionais"],
  },
];

export function formatMonthlyPrice(cents: number): string {
  if (cents === 0) return "Gratuito";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/mês";
}
