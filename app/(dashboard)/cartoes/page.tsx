import { BankCard } from "@/components/cards/bank-card";
import { CardForm } from "@/components/cards/card-form";
import { DeleteCardButton } from "@/components/cards/delete-card-button";
import { PayInvoiceForm } from "@/components/cards/pay-invoice-form";
import { getAccounts } from "@/lib/accounts";
import type { Invoice, InvoiceStatus } from "@/lib/card-invoice";
import { getCardsOverview } from "@/lib/cards";
import { formatDateBR, todayInBrazil } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function invoiceName(inv: Invoice) {
  const [y, m] = inv.key.split("-").map(Number);
  return `Fatura de ${MONTHS[m - 1]}/${String(y).slice(2)}`;
}

const STATUS: Record<InvoiceStatus, { label: string; className: string }> = {
  aberta: { label: "Aberta", className: "border-brand-bright/30 bg-brand/10 text-brand-soft" },
  fechada: { label: "Fechada · a pagar", className: "border-warning/30 bg-warning/10 text-warning" },
  vencida: { label: "Vencida", className: "border-danger/30 bg-danger/10 text-danger" },
  paga: { label: "Paga", className: "border-success/30 bg-success/10 text-success" },
  futura: { label: "Parcelas futuras", className: "border-line bg-tint text-muted-foreground" },
};

export default async function CartoesPage() {
  const [overview, accounts] = await Promise.all([getCardsOverview(), getAccounts()]);
  const today = todayInBrazil();
  const payAccounts = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-8">
      <div className="pt-2 pb-2">

        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">Cartões</h1>

        <p className="mt-2 max-w-2xl text-muted-foreground">
          Compras no crédito contam como despesa na data da compra e vão para a fatura, sem mexer
          no saldo das contas. Quando você paga a fatura, o dinheiro sai da conta, e isso não conta
          de novo como despesa.
        </p>
      </div>

      {overview.map(({ card, invoices, summary }) => {
        const toPayTotal = summary.toPay.reduce((s, inv) => s + inv.pending, 0);
        const ordered = [...invoices].reverse();
        const future = ordered.filter((inv) => inv.status === "futura").reverse();
        const recent = ordered.filter((inv) => inv.status !== "futura").slice(0, 6);
        const futureTotal = future.reduce((s, inv) => s + inv.total, 0);

        return (
          <section key={card.id} className="space-y-5 rounded-[22px] border border-line bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5">
                <BankCard
                  name={card.name}
                  color={card.color}
                  detail={`vence dia ${card.due_day}`}
                  className="w-[220px] sm:w-[240px]"
                />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{card.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Fecha dia {card.closing_day} · vence dia {card.due_day}
                  </p>
                </div>
              </div>

              <DeleteCardButton id={card.id} name={card.name} />
            </div>

            <div>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-text-soft">
                  Limite usado <strong className="text-foreground">{brl(summary.used)}</strong> de{" "}
                  {brl(Number(card.limit_amount))}
                </span>
                <span className="text-muted-foreground">Disponível {brl(summary.available)}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-tint-strong">
                <div
                  className={cn(
                    "h-full rounded-full",
                    summary.usage > 0.9 ? "bg-danger" : summary.usage > 0.7 ? "bg-warning" : "bg-brand"
                  )}
                  style={{ width: `${Math.round(summary.usage * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-tint p-4">
                <p className="text-xs font-semibold text-faint">Fatura atual</p>
                {summary.current ? (
                  <>
                    <p className="mt-1 text-2xl font-bold text-foreground">{brl(summary.current.total)}</p>
                    <p className="text-sm text-muted-foreground">
                      Fecha {formatDateBR(summary.current.closingDate)} · vence{" "}
                      {formatDateBR(summary.current.dueDate)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Nenhuma compra na fatura aberta.</p>
                )}
              </div>

              <div
                className={cn(
                  "rounded-2xl border p-4",
                  summary.overdue.length > 0 ? "border-danger/30 bg-danger/5" : "border-line bg-tint"
                )}
              >
                <p className="text-xs font-semibold text-faint">A pagar</p>
                {summary.toPay.length > 0 ? (
                  <>
                    <p className="mt-1 text-2xl font-bold text-foreground">{brl(toPayTotal)}</p>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {summary.toPay
                        .map((inv) => `${invoiceName(inv)} (vence ${formatDateBR(inv.dueDate)})`)
                        .join(" · ")}
                    </p>
                    <PayInvoiceForm
                      cardId={card.id}
                      accounts={payAccounts}
                      defaultAmount={toPayTotal}
                      today={today}
                      label="Pagar fatura"
                    />
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">Nenhuma fatura fechada em aberto.</p>
                    {summary.current && summary.current.pending > 0 && (
                      <div className="mt-3">
                        <PayInvoiceForm
                          cardId={card.id}
                          accounts={payAccounts}
                          defaultAmount={summary.current.pending}
                          today={today}
                          label="Adiantar pagamento"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Faturas</h3>
              {recent.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma compra no cartão ainda. Em Nova Transação, escolha &quot;Cartão de
                  crédito&quot;.
                </p>
              )}
              {recent.map((inv) => (
                <InvoiceRow key={inv.key} inv={inv} />
              ))}
              {future.length > 0 && (
                <details className="group rounded-2xl border border-dashed border-line">
                  <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-foreground">
                      Próximas faturas · {future.length} {future.length === 1 ? "mês" : "meses"} com parcelas
                    </span>
                    <span className="tabular-nums text-text-soft">{brl(futureTotal)}</span>
                  </summary>
                  <div className="space-y-2 border-t border-line p-2">
                    {future.map((inv) => (
                      <InvoiceRow key={inv.key} inv={inv} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>
        );
      })}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Novo cartão</h2>
        <CardForm />
      </div>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  return (
                <details className="group rounded-2xl border border-line">
                  <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{invoiceName(inv)}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          STATUS[inv.status].className
                        )}
                      >
                        {STATUS[inv.status].label}
                      </span>
                    </span>
                    <span className="text-sm text-text-soft">
                      {brl(inv.total)}
                      {inv.paid > 0 && inv.pending > 0 && ` · falta ${brl(inv.pending)}`}
                      <span className="ml-2 text-xs text-faint">vence {formatDateBR(inv.dueDate)}</span>
                    </span>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {inv.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate text-foreground">{item.description}</span>
                          <span className="text-xs text-faint">
                            {formatDateBR(item.date)}
                            {item.category ? ` · ${item.category}` : ""}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 tabular-nums",
                            item.kind === "refund" ? "text-success" : "text-danger"
                          )}
                        >
                          {item.kind === "refund" ? "+ " : "− "}
                          {brl(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
  );
}
