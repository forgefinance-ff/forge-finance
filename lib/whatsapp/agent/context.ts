/**
 * Dados do usuário que o agente do WhatsApp enxerga. Cada item recebe uma
 * referência curta (A1, K3, C2…) que a IA usa nas ferramentas; o servidor
 * traduz a referência para o id real. A IA nunca vê ids do banco.
 */
import { todayInBrazil } from "@/lib/dates";
import { formatBRL } from "@/lib/whatsapp/text";
import { parseScope, type Scope } from "@/lib/scope";
import type { Db } from "@/lib/services/context";

export type RefKind = "A" | "K" | "C" | "P" | "M" | "I" | "T" | "D" | "X";

export const REF_LABEL: Record<RefKind, string> = {
  A: "conta bancária",
  K: "categoria",
  C: "cliente",
  P: "conta a pagar/receber",
  M: "meta",
  I: "investimento",
  T: "cartão",
  D: "guia do DAS",
  X: "transação",
};

export type Entity = { ref: string; id: string; name: string; scope: Scope; data: Record<string, unknown> };

export type UserContext = {
  userId: string;
  phone: string;
  today: string;
  defaultAccountId: string | null;
  hasBusiness: boolean;
  entities: Map<string, Entity>;
  byKind: (kind: RefKind) => Entity[];
  /** Adiciona itens descobertos durante a conversa (ex.: transações buscadas). */
  register: (kind: RefKind, items: Omit<Entity, "ref">[]) => Entity[];
};

export async function loadUserContext(
  db: Db,
  userId: string,
  phone: string,
  defaultAccountId: string | null
): Promise<UserContext> {
  const [accounts, categories, customers, payables, goals, investments, cards, das] =
    await Promise.all([
      db.from("accounts").select("id, name, type, scope, current_balance").eq("user_id", userId).order("created_at"),
      db.from("categories").select("id, name, type, scope").eq("user_id", userId).order("name"),
      db.from("customers").select("id, name, phone").eq("user_id", userId).is("archived_at", null).order("name"),
      db
        .from("payables")
        .select("id, kind, description, amount, due_date, scope, recurrence, customers(name)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("due_date")
        .limit(60),
      db.from("goals").select("id, title, target_amount, current_amount, deadline, scope").eq("user_id", userId).order("created_at"),
      db.from("investments").select("id, name, invested_amount, current_value, scope").eq("user_id", userId).order("created_at"),
      db.from("cards").select("id, name, scope").eq("user_id", userId).order("created_at"),
      db
        .from("mei_das_payments")
        .select("id, competence, amount, due_date")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("competence"),
    ]);

  const entities = new Map<string, Entity>();
  const counters: Partial<Record<RefKind, number>> = {};

  function register(kind: RefKind, items: Omit<Entity, "ref">[]) {
    return items.map((item) => {
      const existing = [...entities.values()].find((e) => e.ref[0] === kind && e.id === item.id);
      if (existing) return existing;
      counters[kind] = (counters[kind] ?? 0) + 1;
      const entity = { ...item, ref: `${kind}${counters[kind]}` };
      entities.set(entity.ref, entity);
      return entity;
    });
  }

  register(
    "A",
    (accounts.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      scope: parseScope(a.scope),
      data: { type: a.type, balance: Number(a.current_balance ?? 0) },
    }))
  );
  register(
    "K",
    (categories.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      scope: parseScope(c.scope),
      data: { type: c.type },
    }))
  );
  register(
    "C",
    (customers.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      scope: "business" as Scope,
      data: { phone: c.phone },
    }))
  );
  register(
    "P",
    (payables.data ?? []).map((p) => {
      const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
      return {
        id: p.id,
        name: p.description,
        scope: parseScope(p.scope),
        data: {
          kind: p.kind,
          amount: Number(p.amount),
          due_date: p.due_date,
          recurrence: p.recurrence,
          customer: (customer as { name?: string } | null)?.name ?? null,
        },
      };
    })
  );
  register(
    "M",
    (goals.data ?? []).map((g) => ({
      id: g.id,
      name: g.title,
      scope: parseScope(g.scope),
      data: {
        target: Number(g.target_amount ?? 0),
        current: Number(g.current_amount ?? 0),
        deadline: g.deadline,
      },
    }))
  );
  register(
    "I",
    (investments.data ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      scope: parseScope(i.scope),
      data: { invested: Number(i.invested_amount ?? 0), current: Number(i.current_value ?? 0) },
    }))
  );
  register(
    "T",
    (cards.data ?? []).map((c) => ({ id: c.id, name: c.name, scope: parseScope(c.scope), data: {} }))
  );
  register(
    "D",
    (das.data ?? []).map((d) => ({
      id: d.id,
      name: `DAS ${String(d.competence).slice(5, 7)}/${String(d.competence).slice(0, 4)}`,
      scope: "business" as Scope,
      data: { competence: d.competence, amount: Number(d.amount), due_date: d.due_date },
    }))
  );

  const all = () => [...entities.values()];

  return {
    userId,
    phone,
    today: todayInBrazil(),
    defaultAccountId,
    hasBusiness: all().some((e) => e.ref[0] === "A" && e.scope === "business"),
    entities,
    byKind: (kind) => all().filter((e) => e.ref[0] === kind),
    register,
  };
}

