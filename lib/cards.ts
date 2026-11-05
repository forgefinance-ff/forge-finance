import { buildInvoices, cardSummary, type CardMovement, type Invoice } from "@/lib/card-invoice";
import { todayInBrazil } from "@/lib/dates";
import { firstRelation } from "@/lib/relations";
import { getActiveScope } from "@/lib/scope-server";
import { createClient } from "@/lib/supabase/server";

export type Card = {
  id: string;
  user_id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at: string;
  updated_at: string;
};

export async function getCards() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Card[];
}

export type CardOverview = {
  card: Card;
  invoices: Invoice[];
  summary: ReturnType<typeof cardSummary>;
};

/** Cartões do escopo ativo com faturas, limite usado e o que há para pagar. */
export async function getCardsOverview(): Promise<CardOverview[]> {
  const cards = await getCards();
  if (cards.length === 0) return [];

  const supabase = await createClient();
  const today = todayInBrazil();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, card_id, account_id, type, amount, transaction_date, description, title, categories(name)")
    .in(
      "card_id",
      cards.map((card) => card.id)
    )
    .order("transaction_date", { ascending: true })
    .limit(5000);

  if (error) throw error;

  return cards.map((card) => {
    const movements: CardMovement[] = (data ?? [])
      .filter((row) => row.card_id === card.id)
      .map((row) => ({
        id: String(row.id),
        date: String(row.transaction_date).slice(0, 10),
        amount: Number(row.amount),
        kind: row.account_id ? "payment" : row.type === "income" ? "refund" : "purchase",
        description: String(row.description || row.title || "Sem descrição"),
        category: (firstRelation(row.categories) as { name: string } | null)?.name ?? null,
      }));

    const ref = {
      id: card.id,
      name: card.name,
      closing_day: Number(card.closing_day),
      due_day: Number(card.due_day),
      limit_amount: Number(card.limit_amount),
    };
    const invoices = buildInvoices(ref, movements, today);
    return { card, invoices, summary: cardSummary(ref, invoices, today) };
  });
}
