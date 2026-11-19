import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Kpi, Panel } from "@/components/admin/stat";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminUsage, type AdminUsageRow } from "@/lib/admin/data";
import { averageServicePrice, microsToBrl, parseUsdBrl, userWhatsappCost } from "@/lib/admin/usage-cost";
import { formatCurrency } from "@/lib/formatters";

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Custos por usuário são pequenos: mostra até 4 casas para não virar R$ 0,00. */
function smallBrl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

const count = (value: number) => Number(value).toLocaleString("pt-BR");
const compact = (value: number) =>
  Number(value).toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function planLabel(row: AdminUsageRow) {
  if (row.access_source === "admin") return "MEI manual";
  if (row.plan_id === "pessoal") return "Pessoal";
  if (row.plan_id === "pro") return "MEI";
  return "Free";
}

export default async function AdminCostsPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireAdmin();
  const { mes } = await searchParams;
  const current = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
  const month = mes && MONTH_PARAM.test(mes) && mes <= current ? mes : current;
  const usage = await getAdminUsage(`${month}-01`);

  if (!usage) {
    return (
      <Panel title="Custos por usuário">
        <p className="text-sm text-muted-foreground">
          Para ligar esta página, rode no Supabase a migration <code>20261118120000_usage_costs.sql</code>.
        </p>
      </Panel>
    );
  }

  const { totals } = usage;
  const usdBrl = parseUsdBrl(process.env.ADMIN_USD_BRL);
  const servicePrice = averageServicePrice(Math.max(0, totals.outboundService - totals.deliveryFailed));

  const rows = usage.rows
    .map((row) => {
      const ai = microsToBrl(Number(row.ai_cost_usd_micros), usdBrl);
      const whatsapp = userWhatsappCost(
        {
          outboundService: Number(row.outbound_service),
          outboundTemplate: Number(row.outbound_template),
          deliveryFailed: Number(row.delivery_failed),
        },
        servicePrice
      );
      return { row, ai, whatsapp, total: ai + whatsapp };
    })
    .sort((a, b) => b.total - a.total);

  const aiTotal = microsToBrl(totals.aiCostUsdMicros, usdBrl);
  const whatsappTotal = userWhatsappCost(
    {
      outboundService: totals.outboundService,
      outboundTemplate: totals.outboundTemplate,
      deliveryFailed: totals.deliveryFailed,
    },
    servicePrice
  );
  const total = aiTotal + whatsappTotal;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-3 text-sm" aria-label="Mês">
        <Link href={`/admin/custos?mes=${shiftMonth(month, -1)}`} className="text-primary underline-offset-4 hover:underline">
          ← Anterior
        </Link>
        <span className="font-medium capitalize text-foreground">{monthLabel(month)}</span>
        {month < current && (
          <Link href={`/admin/custos?mes=${shiftMonth(month, 1)}`} className="text-primary underline-offset-4 hover:underline">
            Próximo →
          </Link>
        )}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Custo total" value={formatCurrency(total)} hint="IA + WhatsApp" tone="brand" />
        <Kpi label="IA" value={formatCurrency(aiTotal)} hint={`${count(totals.aiRequests)} chamadas · ${compact(totals.tokens)} tokens`} />
        <Kpi
          label="WhatsApp"
          value={formatCurrency(whatsappTotal)}
          hint={`${count(totals.inbound)} recebidas · ${count(totals.outboundService + totals.outboundTemplate)} enviadas`}
        />
        <Kpi
          label="Custo por usuário"
          value={totals.users ? smallBrl(total / totals.users) : "—"}
          hint={`${count(totals.users)} usaram no mês`}
        />
      </div>

      {totals.unpricedRequests > 0 && (
        <p className="flex gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          {count(totals.unpricedRequests)} chamada(s) usaram um modelo sem preço em lib/ai/pricing.ts e estão com custo zerado.
        </p>
      )}

      <div className="overflow-x-auto rounded-[22px] border border-line bg-surface">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-normal">Usuário</th>
              <th className="px-4 py-3 font-normal">Plano</th>
              <th className="px-4 py-3 font-normal">Mensagens</th>
              <th className="px-4 py-3 font-normal">Tokens</th>
              <th className="px-4 py-3 text-right font-normal">IA</th>
              <th className="px-4 py-3 text-right font-normal">WhatsApp</th>
              <th className="px-4 py-3 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum uso registrado neste mês.
                </td>
              </tr>
            )}
            {rows.map(({ row, ai, whatsapp, total: userTotal }) => (
              <tr key={row.user_id} className="border-b border-border/60 align-top last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{row.full_name || "—"}</p>
                  <p className="text-muted-foreground">{row.email}</p>
                </td>
                <td className="px-4 py-3">{planLabel(row)}</td>
                <td className="px-4 py-3 tabular-nums">
                  <p>
                    {count(row.inbound)} recebidas
                    {Number(row.inbound_audio) > 0 && <span className="text-muted-foreground"> ({count(row.inbound_audio)} áudios)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {count(Number(row.outbound_service) + Number(row.outbound_template))} enviadas
                    {Number(row.delivery_failed) > 0 && ` · ${count(row.delivery_failed)} falharam`}
                  </p>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <p>
                    {compact(row.input_tokens)} entrada · {compact(row.output_tokens)} saída
                  </p>
                  <p className="text-xs text-muted-foreground">
                    cache: {compact(row.cache_read_tokens)} lidos · {compact(row.cache_write_tokens)} gravados
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{smallBrl(ai)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{smallBrl(whatsapp)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{smallBrl(userTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        IA: tokens informados pela Anthropic em cada chamada, com US$ 1 = R$ {usdBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. WhatsApp: mensagens
        enviadas pela tabela da Meta, com as 1.000 respostas grátis do mês divididas entre todos. A transcrição de áudios ainda
        não entra no custo. A contagem por usuário começa quando a migration é aplicada.
      </p>
    </div>
  );
}
