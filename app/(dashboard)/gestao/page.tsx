import Link from "next/link";

import { BusinessOnly } from "@/components/mei/business-only";
import { PageHeader } from "@/components/mei/page-header";
import { AlertsList } from "@/components/business/alerts-list";
import { BreakevenCard } from "@/components/business/breakeven-card";
import { BusinessKpis } from "@/components/business/business-kpis";
import { CashProjectionCard } from "@/components/business/cash-projection-card";
import { DelinquencyCard } from "@/components/business/delinquency-card";
import { DreTable } from "@/components/business/dre-table";
import { GoalsIndicators } from "@/components/business/goals-indicators";
import { PricingCalculator } from "@/components/business/pricing-calculator";
import { ScopeTransferCard } from "@/components/business/scope-transfer-card";
import { getBusinessPanel } from "@/lib/business-panel";
import { getActiveScope } from "@/lib/scope-server";

export default async function GestaoPage() {
  const scope = await getActiveScope();

  const header = (
    <PageHeader
      eyebrow="Empresa"
      title="Gestão da empresa"
      description="Caixa dos próximos 90 dias, resultado do mês (DRE), ponto de equilíbrio, metas, inadimplência e a separação entre o seu dinheiro e o da empresa."
    />
  );

  if (scope !== "business") {
    return (
      <div className="space-y-6">
        {header}
        <BusinessOnly feature="Gestão da empresa" />
      </div>
    );
  }

  const panel = await getBusinessPanel();
  if (!panel) return null;

  const hasData =
    panel.accounts.length > 0 ||
    panel.dre.some((m) => m.revenue > 0 || m.fixed > 0 || m.variable > 0);

  return (
    <div className="space-y-6">
      {header}

      {!hasData && (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-3 text-sm text-muted-foreground">
          Ainda há poucos dados da empresa. Cadastre as{" "}
          <Link href="/contas" className="font-medium text-brand-soft hover:underline">
            contas da empresa
          </Link>
          , lance vendas e despesas ou{" "}
          <Link href="/importar" className="font-medium text-brand-soft hover:underline">
            importe o extrato
          </Link>{" "}
          para os números aparecerem aqui.
        </p>
      )}

      <AlertsList alerts={panel.alerts} />

      <BusinessKpis panel={panel} />

      <CashProjectionCard projection={panel.projection} today={panel.today} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DreTable dre={panel.dre} />
        <div className="space-y-6">
          <BreakevenCard breakeven={panel.breakeven} current={panel.current} />
          <PricingCalculator variablePct={Math.round(panel.breakeven.variableRate * 1000) / 10} />
        </div>
      </div>

      <GoalsIndicators
        goals={panel.goals}
        current={panel.current}
        previous={panel.previous}
        lastYear={panel.lastYear}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <DelinquencyCard delinquency={panel.delinquency} />
        <ScopeTransferCard
          businessAccounts={panel.accounts}
          personalAccounts={panel.personalAccounts}
          today={panel.today}
        />
      </div>
    </div>
  );
}
