/** Ferramentas do bot que só existem no modo Empresa (plano Forge MEI). */
const BUSINESS_ONLY_TOOLS = new Set([
  "criar_cliente",
  "editar_cliente",
  "arquivar_cliente",
  "excluir_cliente",
  "configurar_mei",
  "gerar_das",
  "pagar_das",
  "resumo_mei",
  "gerar_link_cobranca",
]);

export const BUSINESS_PLAN_MESSAGE =
  "O modo Empresa é do plano Forge MEI. Diga ao usuário que ele pode mudar de plano no app, em Planos.";

/**
 * Pedido do bot para quem não tem o modo Empresa: devolve os argumentos presos
 * ao escopo Pessoal, ou null quando a ferramenta é só da Empresa.
 */
export function personalPlanInput(tool: string, input: Record<string, unknown>): Record<string, unknown> | null {
  if (BUSINESS_ONLY_TOOLS.has(tool) || input.escopo === "empresa") return null;
  return { ...input, escopo: "pessoal" };
}
