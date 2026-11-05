/**
 * Ferramentas de AÇÃO. A IA só PREPARA a ação (validada e resumida); nada é
 * gravado até o usuário confirmar. Na confirmação, `executeAction` chama os
 * mesmos serviços do app (lib/services).
 */
import { suggestedDasDueDate } from "@/lib/mei-shared";
import { normalizeBrPhone } from "@/lib/phone";
import type { Scope } from "@/lib/scope";
import * as business from "@/lib/services/business";
import { parseInput, ServiceError, type ServiceCtx } from "@/lib/services/context";
import * as registry from "@/lib/services/registry";
import * as transactions from "@/lib/services/transactions";
import { formatBRL } from "@/lib/whatsapp/text";
import type { Db } from "@/lib/services/context";

import type { UserContext } from "./context";
import {
  bool,
  brDate,
  defaultScope,
  num,
  obj,
  optionalRef,
  pickAccount,
  pickCategory,
  ref,
  s,
  scopeArg,
  scopeTag,
  str,
  type Args,
} from "./helpers";

export type PreparedAction = {
  tool: string;
  scope: Scope;
  summary: string;
  payload: Record<string, unknown>;
};

export type WriteTool = {
  name: string;
  description: string;
  input_schema: object;
  prepare: (args: Args, ctx: UserContext, db: Db) => Promise<Omit<PreparedAction, "tool">>;
};

const scopeOr = (args: Args, ctx: UserContext) => scopeArg(args) ?? defaultScope(ctx);
const typeLabel = (t: unknown) => (t === "income" ? "receita" : "despesa");

