// A folha do Relatório completo. Componente de servidor: sem JavaScript no
// navegador além do botão de imprimir.
import Image from "next/image";

import "./report.css";

import type { DreMonth } from "@/lib/business-calc";
import type { FullReport } from "@/lib/full-report";
import { brl, dateBR } from "@/lib/full-report-core";
import { ACTIVITY_LABEL, competenceLabel } from "@/lib/mei-shared";
import type { Payable } from "@/lib/payables-shared";
import { SCOPE_LABEL } from "@/lib/scope";

import { CashLine, CategoryDonut, MonthlyBars, RankedBars, WeekdayBars } from "./charts";

const pct = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined
    ? "—"
    : `${n.toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;

const signed = (n: number | null) =>
  n === null ? null : `${n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function generatedAt() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: "good" | "bad" | "warn";
}) {
  return (
    <div className="rpt-kpi">
      <div className="rpt-kpi-label">{label}</div>
      <div className={`rpt-kpi-value${tone ? ` rpt-${tone}` : ""}`}>{value}</div>
      {sub ? <div className="rpt-kpi-sub">{sub}</div> : null}
    </div>
  );
}

function Section({
  title,
  lead,
  children,
  allowBreak,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
  allowBreak?: boolean;
}) {
  return (
    <section className={`rpt-section${allowBreak ? " rpt-allow-break" : ""}`}>
      <h2 className="rpt-h2">{title}</h2>
      {lead ? <p className="rpt-lead">{lead}</p> : null}
      {children}
    </section>
  );
}

