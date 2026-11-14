import Link from "next/link";

import { PageHeader } from "@/components/mei/page-header";
import { AgendaCard } from "@/components/raio-x/agenda-card";
import { AllocationCard } from "@/components/raio-x/allocation-card";
import { ChangesCard } from "@/components/raio-x/changes-card";
import { HabitsCard } from "@/components/raio-x/habits-card";
import { RxKpis } from "@/components/raio-x/rx-kpis";
import { SpendCalendar } from "@/components/raio-x/spend-calendar";
import { WeekdayCard } from "@/components/raio-x/weekday-card";
import { formatDateBR } from "@/lib/dates";
import { getRaioX } from "@/lib/raio-x";

export const metadata = { title: "Raio-X da rotina" };

export default async function RaioXPage() {
  const data = await getRaioX();
  if (!data) return null;

  const isBusiness = data.scope === "business";

  const header = (
    <PageHeader
      eyebrow={isBusiness ? "Empresa" : "Pessoal"}
      title="Raio-X da rotina"
      description={
        isBusiness
          ? "Quando e com o quê a empresa gasta: dias pesados, gastos que se repetem, o que mudou e o que vence na semana."
          : "Quando e com o quê você gasta: dias pesados, hábitos que se repetem, o que mudou e o que vence na semana."
      }
    />
  );

  if (!data.hasData) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-[22px] border border-dashed border-line-strong bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-foreground">Ainda não há gastos para analisar</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {isBusiness
              ? "Lance as despesas da empresa, importe o extrato da conta PJ ou registre pelo WhatsApp. Com algumas semanas de dados, o Raio-X mostra os padrões."
              : "Lance seus gastos, importe o extrato do banco ou registre pelo WhatsApp. Com algumas semanas de dados, o Raio-X mostra os padrões."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/importar"
              className="glass-primary rounded-xl px-4 py-2 text-sm font-medium text-background transition"
            >
              Importar extrato
            </Link>
            <Link
              href="/transacoes"
              className="glass rounded-xl px-4 py-2 text-sm font-medium text-foreground transition"
            >
              Lançar transação
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {data.lastDate && data.lastDate < data.today && (
        <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted-foreground">
          Os números vão até <b className="text-foreground">{formatDateBR(data.lastDate)}</b>, data do
          último lançamento. Para ficar em dia,{" "}
          <Link href="/importar" className="font-medium text-brand-soft hover:underline">
            importe o extrato
          </Link>{" "}
          ou registre os gastos pelo WhatsApp.
        </p>
      )}

      <RxKpis data={data} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <SpendCalendar calendar={data.calendar} />
        <WeekdayCard weekday={data.weekday} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HabitsCard habits={data.habits} scope={data.scope} />
        <AllocationCard allocation={data.allocation} scope={data.scope} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <AgendaCard agenda={data.agenda} today={data.today} hasAccounts={data.hasAccounts} />
        <ChangesCard changes={data.changes} pace={data.pace} />
      </div>
    </div>
  );
}
