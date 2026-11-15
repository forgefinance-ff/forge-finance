import { CheckCircle2, TriangleAlert } from "lucide-react";

import { DonutChart, SignupsChart } from "@/components/admin/charts";
import { Kpi, Panel, pct } from "@/components/admin/stat";
import { getAdminOverview } from "@/lib/admin/data";
import { formatCurrency } from "@/lib/formatters";

/** Tarifa da Meta por mensagem de serviço/utilidade no Brasil (out/2026) e a franquia grátis mensal. */
const WHATSAPP_SERVICE_PRICE = 0.035;
const WHATSAPP_FREE_SERVICE = 1000;

function dateTime(value: string | null) {
  if (!value) return "nunca";
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AdminOverviewPage() {
  const o = await getAdminOverview();
  const f = o.funnel;
  const r = o.revenue;
  const c = o.costs;
  const h = o.health;

  const paying = r.paying_month + r.paying_year;
  const free = Math.max(0, o.users_total - paying - r.manual_access);
  const mrr = r.mrr_cents / 100;

  const aiCostPerRequest = Number(process.env.ADMIN_AI_COST_PER_REQUEST ?? "") || null;
  const aiCost = aiCostPerRequest ? c.ai_requests_month * aiCostPerRequest : null;
  const whatsappCost = Math.max(0, c.whatsapp_inbound_month - WHATSAPP_FREE_SERVICE) * WHATSAPP_SERVICE_PRICE;
  const totalCost = (aiCost ?? 0) + whatsappCost;

  const viaWhatsApp = Math.min(o.channels_30d.whatsapp_actions, o.channels_30d.entries_total);
  const viaApp = o.channels_30d.entries_total - viaWhatsApp;

  const funnel = [
    { label: "Se cadastraram", value: f.signed_up, base: f.signed_up },
    { label: "Conectaram o WhatsApp", value: f.whatsapp, base: f.signed_up },
    { label: "Fizeram o 1º lançamento", value: f.first_entry, base: f.signed_up },
    { label: "Ainda usam depois de 7 dias", value: f.active_d7, base: f.eligible_d7 },
    { label: "Viraram pagantes", value: f.paying, base: f.signed_up },
  ];

  const alerts: string[] = [];
  if (r.past_due) alerts.push(`${r.past_due} pagante(s) com pagamento atrasado. Veja no Stripe.`);
  if (r.canceling) alerts.push(`${r.canceling} pagante(s) pediram para cancelar no fim do período. Vale mandar mensagem.`);
  if (h.whatsapp_stuck) alerts.push(`${h.whatsapp_stuck} mensagem(ns) do WhatsApp travadas há mais de 10 minutos.`);
  if (h.whatsapp_failed_7d) alerts.push(`${h.whatsapp_failed_7d} ação(ões) do WhatsApp deram erro nos últimos 7 dias.`);
  if (c.whatsapp_inbound_month > WHATSAPP_FREE_SERVICE * 0.8)
    alerts.push(`O WhatsApp já usou ${c.whatsapp_inbound_month} de ${WHATSAPP_FREE_SERVICE} mensagens grátis do mês.`);
  for (const row of h.rate_limited_1h) alerts.push(`${row.email ?? "Alguém sem login"} fez ${row.hits} pedidos em 1 hora (${row.bucket}).`);

  return (
    <div className="space-y-6">
      {/* 1. Os 4 números que importam */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Usuários" value={o.users_total} hint={`+${o.signups_7d} nos últimos 7 dias`} />
        <Kpi label="Usam o app" value={o.active.d7} hint="lançaram algo nos últimos 7 dias" />
        <Kpi label="Pagantes" value={paying} hint={r.manual_access ? `+ ${r.manual_access} com acesso liberado` : "assinaturas ativas"} tone="brand" />
        <Kpi label="Receita por mês" value={formatCurrency(mrr)} hint="mensais + anuais ÷ 12" tone="success" />
      </div>

      {/* 2. Crescimento e planos */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Novos cadastros" description={`Últimos 14 dias · hoje: ${o.signups_today}`}>
          <SignupsChart data={o.signups_daily} />
        </Panel>
        <Panel title="Quem é quem" description="Como os usuários estão divididos por plano.">
          <DonutChart
            center={String(o.users_total)}
            centerLabel="usuários"
            data={[
              { name: "Free", value: free, color: "var(--line-strong)" },
              { name: "Pro mensal", value: r.paying_month, color: "var(--brand)" },
              { name: "Pro anual", value: r.paying_year, color: "var(--success)" },
              { name: "Acesso liberado", value: r.manual_access, color: "var(--warning)" },
            ]}
          />
        </Panel>
      </div>

      {/* 3. Funil e canal */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Do cadastro ao pagamento" description="Quem se cadastrou nos últimos 30 dias e até onde chegou.">
          <ol className="space-y-4">
            {funnel.map((step) => {
              const width = step.base ? Math.round((step.value / step.base) * 100) : 0;
              return (
                <li key={step.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground">{step.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{step.value}</span> · {pct(step.value, step.base)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-tint" aria-hidden>
                    <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            &quot;Depois de 7 dias&quot; conta só quem já tem 7 dias de conta ({f.eligible_d7} pessoa{f.eligible_d7 === 1 ? "" : "s"}).
          </p>
        </Panel>

        <Panel title="Como lançam" description="Lançamentos dos últimos 30 dias.">
          <DonutChart
            center={String(o.channels_30d.entries_total)}
            centerLabel="lançamentos"
            data={[
              { name: "Pelo WhatsApp", value: viaWhatsApp, color: "var(--success)" },
              { name: "Pelo app", value: viaApp, color: "var(--brand)" },
            ]}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            {o.profile.mei_configured} configuraram o MEI · {o.profile.uses_business} usam o modo Empresa
          </p>
        </Panel>
      </div>

      {/* 4. Atenção e custos */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Precisa de atenção">
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              Tudo certo. Nenhum problema agora.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {alerts.map((alert) => (
                <li key={alert} className="flex gap-2 text-sm text-foreground">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                  {alert}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Último aviso do Stripe: {dateTime(h.last_billing_event)}</p>
        </Panel>

        <Panel title="Gastos do mês" description="Estimativa.">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">WhatsApp ({c.whatsapp_inbound_month} de {WHATSAPP_FREE_SERVICE} grátis)</dt>
              <dd className="tabular-nums text-foreground">{formatCurrency(whatsappCost)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">IA ({c.ai_requests_month} consultas)</dt>
              <dd className="tabular-nums text-foreground">{aiCost !== null ? formatCurrency(aiCost) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-3 font-medium">
              <dt className="text-foreground">Por usuário ativo</dt>
              <dd className="tabular-nums text-foreground">{o.active.d30 ? formatCurrency(totalCost / o.active.d30) : "—"}</dd>
            </div>
          </dl>
          {aiCost === null && (
            <p className="mt-3 text-xs text-muted-foreground">Para estimar a IA, defina ADMIN_AI_COST_PER_REQUEST.</p>
          )}
        </Panel>
      </div>

      <p className="text-xs text-muted-foreground">Atualizado em {dateTime(o.generated_at)}.</p>
    </div>
  );
}
