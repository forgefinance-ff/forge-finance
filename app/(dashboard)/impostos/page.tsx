import { BusinessOnly } from "@/components/mei/business-only";
import { GovNotice } from "@/components/mei/gov-notice";
import { PageHeader } from "@/components/mei/page-header";
import { DasList } from "@/components/taxes/das-list";
import { DasnCard } from "@/components/taxes/dasn-card";
import { MeiSettingsSheet } from "@/components/taxes/mei-settings-sheet";
import { RevenueLimitCard } from "@/components/taxes/revenue-limit-card";
import { getAccounts } from "@/lib/accounts";
import { todayInBrazil } from "@/lib/dates";
import { getBusinessRevenue, getDasPayments, getMeiSettings } from "@/lib/mei";
import { ACTIVITY_LABEL, calcLimit } from "@/lib/mei-shared";
import { getActiveScope } from "@/lib/scope-server";

export default async function ImpostosPage() {
  const scope = await getActiveScope();

  if (scope !== "business") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Empresa"
          title="Impostos do MEI"
          description="Limite de faturamento, DAS e declaração anual."
        />
        <BusinessOnly feature="Impostos" />
      </div>
    );
  }

  const today = todayInBrazil();
  const year = Number(today.slice(0, 4));

  const [settings, revenue, payments, accounts] = await Promise.all([
    getMeiSettings(),
    getBusinessRevenue(year),
    getDasPayments(year),
    getAccounts(),
  ]);

  const calc = calcLimit(settings, revenue, today);
  const missing = !settings?.annual_limit || !settings?.das_amount;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Empresa"
        title="Impostos do MEI"
        description={
          settings
            ? `Atividade: ${ACTIVITY_LABEL[settings.activity]}. Acompanhe o limite de faturamento, o DAS e a declaração anual.`
            : "Acompanhe o limite de faturamento, o DAS e a declaração anual."
        }
      >
        <MeiSettingsSheet
          settings={settings}
          label={missing ? "Preencher configurações" : "Configurações do MEI"}
          variant={missing ? "default" : "outline"}
        />
      </PageHeader>

      <GovNotice />

      {missing && (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-3 text-sm text-muted-foreground">
          Falta informar{" "}
          {[!settings?.annual_limit && "o limite anual", !settings?.das_amount && "o valor do DAS"]
            .filter(Boolean)
            .join(" e ")}
          . O Forge Finance não usa valores padrão: confira os atuais no Portal do Empreendedor e
          preencha em “Preencher configurações”.
        </p>
      )}

      <RevenueLimitCard calc={calc} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DasList
          year={year}
          today={today}
          payments={payments}
          settings={settings}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        />
        <div className="space-y-6">
          <DasnCard dueDate={settings?.dasn_due_date ?? null} today={today} />
        </div>
      </div>
    </div>
  );
}