const SCOPE_TAG: Record<Scope, string> = { personal: "pessoal", business: "empresa" };

/** Resumo do contexto para o prompt (só nomes, valores e referências). */
export function describeContext(ctx: UserContext): string {
  const line = (title: string, items: string[]) =>
    `${title}:\n${items.length ? items.map((i) => `- ${i}`).join("\n") : "- (nenhum)"}`;

  const defaultAccount = ctx.byKind("A").find((a) => a.id === ctx.defaultAccountId);

  return [
    `Hoje: ${ctx.today} (fuso de Brasília).`,
    `Conta padrão do WhatsApp: ${defaultAccount ? `${defaultAccount.ref} ${defaultAccount.name}` : "nenhuma"}.`,
    line(
      "Contas bancárias",
      ctx.byKind("A").map((a) => `${a.ref} ${a.name} [${SCOPE_TAG[a.scope]}] saldo ${formatBRL(Number(a.data.balance))}`)
    ),
    line(
      "Categorias",
      ctx.byKind("K").map((k) => `${k.ref} ${k.name} [${SCOPE_TAG[k.scope]}, ${k.data.type === "income" ? "receita" : "despesa"}]`)
    ),
    line("Clientes (empresa)", ctx.byKind("C").map((c) => `${c.ref} ${c.name}${c.data.phone ? "" : " (sem telefone)"}`)),
    line(
      "Contas a pagar/receber pendentes",
      ctx.byKind("P").map(
        (p) =>
          `${p.ref} ${p.data.kind === "receivable" ? "A RECEBER" : "A PAGAR"} ${p.name} ${formatBRL(Number(p.data.amount))} vence ${p.data.due_date} [${SCOPE_TAG[p.scope]}]${p.data.customer ? ` cliente ${p.data.customer}` : ""}${p.data.recurrence === "monthly" ? " mensal" : ""}`
      )
    ),
    line(
      "Metas",
      ctx.byKind("M").map((m) => `${m.ref} ${m.name} [${SCOPE_TAG[m.scope]}] ${formatBRL(Number(m.data.current))} de ${formatBRL(Number(m.data.target))}`)
    ),
    line("Investimentos", ctx.byKind("I").map((i) => `${i.ref} ${i.name} [${SCOPE_TAG[i.scope]}]`)),
    line("Cartões", ctx.byKind("T").map((t) => `${t.ref} ${t.name} [${SCOPE_TAG[t.scope]}]`)),
    line(
      "Guias do DAS pendentes",
      ctx.byKind("D").map((d) => `${d.ref} ${d.name} ${formatBRL(Number(d.data.amount))} vence ${d.data.due_date}`)
    ),
  ].join("\n\n");
}
