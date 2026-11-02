import { PageHeader } from "@/components/mei/page-header";
import { PayablesWorkspace } from "@/components/payables/payables-workspace";
import { getAccounts } from "@/lib/accounts";
import { getCategories } from "@/lib/categories";
import { getCustomers } from "@/lib/customers";
import { isRealDate, todayInBrazil } from "@/lib/dates";
import { getPayables } from "@/lib/payables";
import { STATUS_FILTERS, type StatusFilter } from "@/lib/payables-shared";
import { getActiveScope } from "@/lib/scope-server";

type SearchParams = {
  aba?: string | string[];
  status?: string | string[];
  de?: string | string[];
  ate?: string | string[];
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value?: string | string[]) {
  const date = first(value);
  return date && isRealDate(date) ? date : null;
}

export default async function ContasAPagarReceberPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const kind = first(params.aba) === "receber" ? "receivable" : "payable";
  const statusParam = first(params.status);
  const status: StatusFilter = STATUS_FILTERS.some((s) => s.value === statusParam)
    ? (statusParam as StatusFilter)
    : "pendentes";

  let from = validDate(params.de);
  let to = validDate(params.ate);
  if (from && to && from > to) [from, to] = [to, from];

  const scope = await getActiveScope();

  const [payables, accounts, categories, customers] = await Promise.all([
    getPayables({ kind, status, from, to }),
    getAccounts(),
    getCategories(),
    scope === "business" ? getCustomers() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={scope === "business" ? "Empresa" : "Financeiro"}
        title="Contas a pagar e receber"
        description="Acompanhe vencimentos, marque o que foi pago e cobre clientes pelo WhatsApp."
      />

      <PayablesWorkspace
        kind={kind}
        status={status}
        from={from}
        to={to}
        payables={payables}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        customers={customers?.map((c) => ({ id: c.id, name: c.name })) ?? null}
        today={todayInBrazil()}
      />
    </div>
  );
}
