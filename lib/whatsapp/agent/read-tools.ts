/** Ferramentas de CONSULTA: executam na hora e não alteram nada. */
import { todayInBrazil } from "@/lib/dates";
import { calcLimit, competenceLabel, type MeiSettings } from "@/lib/mei-shared";
import { whatsappLink } from "@/lib/phone";
import { firstRelation } from "@/lib/relations";
import type { Scope } from "@/lib/scope";
import type { Db } from "@/lib/services/context";
import { ServiceError } from "@/lib/services/context";
import { formatBRL } from "@/lib/whatsapp/text";

import type { UserContext } from "./context";
import { brDate, num, obj, optionalRef, ref, s, scopeArg, scopeTag, str, type Args } from "./helpers";

export type ReadTool = {
  name: string;
  description: string;
  input_schema: object;
  run: (args: Args, ctx: UserContext, db: Db) => Promise<string>;
};

function scopes(args: Args): Scope[] {
  const scope = scopeArg(args);
  return scope ? [scope] : ["personal", "business"];
}

function monthStart(today: string) {
  return `${today.slice(0, 7)}-01`;
}

export const READ_TOOLS: ReadTool[] = [
  {
    name: "consultar_saldos",
    description: "Saldo de cada conta bancária e total por escopo, mais o total investido.",
    input_schema: obj({ escopo: s.scope() }),
    async run(args, ctx) {
      const lines: string[] = [];

      for (const scope of scopes(args)) {
        const accounts = ctx.byKind("A").filter((a) => a.scope === scope);
        const investments = ctx.byKind("I").filter((i) => i.scope === scope);
        if (!accounts.length && !investments.length) continue;

        const total = accounts.reduce((sum, a) => sum + Number(a.data.balance), 0);
        const invested = investments.reduce((sum, i) => sum + Number(i.data.current), 0);

        lines.push(`${scopeTag(scope)}: contas ${formatBRL(total)}, investimentos ${formatBRL(invested)}`);
        accounts.forEach((a) => lines.push(`  ${a.ref} ${a.name}: ${formatBRL(Number(a.data.balance))}`));
      }

      return lines.join("\n") || "Nenhuma conta cadastrada.";
    },
  },
  {
    name: "buscar_transacoes",
    description:
      "Busca transações (extrato). Use para responder perguntas e ANTES de excluir uma transação, para obter a referência X.",
    input_schema: obj({
      escopo: s.scope(),
      de: s.date("Data inicial"),
      ate: s.date("Data final"),
      tipo: s.enum(["receita", "despesa"], "Filtrar por tipo"),
      texto: s.str("Trecho da descrição"),
      categoria: s.str("Referência K da categoria"),
      conta: s.str("Referência A da conta"),
      limite: s.num("Quantidade máxima (padrão 10, máximo 30)"),
    }),
    async run(args, ctx, db) {
      let query = db
        .from("transactions")
        .select("id, type, title, description, amount, transaction_date, scope, accounts(name), categories(name)")
        .eq("user_id", ctx.userId)
        .in("scope", scopes(args));

      const from = str(args, "de");
      const to = str(args, "ate");
      const type = str(args, "tipo");
      const text = str(args, "texto");
      const category = optionalRef(ctx, args.categoria, "K");
      const account = optionalRef(ctx, args.conta, "A");

      if (from) query = query.gte("transaction_date", from);
      if (to) query = query.lte("transaction_date", to);
      if (type) query = query.eq("type", type === "receita" ? "income" : "expense");
      if (text) query = query.ilike("description", `%${text.replace(/[%_,()]/g, " ")}%`);
      if (category) query = query.eq("category_id", category.id);
      if (account) query = query.eq("account_id", account.id);

      const limit = Math.min(Math.max(num(args, "limite") ?? 10, 1), 30);
      const { data, error } = await query
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new ServiceError("Não consegui buscar as transações.");
      if (!data?.length) return "Nenhuma transação encontrada.";

      const found = ctx.register(
        "X",
        data.map((t) => ({
          id: t.id,
          name: t.description || t.title || "Sem descrição",
          scope: t.scope as Scope,
          data: {
            type: t.type,
            amount: Number(t.amount),
            date: t.transaction_date,
            account: firstRelation(t.accounts as unknown as { name: string } | null)?.name ?? null,
            category: firstRelation(t.categories as unknown as { name: string } | null)?.name ?? null,
          },
        }))
      );

      return found
        .map(
          (t) =>
            `${t.ref} ${brDate(String(t.data.date))} ${t.data.type === "income" ? "+" : "-"}${formatBRL(Number(t.data.amount))} ${t.name} (${t.data.category ?? "sem categoria"}, ${t.data.account ?? "sem conta"}) ${scopeTag(t.scope)}`
        )
        .join("\n");
    },
  },
  {
    name: "resumo_periodo",
    description:
      "Receitas, despesas, saldo do período e gastos por categoria. Sem datas, usa o mês atual.",
    input_schema: obj({ escopo: s.scope(), de: s.date("Data inicial"), ate: s.date("Data final") }),
    async run(args, ctx, db) {
      const from = str(args, "de") ?? monthStart(ctx.today);
      const to = str(args, "ate") ?? ctx.today;

      const { data, error } = await db
        .from("transactions")
        .select("type, amount, scope, categories(name)")
        .eq("user_id", ctx.userId)
        .in("scope", scopes(args))
        .gte("transaction_date", from)
        .lte("transaction_date", to);

      if (error) throw new ServiceError("Não consegui calcular o resumo.");

      const lines = [`Período ${brDate(from)} a ${brDate(to)}:`];

      for (const scope of scopes(args)) {
        const rows = (data ?? []).filter((t) => t.scope === scope);
        if (!rows.length) continue;

        let income = 0;
        let expense = 0;
        const byCategory = new Map<string, number>();

        for (const t of rows) {
          const value = Number(t.amount);
          if (t.type === "income") income += value;
          else {
            expense += value;
            const name = firstRelation(t.categories as unknown as { name: string } | null)?.name ?? "Sem categoria";
            byCategory.set(name, (byCategory.get(name) ?? 0) + value);
          }
        }

        lines.push(
          `${scopeTag(scope)}: receitas ${formatBRL(income)}, despesas ${formatBRL(expense)}, resultado ${formatBRL(income - expense)}`
        );
        [...byCategory.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .forEach(([name, value]) => lines.push(`  ${name}: ${formatBRL(value)}`));
      }

      return lines.length > 1 ? lines.join("\n") : "Nenhuma movimentação no período.";
    },
  },
  {
    name: "listar_contas_pagar_receber",
    description:
      "Lista contas a pagar e a receber (vencimentos, atrasadas, quem deve, pagas). As pendentes já estão no contexto; use para filtrar ou ver pagas.",
    input_schema: obj({
      escopo: s.scope(),
      tipo: s.enum(["pagar", "receber"], "A pagar ou a receber"),
      status: s.enum(["pendentes", "atrasadas", "pagas", "todas"], "Padrão: pendentes"),
      cliente: s.str("Referência C do cliente"),
      ate: s.date("Vencimento até"),
    }),
    async run(args, ctx, db) {
      let query = db
        .from("payables")
        .select("id, kind, description, amount, due_date, status, paid_at, scope, recurrence, customers(name)")
        .eq("user_id", ctx.userId)
        .in("scope", scopes(args));

      const type = str(args, "tipo");
      const status = str(args, "status") ?? "pendentes";
      const customer = optionalRef(ctx, args.cliente, "C");
      const to = str(args, "ate");

      if (type) query = query.eq("kind", type === "receber" ? "receivable" : "payable");
      if (status === "pendentes") query = query.eq("status", "pending");
      if (status === "atrasadas") query = query.eq("status", "pending").lt("due_date", ctx.today);
      if (status === "pagas") query = query.eq("status", "paid");
      if (customer) query = query.eq("customer_id", customer.id);
      if (to) query = query.lte("due_date", to);

      const { data, error } = await query.order("due_date").limit(40);
      if (error) throw new ServiceError("Não consegui listar as contas.");
      if (!data?.length) return "Nenhuma conta encontrada.";

      const found = ctx.register(
        "P",
        data.map((p) => ({
          id: p.id,
          name: p.description,
          scope: p.scope as Scope,
          data: {
            kind: p.kind,
            amount: Number(p.amount),
            due_date: p.due_date,
            status: p.status,
            paid_at: p.paid_at,
            recurrence: p.recurrence,
            customer: firstRelation(p.customers as unknown as { name: string } | null)?.name ?? null,
          },
        }))
      );

      const total = found.reduce((sum, p) => sum + Number(p.data.amount), 0);

      return [
        ...found.map((p) => {
          const late = p.data.status === "pending" && String(p.data.due_date) < ctx.today;
          return `${p.ref} ${p.data.kind === "receivable" ? "A receber" : "A pagar"} ${p.name} ${formatBRL(Number(p.data.amount))} vence ${brDate(String(p.data.due_date))}${late ? " ATRASADA" : ""}${p.data.status === "paid" ? ` paga em ${brDate(String(p.data.paid_at))}` : ""}${p.data.customer ? ` (${p.data.customer})` : ""} ${scopeTag(p.scope)}`;
        }),
        `Total: ${formatBRL(total)}`,
      ].join("\n");
    },
  },
  {
    name: "resumo_mei",
    description: "Faturamento do ano x limite do MEI, DAS do ano e prazo da declaração anual.",
    input_schema: obj({}),
    async run(_args, ctx, db) {
      const year = Number(ctx.today.slice(0, 4));

      const [{ data: settings }, { data: revenue }, { data: das }] = await Promise.all([
        db
          .from("mei_settings")
          .select("activity, das_due_day, annual_limit, das_amount, opening_date, dasn_due_date")
          .eq("user_id", ctx.userId)
          .maybeSingle(),
        db
          .from("transactions")
          .select("amount")
          .eq("user_id", ctx.userId)
          .eq("scope", "business")
          .eq("type", "income")
          .gte("transaction_date", `${year}-01-01`)
          .lte("transaction_date", `${year}-12-31`),
        db
          .from("mei_das_payments")
          .select("competence, amount, due_date, status, paid_at")
          .eq("user_id", ctx.userId)
          .gte("competence", `${year}-01-01`)
          .order("competence"),
      ]);

      const total = (revenue ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
      const meiSettings = settings
        ? ({
            ...settings,
            das_due_day: Number(settings.das_due_day),
            annual_limit: settings.annual_limit === null ? null : Number(settings.annual_limit),
            das_amount: settings.das_amount === null ? null : Number(settings.das_amount),
          } as MeiSettings)
        : null;
      const calc = calcLimit(meiSettings, total, todayInBrazil());

      const lines = [
        `Faturamento ${year}: ${formatBRL(total)}`,
        calc.limit === null
          ? "Limite anual: não informado (o usuário precisa preencher, conferindo no Portal do Empreendedor)."
          : `Limite: ${formatBRL(calc.limit)}${calc.proportional ? " (proporcional)" : ""}, usado ${calc.percent?.toFixed(1)}%, falta ${formatBRL(calc.remaining ?? 0)}, projeção ${formatBRL(calc.projection)}`,
        `Valor do DAS configurado: ${meiSettings?.das_amount ? formatBRL(meiSettings.das_amount) : "não informado"}; vence todo dia ${meiSettings?.das_due_day ?? 20} do mês seguinte.`,
        `Prazo da DASN-SIMEI: ${meiSettings?.dasn_due_date ? brDate(meiSettings.dasn_due_date) : "não informado"}.`,
        "DAS do ano:",
        ...((das ?? []).length
          ? (das ?? []).map(
              (d) =>
                `  ${competenceLabel(d.competence)} ${formatBRL(Number(d.amount))} ${d.status === "paid" ? `pago em ${brDate(d.paid_at)}` : `pendente, vence ${brDate(d.due_date)}`}`
            )
          : ["  nenhuma guia gerada"]),
      ];

      return lines.join("\n");
    },
  },
  {
    name: "gerar_link_cobranca",
    description:
      "Gera o link do WhatsApp (wa.me) com mensagem de cobrança para uma conta a receber de cliente com telefone. O link vai para o usuário enviar do próprio WhatsApp; nada é enviado ao cliente pelo bot.",
    input_schema: obj({ conta: s.str("Referência P da conta a receber") }, ["conta"]),
    async run(args, ctx) {
      const payable = ref(ctx, args.conta, "P");
      if (payable.data.kind !== "receivable") throw new ServiceError("Essa conta não é a receber.");

      const customer = ctx.byKind("C").find((c) => c.name === payable.data.customer);
      const phone = customer?.data.phone ? String(customer.data.phone) : null;
      if (!phone) throw new ServiceError("O cliente dessa conta não tem telefone cadastrado.");

      const due = String(payable.data.due_date);
      const when =
        due < ctx.today ? `que venceu em ${brDate(due)}` : due === ctx.today ? "que vence hoje" : `com vencimento em ${brDate(due)}`;
      const message = `Olá, ${customer!.name.split(" ")[0]}! Tudo bem? Passando para lembrar do pagamento de *${payable.name}*, no valor de *${formatBRL(Number(payable.data.amount))}*, ${when}. Se já fez o pagamento, por favor desconsidere. Obrigado!`;

      return `Link para o usuário tocar e enviar do próprio WhatsApp (inclua o link exatamente assim na resposta):\n${whatsappLink(phone, message)}`;
    },
  },
];
