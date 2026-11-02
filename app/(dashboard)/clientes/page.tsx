import { CustomersWorkspace } from "@/components/customers/customers-workspace";
import { BusinessOnly } from "@/components/mei/business-only";
import { PageHeader } from "@/components/mei/page-header";
import { getCustomers } from "@/lib/customers";
import { getActiveScope } from "@/lib/scope-server";

type Props = {
  searchParams?: Promise<{ arquivados?: string | string[] }>;
};

export default async function ClientesPage({ searchParams }: Props) {
  const scope = await getActiveScope();
  const archived = (await searchParams)?.arquivados === "1";

  const header = (
    <PageHeader
      eyebrow="Empresa"
      title="Clientes"
      description="Cadastre quem compra de você para registrar contas a receber e cobrar pelo WhatsApp."
    />
  );

  if (scope !== "business") {
    return (
      <div className="space-y-6">
        {header}
        <BusinessOnly feature="Clientes" />
      </div>
    );
  }

  const customers = await getCustomers({ archived });

  return (
    <div className="space-y-6">
      {header}
      <CustomersWorkspace customers={customers} archived={archived} />
    </div>
  );
}