export function FullReportView({ report }: { report: FullReport }) {
  const { totals, previous, period } = report;
  const isBusiness = report.scope === "business";
  const resultTone = totals.result >= 0 ? "good" : "bad";
  const expenseChange = report.changes.expense;
  const incomeChange = report.changes.income;

  return (
    <div className="rpt-sheet">
      {/* ------------------------------- Capa ------------------------------- */}
      <header className="rpt-cover">
        <div>
          <div className="rpt-brand">
            <Image src="/icon-f.png" alt="" width={40} height={40} className="rpt-logo" priority />
            <div className="rpt-brand-name">Forge Finance</div>
          </div>
          <h1 className="rpt-title">Relatório financeiro completo</h1>
          <p className="rpt-subtitle">{period.title}</p>
        </div>
        <div className="rpt-meta">
          <span className="rpt-badge">{SCOPE_LABEL[report.scope]}</span>
          <div>
            <strong>{report.userName}</strong>
          </div>
          <div>Gerado em {generatedAt()}</div>
        </div>
      </header>

      <div className="rpt-kpis">
        <Kpi
          label="Receitas"
          value={brl(totals.income)}
          sub={incomeChange !== null ? `${signed(incomeChange)} vs. período anterior` : null}
        />
        <Kpi
          label="Despesas"
          value={brl(totals.expense)}
          sub={expenseChange !== null ? `${signed(expenseChange)} vs. período anterior` : null}
        />
        <Kpi label="Resultado" value={brl(totals.result)} tone={resultTone} sub="Receitas − despesas" />
        <Kpi
          label="Sobra da receita"
          value={pct(report.savingsRate)}
          tone={report.savingsRate !== null && report.savingsRate < 0 ? "bad" : undefined}
          sub={`${totals.count} lançamentos`}
        />
      </div>

      <Section title="Destaques do período">
        <ul className="rpt-insights">
          {report.insights.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        {previous && period.previousTitle ? (
          <p className="rpt-note">Comparação com o período anterior ({period.previousTitle}).</p>
        ) : null}
        {totals.othersNet !== 0 ? (
          <p className="rpt-note">
            Aportes, empréstimos e reembolsos somam {brl(totals.othersNet)} e não entram no resultado.
          </p>
        ) : null}
      </Section>

      {/* ------------------------------ Evolução ----------------------------- */}
      <Section
        title="Evolução dos últimos 12 meses"
        lead="Quanto entrou e quanto saiu em cada mês."
      >
        <MonthlyBars data={report.series} />
        <div className="rpt-legend-key">
          <span className="rpt-key-item">
            <span className="rpt-dot rpt-dot-income" /> Receitas
          </span>
          <span className="rpt-key-item">
            <span className="rpt-dot rpt-dot-expense" /> Despesas
          </span>
        </div>
        {report.series.length > 0 ? (
          <div className="rpt-table-wrap" style={{ marginTop: 12 }}>
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className="rpt-num">Receitas</th>
                  <th className="rpt-num">Despesas</th>
                  <th className="rpt-num">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {[...report.series].reverse().map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td className="rpt-num">{brl(m.income)}</td>
                    <td className="rpt-num">{brl(m.expense)}</td>
                    <td className={`rpt-num ${m.result >= 0 ? "rpt-good" : "rpt-bad"}`}>{brl(m.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      {/* ---------------------------- Para onde vai --------------------------- */}
      <Section
        title="Para onde vai o dinheiro"
        lead="Despesas do período por categoria."
      >
        <CategoryDonut slices={report.expenseSlices} total={totals.expense} title="Despesas por categoria" />
      </Section>

      {report.topExpenses.length > 0 ? (
        <Section title="Maiores despesas do período">
          <RankedBars
            items={report.topExpenses.map((t) => ({
              label: t.title,
              sublabel: `${t.category} · ${dateBR(t.date)}`,
              value: t.amount,
            }))}
          />
        </Section>
      ) : null}

      {/* ---------------------------- De onde vem ----------------------------- */}
      {report.incomeSlices.length > 0 ? (
        <Section title="De onde vem o dinheiro" lead="Receitas do período por categoria.">
          <CategoryDonut slices={report.incomeSlices} total={totals.income} title="Receitas por categoria" />
        </Section>
      ) : null}

      {/* ------------------------------ Rotina -------------------------------- */}
      <Section
        title="Dia da semana que mais gasta"
        lead="Despesas somadas por dia da semana."
      >
        <WeekdayBars data={report.weekdays} />
        {report.weekdayNote ? <p className="rpt-note">{report.weekdayNote}</p> : null}
      </Section>

      {/* ---------------------------- Contas e patrimônio --------------------- */}
      <Section title="Contas e patrimônio" lead="Saldos de hoje.">
        <div className="rpt-grid2">
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th className="rpt-num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {report.accounts.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Nenhuma conta cadastrada.</td>
                  </tr>
                ) : (
                  report.accounts.map((a) => (
                    <tr key={a.name}>
                      <td>{a.name}</td>
                      <td className={`rpt-num ${a.balance < 0 ? "rpt-bad" : ""}`}>{brl(a.balance)}</td>
                    </tr>
                  ))
                )}
                <tr className="rpt-total">
                  <td>Total em contas</td>
                  <td className="rpt-num">{brl(report.accountsTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Investimento</th>
                  <th className="rpt-num">Valor atual</th>
                </tr>
              </thead>
              <tbody>
                {report.investments.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Nenhum investimento cadastrado.</td>
                  </tr>
                ) : (
                  report.investments.map((i) => (
                    <tr key={i.name}>
                      <td>{i.name}</td>
                      <td className="rpt-num">{brl(i.current)}</td>
                    </tr>
                  ))
                )}
                <tr className="rpt-total">
                  <td>Total investido</td>
                  <td className="rpt-num">{brl(report.investmentsTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="rpt-kpis rpt-kpis-3" style={{ marginTop: 12 }}>
          <Kpi label="Em contas" value={brl(report.accountsTotal)} />
          <Kpi label="Em investimentos" value={brl(report.investmentsTotal)} />
          <Kpi label="Patrimônio" value={brl(report.netWorth)} tone={report.netWorth < 0 ? "bad" : undefined} />
        </div>
      </Section>

      {report.goals.length > 0 ? (
        <Section title="Metas">
          <div className="rpt-table-wrap">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Meta</th>
                  <th className="rpt-num">Guardado</th>
                  <th className="rpt-num">Objetivo</th>
                  <th className="rpt-num">Prazo</th>
                  <th style={{ width: 120 }}>Progresso</th>
                </tr>
              </thead>
              <tbody>
                {report.goals.map((g) => {
                  const target = Number(g.target_amount);
                  const current = Number(g.current_amount);
                  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                  return (
                    <tr key={g.id}>
                      <td>{g.title}</td>
                      <td className="rpt-num">{brl(current)}</td>
                      <td className="rpt-num">{brl(target)}</td>
                      <td className="rpt-num">{g.deadline ? dateBR(g.deadline) : "—"}</td>
                      <td>
                        <div className="rpt-progress">
                          <div style={{ width: `${progress}%` }} />
                        </div>
                        <small>{pct(progress, 0)}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------- Empresa ------------------------------ */}
      {isBusiness && report.business ? <BusinessPart report={report} /> : null}

      <footer className="rpt-footer">
        <span>Forge Finance · forgefinance.com.br</span>
        <span>
          Valores em reais (BRL) · {SCOPE_LABEL[report.scope]} · {period.title}
        </span>
      </footer>
    </div>
  );
}

/* --------------------------------- Empresa --------------------------------- */

const DRE_LINES: {
  label: string;
  value: (m: DreMonth) => number;
  percent?: (m: DreMonth) => number | null;
  strong?: boolean;
  onlyIf?: (dre: DreMonth[]) => boolean;
}[] = [
  { label: "Faturamento", value: (m) => m.revenue, strong: true },
  { label: "(−) Impostos", value: (m) => m.taxes },
  { label: "(−) Custos variáveis", value: (m) => m.variable },
  {
    label: "(=) Margem de contribuição",
    value: (m) => m.contributionMargin,
    percent: (m) => m.contributionMarginPct,
    strong: true,
  },
  { label: "(−) Custos fixos", value: (m) => m.fixed },
  { label: "(−) Pró-labore", value: (m) => m.prolabore },
  {
    label: "(−) Não classificado",
    value: (m) => m.unclassified,
    onlyIf: (dre) => dre.some((m) => m.unclassified > 0),
  },
  { label: "(=) Lucro", value: (m) => m.profit, percent: (m) => m.profitPct, strong: true },
];

function BusinessPart({ report }: { report: FullReport }) {
  const business = report.business;
  if (!business) return null;

  const { panel, mei, toPay, toReceive } = business;
  const today = report.today;
  const { current, breakeven, projection, delinquency, goals, dre } = panel;
  const dreLines = DRE_LINES.filter((l) => !l.onlyIf || l.onlyIf(dre));
  const aboveBreakeven =
    breakeven.revenueNeeded !== null ? current.revenue >= breakeven.revenueNeeded : null;

  return (
    <>
      <h2 className="rpt-group-title rpt-page-break">Gestão da empresa</h2>

      {panel.alerts.length > 0 ? (
        <Section title="Pontos de atenção">
          <ul className="rpt-insights rpt-alerts">
            {panel.alerts.map((a) => (
              <li key={a.title} className={`rpt-tone-${a.tone}`}>
                <strong>{a.title}</strong>
                {a.text}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Mês atual da empresa" lead={`Competência ${current.label}.`}>
        <div className="rpt-kpis">
          <Kpi label="Faturamento" value={brl(current.revenue)} sub={goals.monthlyRevenue ? `Meta: ${brl(goals.monthlyRevenue)}` : null} />
          <Kpi
            label="Lucro"
            value={brl(current.profit)}
            tone={current.profit >= 0 ? "good" : "bad"}
            sub={current.profitPct !== null ? `Margem ${pct(current.profitPct)}` : null}
          />
          <Kpi label="Nº de vendas" value={String(current.salesCount)} />
          <Kpi label="Ticket médio" value={current.averageTicket === null ? "—" : brl(current.averageTicket)} />
        </div>
      </Section>

      <Section title="Resultado mês a mês (DRE)" lead="Do faturamento ao lucro, nos últimos 6 meses." allowBreak>
        <div className="rpt-table-wrap">
          <table className="rpt-table">
            <thead>
              <tr>
                <th />
                {dre.map((m) => (
                  <th key={m.month} className="rpt-num">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dreLines.map((line) => (
                <tr key={line.label} className={line.strong ? "rpt-total" : undefined}>
                  <td>{line.label}</td>
                  {dre.map((m) => {
                    const p = line.percent ? line.percent(m) : null;
                    return (
                      <td key={m.month} className="rpt-num">
                        {brl(line.value(m))}
                        {p !== null ? <div className="rpt-kpi-sub">{pct(p)}</div> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Ponto de equilíbrio" lead="Quanto a empresa precisa faturar por mês para não ter prejuízo.">
        <div className="rpt-kpis rpt-kpis-3">
          <Kpi
            label="Faturamento necessário"
            value={breakeven.revenueNeeded === null ? "—" : brl(breakeven.revenueNeeded)}
            sub={breakeven.basedOnMonths ? `Média de ${breakeven.basedOnMonths} mês(es)` : "Sem faturamento para calcular"}
          />
          <Kpi label="Custos fixos por mês" value={brl(breakeven.fixedCosts)} />
          <Kpi
            label="Impostos + custos variáveis"
            value={pct(breakeven.variableRate * 100)}
            sub="de cada R$ 1 faturado"
          />
        </div>
        {aboveBreakeven !== null ? (
          <p className="rpt-note">
            Neste mês a empresa faturou {brl(current.revenue)}:{" "}
            <span className={aboveBreakeven ? "rpt-good rpt-strong" : "rpt-bad rpt-strong"}>
              {aboveBreakeven ? "acima do ponto de equilíbrio" : "abaixo do ponto de equilíbrio"}
            </span>
            .
          </p>
        ) : null}
      </Section>

      <Section title="Caixa nos próximos 90 dias" lead="Saldo de hoje + contas a receber − contas a pagar.">
        <CashLine points={projection.points} />
        <div className="rpt-kpis" style={{ marginTop: 10 }}>
          <Kpi label="Saldo hoje" value={brl(projection.startBalance)} />
          <Kpi label="Vai entrar" value={brl(projection.inflow)} tone="good" />
          <Kpi label="Vai sair" value={brl(projection.outflow)} />
          <Kpi
            label="Menor saldo"
            value={brl(projection.lowest.balance)}
            tone={projection.lowest.balance < 0 ? "bad" : undefined}
            sub={dateBR(projection.lowest.date)}
          />
        </div>
        {projection.firstNegative ? (
          <p className="rpt-note rpt-bad">O caixa fica negativo em {dateBR(projection.firstNegative)}.</p>
        ) : null}
      </Section>

      <Section title="Contas a pagar e a receber" lead="Atrasadas e as que vencem nos próximos 30 dias." allowBreak>
        <div className="rpt-grid2">
          <PayablesTable title="A pagar" items={toPay.items} total={toPay.total} today={today} />
          <PayablesTable title="A receber" items={toReceive.items} total={toReceive.total} today={today} />
        </div>
      </Section>

      <Section title="Clientes" lead="Quem mais pagou nos últimos 12 meses e quem está em atraso.">
        {delinquency.topCustomers.length === 0 && delinquency.overdueCount === 0 ? (
          <p className="rpt-empty">Ainda não há cobranças com clientes registradas.</p>
        ) : (
          <>
            <div className="rpt-kpis">
              <Kpi
                label="Em atraso"
                value={brl(delinquency.overdueTotal)}
                tone={delinquency.overdueTotal > 0 ? "bad" : undefined}
                sub={`${delinquency.overdueCount} cobrança(s)`}
              />
              <Kpi label="Clientes em atraso" value={String(delinquency.overdueCustomers)} />
              <Kpi label="Atraso médio" value={`${delinquency.averageDaysLate} dias`} />
              <Kpi label="Melhores clientes" value={String(delinquency.topCustomers.length)} sub="com recebimentos no ano" />
            </div>
            <div className="rpt-grid2" style={{ marginTop: 14 }}>
              <div>
                <div className="rpt-strong" style={{ marginBottom: 6 }}>
                  Melhores clientes
                </div>
                {delinquency.topCustomers.length === 0 ? (
                  <p className="rpt-note">Sem recebimentos nos últimos 12 meses.</p>
                ) : (
                  <RankedBars
                    items={delinquency.topCustomers.map((c) => ({ label: c.name, value: c.received12m }))}
                    color="#16a34a"
                  />
                )}
              </div>
              <div>
                <div className="rpt-strong" style={{ marginBottom: 6 }}>
                  Maiores atrasos
                </div>
                {delinquency.worstPayers.length === 0 ? (
                  <p className="rpt-note">Nenhum cliente em atraso.</p>
                ) : (
                  <RankedBars
                    items={delinquency.worstPayers.map((c) => ({
                      label: c.name,
                      sublabel: `${c.maxDaysLate} dias de atraso`,
                      value: c.overdue,
                    }))}
                    color="#dc2626"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </Section>

      {mei.settings ? (
        <Section title="MEI: limite e impostos" lead={`Atividade: ${ACTIVITY_LABEL[mei.settings.activity]}.`} allowBreak>
          <div className="rpt-kpis rpt-kpis-3">
            <Kpi label={`Faturado em ${mei.limit.year}`} value={brl(mei.limit.revenue)} />
            <Kpi
              label="Limite do ano"
              value={mei.limit.limit === null ? "Não informado" : brl(mei.limit.limit)}
              sub={mei.limit.remaining !== null ? `Restam ${brl(mei.limit.remaining)}` : null}
            />
            <Kpi
              label="Limite usado"
              value={pct(mei.limit.percent)}
              tone={mei.limit.level === "danger" ? "bad" : mei.limit.level === "warning" ? "warn" : undefined}
              sub={`Projeção do ano: ${brl(mei.limit.projection)}`}
            />
          </div>
          {mei.das.length > 0 ? (
            <div className="rpt-table-wrap" style={{ marginTop: 12 }}>
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Competência (DAS)</th>
                    <th className="rpt-num">Valor</th>
                    <th className="rpt-num">Vencimento</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {mei.das.map((d) => (
                    <tr key={d.id}>
                      <td>{competenceLabel(d.competence)}</td>
                      <td className="rpt-num">{brl(d.amount)}</td>
                      <td className="rpt-num">{dateBR(d.due_date)}</td>
                      <td>{d.status === "paid" ? "Paga" : d.due_date < today ? "Atrasada" : "Pendente"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rpt-note">Nenhuma guia do DAS registrada neste ano.</p>
          )}
        </Section>
      ) : null}
    </>
  );
}

function PayablesTable({
  title,
  items,
  total,
  today,
}: {
  title: string;
  items: Payable[];
  total: number;
  today: string;
}) {
  return (
    <div className="rpt-table-wrap">
      <table className="rpt-table">
        <thead>
          <tr>
            <th>{title}</th>
            <th className="rpt-num">Vence</th>
            <th className="rpt-num">Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3}>Nada pendente.</td>
            </tr>
          ) : (
            items.slice(0, 12).map((p) => (
              <tr key={p.id}>
                <td>
                  {p.description}
                  {p.customer_name ? <div className="rpt-kpi-sub">{p.customer_name}</div> : null}
                </td>
                <td className={`rpt-num ${p.due_date < today ? "rpt-bad" : ""}`}>
                  {dateBR(p.due_date)}
                  {p.due_date < today ? <div className="rpt-kpi-sub">atrasada</div> : null}
                </td>
                <td className="rpt-num">{brl(p.amount)}</td>
              </tr>
            ))
          )}
          <tr className="rpt-total">
            <td colSpan={2}>Total{items.length > 12 ? ` (${items.length} itens, 12 mostrados)` : ""}</td>
            <td className="rpt-num">{brl(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
