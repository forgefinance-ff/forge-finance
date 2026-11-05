// Natureza de uma categoria/transação.
// "regular" é receita ou despesa de verdade; as outras mexem no saldo das
// contas, mas não entram no resultado (receitas x despesas) nem no
// faturamento do MEI.

export const MOVEMENT_KINDS = ["regular", "contribution", "loan", "refund"] as const;

export type MovementKind = (typeof MOVEMENT_KINDS)[number];
export type MovementType = "income" | "expense";

export const KIND_LABEL: Record<MovementKind, string> = {
  regular: "Receita/Despesa",
  contribution: "Aporte",
  loan: "Empréstimo",
  refund: "Reembolso",
};

/** Rótulo curto da categoria conforme natureza + entrada/saída. */
export function kindTypeLabel(kind: MovementKind | null | undefined, type: MovementType) {
  const k = kind ?? "regular";
  if (k === "regular") return type === "income" ? "Receita" : "Despesa";
  return `${KIND_LABEL[k]} · ${type === "income" ? "entrada" : "saída"}`;
}

/** Explicação de cada natureza, para formulários e ajuda. */
export const KIND_HINT: Record<MovementKind, string> = {
  regular: "Entra no resultado do mês (receitas x despesas).",
  contribution:
    "Dinheiro que você ou sócios colocam (entrada) ou retiram (saída). Não é receita nem despesa.",
  loan: "Empréstimo recebido ou concedido (entrada) e parcelas pagas ou valor emprestado (saída). Não é receita nem despesa.",
  refund:
    "Reembolso recebido (entrada) ou devolvido a alguém (saída). Não entra no resultado.",
};

export function isMovementKind(value: unknown): value is MovementKind {
  return typeof value === "string" && (MOVEMENT_KINDS as readonly string[]).includes(value);
}

/** Só transações "regular" contam como receita/despesa nos relatórios. */
export function countsAsResult(kind: string | null | undefined) {
  return !kind || kind === "regular";
}

/**
 * Natureza só de transação: pagamento da fatura do cartão. Tira o dinheiro da
 * conta, mas não é despesa (as compras já contaram na data em que foram feitas).
 */
export const CARD_PAYMENT_KIND = "card_payment";

/** Rótulo de qualquer natureza de transação (inclui o pagamento de fatura). */
export function transactionKindLabel(kind: string | null | undefined) {
  if (!kind || kind === "regular") return null;
  if (kind === CARD_PAYMENT_KIND) return "Pagamento de fatura";
  return isMovementKind(kind) ? KIND_LABEL[kind] : null;
}