export const WRITE_TOOLS: WriteTool[] = [
  /* ---------------- lançamentos ---------------- */
  {
    name: "registrar_lancamento",
    description:
      "Registra uma receita ou despesa que JÁ aconteceu (gastei, paguei, recebi). Compra no crédito/cartão de crédito: informe `cartao` (vai para a fatura e não mexe no saldo da conta) e, se parcelada, `parcelas`. Para valores futuros use criar_conta_pagar_receber. Uma chamada por lançamento.",
    input_schema: obj(
      {
        tipo: s.enum(["despesa", "receita"], "Despesa ou receita"),
        valor: s.num("Valor em reais, positivo"),
        descricao: s.str("Descrição curta, ex.: Mercado"),
        categoria: s.str("Referência K de uma categoria do mesmo tipo e escopo da conta"),
        conta: s.str("Referência A da conta, só se o usuário citou uma"),
        cartao: s.str(
          "Referência T do cartão de crédito, quando a compra foi no crédito (\"no crédito\", \"no cartão\", \"parcelei\"). Com um só cartão, use ele."
        ),
        parcelas: s.num("Número de parcelas da compra no cartão (1 = à vista)"),
        data: s.date("Data do lançamento; sem data, hoje"),
      },
      ["tipo", "valor", "descricao"]
    ),
    async prepare(args, ctx) {
      const type = str(args, "tipo") === "receita" ? "income" : "expense";

      // Compra no cartão de crédito: vai para a fatura.
      const card = optionalRef(ctx, args.cartao, "T");
      if (card) {
        const category = pickCategory(ctx, args.categoria, type, card.scope);
        const installments = Math.max(1, Math.min(48, Math.round(num(args, "parcelas") ?? 1)));
        const input = {
          card_id: card.id,
          category_id: category?.id ?? null,
          type,
          description: str(args, "descricao") ?? "",
          amount: num(args, "valor") ?? NaN,
          date: str(args, "data") ?? ctx.today,
          installments: type === "income" ? 1 : installments,
        } as const;
        const parsed = parseInput(transactions.cardPurchaseInput, input);
        const parts =
          parsed.installments > 1
            ? ` em ${parsed.installments}x de ${formatBRL(parsed.amount / parsed.installments)}`
            : "";

        return {
          scope: card.scope,
          summary: `💳 ${type === "income" ? "Estorno" : "Compra no crédito"}: ${parsed.description || "Lançamento"} — ${formatBRL(parsed.amount)}${parts}\n${scopeTag(card.scope)} • ${category?.name ?? "Sem categoria"} • cartão ${card.name} • ${brDate(parsed.date)}\nVai para a fatura; o saldo da conta só muda quando você pagar a fatura.`,
          payload: { ...input, via: "card" },
        };
      }

      const account = pickAccount(ctx, args.conta, null);
      const category = pickCategory(ctx, args.categoria, type, account.scope);
      const input = {
        account_id: account.id,
        category_id: category?.id ?? null,
        type,
        description: str(args, "descricao") ?? "",
        amount: num(args, "valor") ?? NaN,
        date: str(args, "data") ?? ctx.today,
      } as const;
      const parsed = parseInput(transactions.transactionInput, input);

      return {
        scope: account.scope,
        summary: `${type === "expense" ? "🔴" : "🟢"} ${parsed.description || "Lançamento"} — ${formatBRL(parsed.amount)}\n${scopeTag(account.scope)} • ${category?.name ?? "Sem categoria"} • ${account.name} • ${brDate(parsed.date)}`,
        payload: input,
      };
    },
  },
  {
    name: "excluir_transacao",
    description:
      "Exclui uma transação e estorna o saldo. Antes, use buscar_transacoes para obter a referência X.",
    input_schema: obj({ transacao: s.str("Referência X da transação") }, ["transacao"]),
    async prepare(args, ctx) {
      const t = ref(ctx, args.transacao, "X");
      return {
        scope: t.scope,
        summary: `🗑️ Excluir a ${typeLabel(t.data.type)} ${t.name} — ${formatBRL(Number(t.data.amount))} de ${brDate(String(t.data.date))} (${t.data.account ?? "sem conta"}) • ${scopeTag(t.scope)}`,
        payload: { id: t.id },
      };
    },
  },

  /* ---------------- contas bancárias ---------------- */
  {
    name: "criar_conta_bancaria",
    description: "Cria uma conta bancária ou carteira.",
    input_schema: obj(
      {
        nome: s.str("Nome da conta"),
        tipo: s.enum(["Conta Corrente", "Poupança", "Carteira", "Investimento"], "Tipo"),
        saldo_inicial: s.num("Saldo inicial (padrão 0)"),
        escopo: s.scope(),
      },
      ["nome"]
    ),
    async prepare(args, ctx) {
      const scope = scopeOr(args, ctx);
      const input = {
        name: str(args, "nome") ?? "",
        type: str(args, "tipo") ?? "Conta Corrente",
        initial_balance: num(args, "saldo_inicial") ?? 0,
      };
      parseInput(registry.accountInput, input);
      return {
        scope,
        summary: `🏦 Criar a conta ${input.name} (${input.type}) com saldo inicial de ${formatBRL(input.initial_balance)} • ${scopeTag(scope)}`,
        payload: input,
      };
    },
  },
  {
    name: "excluir_conta_bancaria",
    description: "Exclui uma conta bancária. As transações dela ficam sem conta.",
    input_schema: obj({ conta: s.str("Referência A") }, ["conta"]),
    async prepare(args, ctx) {
      const a = ref(ctx, args.conta, "A");
      return {
        scope: a.scope,
        summary: `🗑️ Excluir a conta ${a.name} (saldo ${formatBRL(Number(a.data.balance))}) • ${scopeTag(a.scope)}`,
        payload: { id: a.id },
      };
    },
  },

  /* ---------------- categorias ---------------- */
  {
    name: "criar_categoria",
    description: "Cria uma categoria de receita ou despesa.",
    input_schema: obj(
      {
        nome: s.str("Nome"),
        tipo: s.enum(["despesa", "receita"], "Tipo"),
        icone: s.str("Um emoji opcional"),
        escopo: s.scope(),
      },
      ["nome", "tipo"]
    ),
    async prepare(args, ctx) {
      const scope = scopeOr(args, ctx);
      const input = {
        name: str(args, "nome") ?? "",
        type: (str(args, "tipo") === "receita" ? "income" : "expense") as "income" | "expense",
        icon: str(args, "icone") ?? "📁",
      };
      parseInput(registry.categoryInput, input);
      return {
        scope,
        summary: `🏷️ Criar a categoria de ${typeLabel(input.type)} ${input.icon} ${input.name} • ${scopeTag(scope)}`,
        payload: input,
      };
    },
  },
  {
    name: "excluir_categoria",
    description: "Exclui uma categoria. As transações dela ficam sem categoria.",
    input_schema: obj({ categoria: s.str("Referência K") }, ["categoria"]),
    async prepare(args, ctx) {
      const k = ref(ctx, args.categoria, "K");
      return {
        scope: k.scope,
        summary: `🗑️ Excluir a categoria de ${typeLabel(k.data.type)} ${k.name} • ${scopeTag(k.scope)}`,
        payload: { id: k.id },
      };
    },
  },

  /* ---------------- cartões ---------------- */
  {
    name: "criar_cartao",
    description: "Cadastra um cartão de crédito.",
    input_schema: obj(
      {
        nome: s.str("Nome do cartão"),
        limite: s.num("Limite em reais"),
        dia_fechamento: s.num("Dia de fechamento (1 a 31)"),
        dia_vencimento: s.num("Dia de vencimento (1 a 31)"),
        escopo: s.scope(),
      },
      ["nome"]
    ),
    async prepare(args, ctx) {
      const scope = scopeOr(args, ctx);
      const input = {
        name: str(args, "nome") ?? "",
        limit_amount: num(args, "limite"),
        closing_day: num(args, "dia_fechamento"),
        due_day: num(args, "dia_vencimento"),
      };
      parseInput(registry.cardInput, input);
      return {
        scope,
        summary: `💳 Criar o cartão ${input.name}${input.limit_amount ? ` com limite ${formatBRL(input.limit_amount)}` : ""}${input.closing_day ? `, fecha dia ${input.closing_day}` : ""}${input.due_day ? `, vence dia ${input.due_day}` : ""} • ${scopeTag(scope)}`,
        payload: input,
      };
    },
  },
  {
    name: "excluir_cartao",
    description: "Exclui um cartão.",
    input_schema: obj({ cartao: s.str("Referência T") }, ["cartao"]),
    async prepare(args, ctx) {
      const t = ref(ctx, args.cartao, "T");
      return { scope: t.scope, summary: `🗑️ Excluir o cartão ${t.name} • ${scopeTag(t.scope)}`, payload: { id: t.id } };
    },
  },

  /* ---------------- metas ---------------- */
  {
    name: "criar_meta",
    description: "Cria uma meta financeira.",
    input_schema: obj(
      {
        titulo: s.str("Nome da meta"),
        valor_alvo: s.num("Valor da meta"),
        valor_atual: s.num("Quanto já tem guardado (padrão 0)"),
        prazo: s.date("Data limite opcional"),
        escopo: s.scope(),
      },
      ["titulo", "valor_alvo"]
    ),
    async prepare(args, ctx) {
      const scope = scopeOr(args, ctx);
      const input = {
        title: str(args, "titulo") ?? "",
        target_amount: num(args, "valor_alvo") ?? NaN,
        current_amount: num(args, "valor_atual") ?? 0,
        deadline: str(args, "prazo"),
      };
      parseInput(registry.goalInput, input);
      return {
        scope,
        summary: `🎯 Criar a meta ${input.title}: ${formatBRL(input.target_amount)}${input.current_amount ? ` (já tem ${formatBRL(input.current_amount)})` : ""}${input.deadline ? ` até ${brDate(input.deadline)}` : ""} • ${scopeTag(scope)}`,
        payload: input,
      };
    },
  },
  {
    name: "editar_meta",
    description: "Altera nome, valor da meta, valor atual ou prazo. Campos omitidos ficam como estão.",
    input_schema: obj(
      {
        meta: s.str("Referência M"),
        titulo: s.str("Novo nome"),
        valor_alvo: s.num("Novo valor da meta"),
        valor_atual: s.num("Novo valor guardado"),
        prazo: s.date("Nova data limite"),
      },
      ["meta"]
    ),
    async prepare(args, ctx) {
      const m = ref(ctx, args.meta, "M");
      const input = {
        title: str(args, "titulo") ?? m.name,
        target_amount: num(args, "valor_alvo") ?? Number(m.data.target),
        current_amount: num(args, "valor_atual") ?? Number(m.data.current),
        deadline: str(args, "prazo") ?? (m.data.deadline as string | null),
      };
      parseInput(registry.goalInput, input);
      return {
        scope: m.scope,
        summary: `✏️ Atualizar a meta ${m.name}: ${input.title}, ${formatBRL(input.current_amount)} de ${formatBRL(input.target_amount)}${input.deadline ? ` até ${brDate(input.deadline)}` : ""}`,
        payload: { id: m.id, input },
      };
    },
  },
  {
    name: "guardar_na_meta",
    description: "Soma um valor ao que já está guardado na meta (valor negativo retira).",
    input_schema: obj({ meta: s.str("Referência M"), valor: s.num("Valor (negativo para retirar)") }, ["meta", "valor"]),
    async prepare(args, ctx) {
      const m = ref(ctx, args.meta, "M");
      const amount = num(args, "valor");
      if (!amount) throw new ServiceError("Informe o valor a guardar na meta.");
      const next = Number(m.data.current) + amount;
      if (next < 0) throw new ServiceError("A meta não tem esse valor guardado para retirar.");
      return {
        scope: m.scope,
        summary: `🎯 ${amount > 0 ? "Guardar" : "Retirar"} ${formatBRL(Math.abs(amount))} na meta ${m.name} (fica ${formatBRL(next)} de ${formatBRL(Number(m.data.target))})`,
        payload: { id: m.id, amount },
      };
    },
  },
  {
    name: "excluir_meta",
    description: "Exclui uma meta.",
    input_schema: obj({ meta: s.str("Referência M") }, ["meta"]),
    async prepare(args, ctx) {
      const m = ref(ctx, args.meta, "M");
      return { scope: m.scope, summary: `🗑️ Excluir a meta ${m.name} • ${scopeTag(m.scope)}`, payload: { id: m.id } };
    },
  },

  /* ---------------- investimentos ---------------- */
  {
    name: "criar_investimento",
    description: "Cadastra um investimento (não movimenta conta bancária).",
    input_schema: obj(
      {
        nome: s.str("Nome"),
        tipo: s.str("Tipo, ex.: CDB, Tesouro, Ações"),
        valor_investido: s.num("Valor aplicado"),
        valor_atual: s.num("Valor atual (padrão: o aplicado)"),
        instituicao: s.str("Banco/corretora"),
        escopo: s.scope(),
      },
      ["nome", "valor_investido"]
    ),
    async prepare(args, ctx) {
      const scope = scopeOr(args, ctx);
      const input = {
        name: str(args, "nome") ?? "",
        type: str(args, "tipo"),
        invested_amount: num(args, "valor_investido") ?? NaN,
        current_value: num(args, "valor_atual"),
        institution: str(args, "instituicao"),
      };
      parseInput(registry.investmentInput, input);
      return {
        scope,
        summary: `📈 Cadastrar o investimento ${input.name}${input.type ? ` (${input.type})` : ""}: ${formatBRL(input.invested_amount)}${input.institution ? ` em ${input.institution}` : ""} • ${scopeTag(scope)}`,
        payload: input,
      };
    },
  },
  {
    name: "excluir_investimento",
    description: "Exclui um investimento.",
    input_schema: obj({ investimento: s.str("Referência I") }, ["investimento"]),
    async prepare(args, ctx) {
      const i = ref(ctx, args.investimento, "I");
      return { scope: i.scope, summary: `🗑️ Excluir o investimento ${i.name} • ${scopeTag(i.scope)}`, payload: { id: i.id } };
    },
  },

  /* ---------------- clientes ---------------- */
  {
    name: "criar_cliente",
    description: "Cadastra um cliente da empresa.",
    input_schema: obj(
      {
        nome: s.str("Nome"),
        telefone: s.str("Telefone com DDD"),
        email: s.str("E-mail"),
        observacoes: s.str("Observações"),
      },
      ["nome"]
    ),
    async prepare(args) {
      const input = {
        name: str(args, "nome") ?? "",
        phone: str(args, "telefone"),
        email: str(args, "email"),
        notes: str(args, "observacoes"),
      };
      parseInput(business.customerInput, input);
      return {
        scope: "business",
        summary: `👥 Cadastrar o cliente ${input.name}${input.phone ? ` • ${normalizeBrPhone(input.phone)}` : ""}${input.email ? ` • ${input.email}` : ""} • ${scopeTag("business")}`,
        payload: input,
      };
    },
  },
  {
    name: "editar_cliente",
    description: "Altera dados de um cliente. Campos omitidos ficam como estão.",
    input_schema: obj(
      {
        cliente: s.str("Referência C"),
        nome: s.str("Novo nome"),
        telefone: s.str("Novo telefone"),
        email: s.str("Novo e-mail"),
        observacoes: s.str("Novas observações"),
      },
      ["cliente"]
    ),
    async prepare(args, ctx, db) {
      const c = ref(ctx, args.cliente, "C");
      const { data: current } = await db
        .from("customers")
        .select("name, phone, email, notes")
        .eq("id", c.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      if (!current) throw new ServiceError("Cliente não encontrado.");

      const input = {
        name: str(args, "nome") ?? current.name,
        phone: str(args, "telefone") ?? current.phone,
        email: str(args, "email") ?? current.email,
        notes: str(args, "observacoes") ?? current.notes,
      };
      parseInput(business.customerInput, input);
      return {
        scope: "business",
        summary: `✏️ Atualizar o cliente ${c.name}: ${input.name}${input.phone ? ` • ${input.phone}` : ""}${input.email ? ` • ${input.email}` : ""}`,
        payload: { id: c.id, input },
      };
    },
  },
  {
    name: "arquivar_cliente",
    description: "Arquiva (ou reativa) um cliente.",
    input_schema: obj({ cliente: s.str("Referência C"), arquivar: s.bool("true arquiva, false reativa") }, ["cliente"]),
    async prepare(args, ctx) {
      const c = ref(ctx, args.cliente, "C");
      const archive = bool(args, "arquivar") ?? true;
      return {
        scope: "business",
        summary: `${archive ? "📦 Arquivar" : "♻️ Reativar"} o cliente ${c.name}`,
        payload: { id: c.id, archive },
      };
    },
  },
  {
    name: "excluir_cliente",
    description: "Exclui um cliente sem cobranças (com cobranças, só arquivar).",
    input_schema: obj({ cliente: s.str("Referência C") }, ["cliente"]),
    async prepare(args, ctx) {
      const c = ref(ctx, args.cliente, "C");
      return { scope: "business", summary: `🗑️ Excluir o cliente ${c.name}`, payload: { id: c.id } };
    },
  },

  /* ---------------- contas a pagar e a receber ---------------- */
  {
    name: "criar_conta_pagar_receber",
    description:
      "Cria uma conta A PAGAR (boleto, aluguel, fornecedor) ou A RECEBER (cliente vai pagar) com vencimento. Não movimenta saldo até ser baixada.",
    input_schema: obj(
      {
        tipo: s.enum(["pagar", "receber"], "A pagar ou a receber"),
        descricao: s.str("Descrição"),
        valor: s.num("Valor"),
        vencimento: s.date("Data de vencimento"),
        cliente: s.str("Referência C (só contas a receber da empresa)"),
        categoria: s.str("Referência K (despesa para pagar, receita para receber)"),
        conta: s.str("Referência A da conta prevista"),
        mensal: s.bool("true se repete todo mês"),
        observacoes: s.str("Observações"),
        escopo: s.scope(),
      },
      ["tipo", "descricao", "valor", "vencimento"]
    ),
    async prepare(args, ctx) {
      const customer = optionalRef(ctx, args.cliente, "C");
      const account = optionalRef(ctx, args.conta, "A");
      const scope: Scope = customer ? "business" : account?.scope ?? scopeOr(args, ctx);
      const kind = str(args, "tipo") === "receber" ? "receivable" : "payable";
      const category = optionalRef(ctx, args.categoria, "K");

      if (category && category.scope !== scope) {
        throw new ServiceError(`A categoria ${category.name} é de outro escopo.`);
      }

      const input = {
        kind,
        description: str(args, "descricao") ?? "",
        amount: num(args, "valor") ?? NaN,
        due_date: str(args, "vencimento") ?? "",
        customer_id: customer?.id ?? null,
        category_id: category?.id ?? null,
        account_id: account?.id ?? null,
        recurrence: bool(args, "mensal") ? "monthly" : "none",
        notes: str(args, "observacoes"),
      } as const;
      parseInput(business.payableInput, input);

      return {
        scope,
        summary: `${kind === "receivable" ? "📥 A receber" : "📤 A pagar"}: ${input.description} — ${formatBRL(input.amount)}, vence ${brDate(input.due_date)}${customer ? ` • ${customer.name}` : ""}${category ? ` • ${category.name}` : ""}${input.recurrence === "monthly" ? " • todo mês" : ""} • ${scopeTag(scope)}`,
        payload: input,
      };
    },
  },
  {
    name: "editar_conta_pagar_receber",
    description: "Altera uma conta a pagar/receber pendente. Campos omitidos ficam como estão.",
    input_schema: obj(
      {
        conta_pr: s.str("Referência P"),
        descricao: s.str("Nova descrição"),
        valor: s.num("Novo valor"),
        vencimento: s.date("Novo vencimento"),
        mensal: s.bool("Repetir todo mês"),
      },
      ["conta_pr"]
    ),
    async prepare(args, ctx, db) {
      const p = ref(ctx, args.conta_pr, "P");
      const { data: current } = await db
        .from("payables")
        .select("kind, description, amount, due_date, account_id, category_id, customer_id, recurrence, notes")
        .eq("id", p.id)
        .eq("user_id", ctx.userId)
        .eq("status", "pending")
        .maybeSingle();
      if (!current) throw new ServiceError("Só é possível editar contas pendentes.");

      const recurrence = bool(args, "mensal");
      const input = {
        ...current,
        description: str(args, "descricao") ?? current.description,
        amount: num(args, "valor") ?? Number(current.amount),
        due_date: str(args, "vencimento") ?? current.due_date,
        recurrence: recurrence === null ? current.recurrence : recurrence ? "monthly" : "none",
      };
      parseInput(business.payableInput, input);

      return {
        scope: p.scope,
        summary: `✏️ Atualizar ${p.name}: ${input.description} — ${formatBRL(input.amount)}, vence ${brDate(input.due_date)}${input.recurrence === "monthly" ? " • todo mês" : ""}`,
        payload: { id: p.id, input },
      };
    },
  },
  {
    name: "baixar_conta_pagar_receber",
    description:
      "Marca uma conta a pagar como paga ou a receber como recebida: cria a transação, ajusta o saldo e, se mensal, gera a próxima.",
    input_schema: obj(
      {
        conta_pr: s.str("Referência P"),
        conta: s.str("Referência A da conta usada (padrão: a prevista ou a padrão)"),
        data: s.date("Data do pagamento; sem data, hoje"),
      },
      ["conta_pr"]
    ),
    async prepare(args, ctx) {
      const p = ref(ctx, args.conta_pr, "P");
      if (p.data.status && p.data.status !== "pending") {
        throw new ServiceError("Essa conta já foi paga ou cancelada.");
      }
      const account = pickAccount(ctx, args.conta, p.scope);
      if (account.scope !== p.scope) {
        throw new ServiceError(`A conta ${account.name} é de outro escopo. Diga uma conta do mesmo escopo.`);
      }
      const date = str(args, "data") ?? ctx.today;
      const received = p.data.kind === "receivable";
      return {
        scope: p.scope,
        summary: `✅ Marcar como ${received ? "recebida" : "paga"}: ${p.name} — ${formatBRL(Number(p.data.amount))} em ${brDate(date)} na conta ${account.name}${p.data.recurrence === "monthly" ? " (gera a do próximo mês)" : ""} • ${scopeTag(p.scope)}`,
        payload: { id: p.id, account_id: account.id, date },
      };
    },
  },
  {
    name: "cancelar_conta_pagar_receber",
    description: "Cancela uma conta pendente (fica no histórico, sem transação).",
    input_schema: obj({ conta_pr: s.str("Referência P") }, ["conta_pr"]),
    async prepare(args, ctx) {
      const p = ref(ctx, args.conta_pr, "P");
      return { scope: p.scope, summary: `🚫 Cancelar ${p.name} — ${formatBRL(Number(p.data.amount))}`, payload: { id: p.id } };
    },
  },
  {
    name: "excluir_conta_pagar_receber",
    description: "Exclui uma conta a pagar/receber que não foi paga.",
    input_schema: obj({ conta_pr: s.str("Referência P") }, ["conta_pr"]),
    async prepare(args, ctx) {
      const p = ref(ctx, args.conta_pr, "P");
      return {
        scope: p.scope,
        summary: `🗑️ Excluir ${p.data.kind === "receivable" ? "a conta a receber" : "a conta a pagar"} ${p.name} — ${formatBRL(Number(p.data.amount))}, vence ${brDate(String(p.data.due_date))}`,
        payload: { id: p.id },
      };
    },
  },

  /* ---------------- MEI ---------------- */
  {
    name: "configurar_mei",
    description:
      "Salva configurações do MEI. Só preencha valores que o USUÁRIO informou; nunca invente limite ou valor do DAS.",
    input_schema: obj({
      atividade: s.enum(["servicos", "comercio", "ambos"], "Atividade"),
      dia_vencimento_das: s.num("Dia de vencimento do DAS"),
      limite_anual: s.num("Limite anual de faturamento"),
      valor_das: s.num("Valor mensal do DAS"),
      data_abertura: s.date("Data de abertura do MEI"),
      prazo_dasn: s.date("Prazo da declaração anual"),
    }),
    async prepare(args, ctx, db) {
      const { data: current } = await db
        .from("mei_settings")
        .select("activity, das_due_day, annual_limit, das_amount, opening_date, dasn_due_date")
        .eq("user_id", ctx.userId)
        .maybeSingle();

      const input = {
        activity: (str(args, "atividade") ?? current?.activity ?? "servicos") as "servicos",
        das_due_day: num(args, "dia_vencimento_das") ?? current?.das_due_day ?? 20,
        annual_limit: num(args, "limite_anual") ?? current?.annual_limit ?? null,
        das_amount: num(args, "valor_das") ?? current?.das_amount ?? null,
        opening_date: str(args, "data_abertura") ?? current?.opening_date ?? null,
        dasn_due_date: str(args, "prazo_dasn") ?? current?.dasn_due_date ?? null,
      };
      parseInput(business.meiSettingsInput, input);

      const changes = [
        str(args, "atividade") && `atividade ${input.activity}`,
        num(args, "dia_vencimento_das") && `DAS vence dia ${input.das_due_day}`,
        num(args, "limite_anual") && `limite anual ${formatBRL(Number(input.annual_limit))}`,
        num(args, "valor_das") && `DAS ${formatBRL(Number(input.das_amount))}`,
        str(args, "data_abertura") && `abertura ${brDate(input.opening_date)}`,
        str(args, "prazo_dasn") && `prazo da DASN ${brDate(input.dasn_due_date)}`,
      ].filter(Boolean);
      if (!changes.length) throw new ServiceError("Diga qual configuração do MEI você quer mudar.");

      return {
        scope: "business",
        summary: `⚙️ Configurações do MEI: ${changes.join(", ")}`,
        payload: input,
      };
    },
  },
  {
    name: "gerar_das",
    description: "Registra a guia do DAS de uma competência (mês). Valor e vencimento padrão vêm das configurações.",
    input_schema: obj(
      {
        competencia: s.str("Mês de competência no formato YYYY-MM"),
        valor: s.num("Valor (padrão: o configurado)"),
        vencimento: s.date("Vencimento (padrão: dia configurado do mês seguinte)"),
      },
      ["competencia"]
    ),
    async prepare(args, ctx, db) {
      const month = str(args, "competencia") ?? "";
      if (!/^\d{4}-\d{2}$/.test(month)) throw new ServiceError("Informe o mês da competência, ex.: 2026-10.");
      const competence = `${month}-01`;

      const { data: settings } = await db
        .from("mei_settings")
        .select("das_due_day, das_amount")
        .eq("user_id", ctx.userId)
        .maybeSingle();

      const amount = num(args, "valor") ?? (settings?.das_amount ? Number(settings.das_amount) : null);
      if (!amount) {
        throw new ServiceError(
          "Qual o valor do DAS? Informe o valor (confira no Portal do Empreendedor) ou salve o valor nas configurações do MEI."
        );
      }
      const input = {
        competence,
        amount,
        due_date: str(args, "vencimento") ?? suggestedDasDueDate(competence, Number(settings?.das_due_day ?? 20)),
      };
      parseInput(business.dasInput, input);

      return {
        scope: "business",
        summary: `🧾 Gerar o DAS de ${month.slice(5)}/${month.slice(0, 4)} — ${formatBRL(amount)}, vence ${brDate(input.due_date)}`,
        payload: input,
      };
    },
  },
  {
    name: "pagar_das",
    description: "Marca a guia do DAS como paga: cria a despesa em Impostos na conta da empresa e ajusta o saldo.",
    input_schema: obj(
      {
        das: s.str("Referência D da guia"),
        conta: s.str("Referência A de uma conta da empresa"),
        data: s.date("Data do pagamento; sem data, hoje"),
      },
      ["das"]
    ),
    async prepare(args, ctx) {
      const d = ref(ctx, args.das, "D");
      const account = pickAccount(ctx, args.conta, "business");
      if (account.scope !== "business") throw new ServiceError("O DAS precisa ser pago com uma conta da empresa.");
      const date = str(args, "data") ?? ctx.today;
      return {
        scope: "business",
        summary: `🧾 Pagar o ${d.name} — ${formatBRL(Number(d.data.amount))} em ${brDate(date)} com ${account.name} (despesa em Impostos)`,
        payload: { id: d.id, account_id: account.id, date },
      };
    },
  },

  /* ---------------- WhatsApp ---------------- */
  {
    name: "definir_conta_padrao",
    description: "Define a conta usada quando o usuário não citar nenhuma.",
    input_schema: obj({ conta: s.str("Referência A") }, ["conta"]),
    async prepare(args, ctx) {
      const a = ref(ctx, args.conta, "A");
      return { scope: a.scope, summary: `⭐ Conta padrão do WhatsApp: ${a.name} • ${scopeTag(a.scope)}`, payload: { id: a.id } };
    },
  },
];

/* ---------------- execução (após confirmação) ---------------- */

type P = Record<string, never> & Record<string, unknown>;

/** Executa a ação confirmada com os serviços do app. Retorna um texto curto. */
export async function executeAction(action: PreparedAction, ctx: ServiceCtx): Promise<string | null> {
  const p = action.payload as P;
  const id = String(p.id ?? "");

  switch (action.tool) {
    case "registrar_lancamento":
      if (p.via === "card") {
        await transactions.createCardPurchase(ctx, p as never);
      } else {
        await transactions.createTransaction(ctx, p as never);
      }
      return null;
    case "excluir_transacao":
      await transactions.deleteTransaction(ctx, id);
      return null;
    case "criar_conta_bancaria":
      await registry.createAccount(ctx, p as never);
      return null;
    case "excluir_conta_bancaria":
      await registry.deleteAccount(ctx, id);
      return null;
    case "criar_categoria":
      await registry.createCategory(ctx, p as never);
      return null;
    case "excluir_categoria":
      await registry.deleteCategory(ctx, id);
      return null;
    case "criar_cartao":
      await registry.createCard(ctx, p as never);
      return null;
    case "excluir_cartao":
      await registry.deleteCard(ctx, id);
      return null;
    case "criar_meta":
      await registry.createGoal(ctx, p as never);
      return null;
    case "editar_meta":
      await registry.updateGoal(ctx, id, p.input as never);
      return null;
    case "guardar_na_meta": {
      const total = await registry.contributeToGoal(ctx, id, Number(p.amount));
      return `Meta agora com ${formatBRL(total)}.`;
    }
    case "excluir_meta":
      await registry.deleteGoal(ctx, id);
      return null;
    case "criar_investimento":
      await registry.createInvestment(ctx, p as never);
      return null;
    case "excluir_investimento":
      await registry.deleteInvestment(ctx, id);
      return null;
    case "criar_cliente":
      await business.createCustomer(ctx, p as never);
      return null;
    case "editar_cliente":
      await business.updateCustomer(ctx, id, p.input as never);
      return null;
    case "arquivar_cliente":
      await business.setCustomerArchived(ctx, id, Boolean(p.archive));
      return null;
    case "excluir_cliente":
      await business.deleteCustomer(ctx, id);
      return null;
    case "criar_conta_pagar_receber":
      await business.createPayable(ctx, p as never);
      return null;
    case "editar_conta_pagar_receber":
      await business.updatePayable(ctx, id, p.input as never);
      return null;
    case "baixar_conta_pagar_receber":
      await business.settlePayable(ctx, id, String(p.account_id), String(p.date));
      return null;
    case "cancelar_conta_pagar_receber":
      await business.cancelPayable(ctx, id);
      return null;
    case "excluir_conta_pagar_receber":
      await business.deletePayable(ctx, id);
      return null;
    case "configurar_mei":
      await business.saveMeiSettings(ctx, p as never);
      return null;
    case "gerar_das":
      await business.generateDas(ctx, p as never);
      return null;
    case "pagar_das":
      await business.payDas(ctx, id, String(p.account_id), String(p.date));
      return null;
    case "definir_conta_padrao": {
      const { error } = await ctx.db
        .from("whatsapp_links")
        .update({ default_account_id: id })
        .eq("user_id", ctx.userId);
      if (error) throw new ServiceError("Não foi possível definir a conta padrão.");
      return null;
    }
    default:
      throw new ServiceError("Ação desconhecida.");
  }
}
