// Perguntas padrão do assistente (atalhos de um toque).

export const QUICK_QUESTIONS = [
  "Quanto gastei este mês?",
  "Qual categoria mais pesou este mês?",
  "Gastei mais que no mês passado?",
  "Como estão minhas metas?",
];

export type StandardQuestion = { label: string; question: string };

export const STANDARD_QUESTIONS: Record<"personal" | "business", StandardQuestion[]> = {
  personal: [
    {
      label: "Resumo do mês",
      question: "Faça um resumo completo do meu mês: receitas, despesas, resultado e o que mais chamou atenção.",
    },
    {
      label: "Onde cortar gastos",
      question: "Onde estou gastando mais e o que posso cortar sem apertar demais? Mostre valores.",
    },
    {
      label: "Comparar com a média",
      question: "Compare meus gastos deste mês com a média dos últimos 3 meses, por categoria.",
    },
    {
      label: "Quanto consigo guardar",
      question: "Quanto consigo guardar por mês com base no meu histórico? Monte um plano simples.",
    },
    {
      label: "Metas no prazo?",
      question: "Estou no caminho para bater minhas metas no prazo? Quanto preciso guardar por mês em cada uma?",
    },
    {
      label: "Próximos vencimentos",
      question: "O que vence nos próximos 7 dias e tem algo atrasado? Como fica meu saldo depois disso?",
    },
    {
      label: "Tendência de 12 meses",
      question: "Como evoluíram minhas receitas e despesas nos últimos 12 meses? Há alguma tendência preocupante?",
    },
    {
      label: "Aportes e empréstimos",
      question: "Resuma meus aportes, empréstimos e reembolsos e como eles afetaram meu saldo.",
    },
  ],
  business: [
    {
      label: "Saúde do caixa",
      question: "Analise meu caixa dos próximos 90 dias: vou ficar no negativo em algum momento? O que fazer para evitar?",
    },
    {
      label: "Ponto de equilíbrio",
      question: "Explique meu ponto de equilíbrio e quanto preciso vender a mais para ter a margem de lucro da minha meta.",
    },
    {
      label: "Lucro do mês",
      question: "Qual foi o resultado da empresa este mês (entradas menos saídas)? O que mais pesou nas despesas?",
    },
    {
      label: "Limite do MEI",
      question: "Como está meu faturamento em relação ao limite do MEI e qual a projeção para o ano?",
    },
    {
      label: "Contas a receber",
      question: "O que tenho a receber e a pagar nos próximos dias e o que está atrasado?",
    },
    {
      label: "Custos para reduzir",
      question: "Quais custos da empresa cresceram nos últimos meses e onde dá para reduzir?",
    },
    {
      label: "Comparar meses",
      question: "Compare os últimos 3 meses da empresa: faturamento, despesas e resultado.",
    },
    {
      label: "Aportes e empréstimos",
      question: "Resuma os aportes, empréstimos e reembolsos da empresa e o impacto no caixa.",
    },
  ],
};
