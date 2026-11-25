import { PageHeader } from "@/components/mei/page-header";
import { InvestmentsLive } from "@/components/investments/investments-live";
import { getPortfolio } from "@/lib/investments";

export const metadata = { title: "Investimentos" };
export const dynamic = "force-dynamic";

export default async function InvestimentosPage() {
  const portfolio = await getPortfolio();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investimentos"
        title="Investimentos"
        description="Sua carteira com cotação automática: ações, FIIs, ETFs, cripto e renda fixa num lugar só, com a análise do dia."
      />

      <InvestmentsLive initial={portfolio} />
    </div>
  );
}
