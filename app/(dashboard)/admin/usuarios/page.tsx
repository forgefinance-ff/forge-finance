import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";

import { UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { PAGE_SIZE, USER_FILTERS, getAdminUsers, parseFilter, type AdminUserRow } from "@/lib/admin/data";
import { cn } from "@/lib/utils";

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function relative(value: string | null) {
  if (!value) return "nunca";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

function PlanBadge({ user }: { user: AdminUserRow }) {
  const paying = user.access_source === "subscription" && ["active", "past_due"].includes(user.status);
  if (paying) {
    return (
      <div className="space-y-1">
        <Badge>
          {user.plan_id === "pessoal" ? "Pessoal" : "MEI"} {user.billing_interval === "year" ? "anual" : "mensal"}
        </Badge>
        {user.status === "past_due" && <p className="text-xs text-warning">pagamento atrasado</p>}
        {user.cancel_at_period_end && <p className="text-xs text-warning">cancela em {shortDate(user.current_period_end)}</p>}
        {!user.cancel_at_period_end && user.current_period_end && (
          <p className="text-xs text-muted-foreground">renova {shortDate(user.current_period_end)}</p>
        )}
      </div>
    );
  }
  if (user.access_source === "admin") {
    const expired = user.current_period_end && new Date(user.current_period_end) < new Date();
    return (
      <div className="space-y-1">
        <Badge variant="secondary">MEI manual</Badge>
        <p className={cn("text-xs", expired ? "text-destructive" : "text-muted-foreground")}>
          {user.current_period_end ? `${expired ? "venceu" : "até"} ${shortDate(user.current_period_end)}` : "sem prazo"}
        </p>
      </div>
    );
  }
  return <Badge variant="outline">{user.status === "canceled" ? "Cancelado" : "Free"}</Badge>;
}

type SearchParams = Promise<{ q?: string; filtro?: string; pagina?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const filter = parseFilter(params.filtro);
  const page = Math.max(1, Number(params.pagina) || 1);
  const search = params.q?.slice(0, 100) ?? "";

  const { rows, total } = await getAdminUsers({ search, filter, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (next: { filtro?: string; pagina?: number }) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    const f = next.filtro ?? filter;
    if (f !== "all") qs.set("filtro", f);
    if (next.pagina && next.pagina > 1) qs.set("pagina", String(next.pagina));
    const s = qs.toString();
    return `/admin/usuarios${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <form className="flex gap-2" role="search">
        {filter !== "all" && <input type="hidden" name="filtro" value={filter} />}
        <label htmlFor="admin-search" className="sr-only">
          Buscar por e-mail ou nome
        </label>
        <input
          id="admin-search"
          name="q"
          defaultValue={search}
          placeholder="Buscar por e-mail ou nome"
          className="h-11 w-full max-w-md rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" className="h-11 rounded-xl bg-primary px-5 text-sm text-primary-foreground">
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-2" aria-label="Filtros">
        {Object.entries(USER_FILTERS).map(([key, label]) => (
          <Link
            key={key}
            href={href({ filtro: key })}
            aria-current={filter === key ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              filter === key ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "usuário" : "usuários"}
      </p>

      <div className="overflow-x-auto rounded-[22px] border border-line bg-surface">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-normal">Usuário</th>
              <th className="px-4 py-3 font-normal">Plano</th>
              <th className="px-4 py-3 font-normal">WhatsApp</th>
              <th className="px-4 py-3 font-normal">Lançamentos</th>
              <th className="px-4 py-3 font-normal">IA no mês</th>
              <th className="px-4 py-3 font-normal">Stripe</th>
              <th className="px-4 py-3 text-right font-normal">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Ninguém neste filtro.
                </td>
              </tr>
            )}
            {rows.map((user) => {
              const paying = user.access_source === "subscription" && ["active", "past_due"].includes(user.status);
              return (
                <tr key={user.user_id} className="border-b border-border/60 align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{user.full_name || "—"}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      desde {shortDate(user.created_at)}
                      {user.is_mei && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">MEI</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge user={user} />
                  </td>
                  <td className="px-4 py-3">{user.whatsapp ? "Conectado" : <span className="text-muted-foreground">Não</span>}</td>
                  <td className="px-4 py-3">
                    <p className="tabular-nums">{user.entries_count}</p>
                    <p className="text-xs text-muted-foreground">último: {relative(user.last_entry_at)}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {user.ai_used}/{user.ai_limit}
                  </td>
                  <td className="px-4 py-3">
                    {user.provider_customer_id ? (
                      <a
                        href={`https://dashboard.stripe.com/customers/${encodeURIComponent(user.provider_customer_id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Abrir
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions
                      userId={user.user_id}
                      email={user.email ?? ""}
                      accessSource={user.access_source}
                      hasDeadline={Boolean(user.current_period_end)}
                      paying={paying}
                      whatsapp={user.whatsapp}
                      aiUsed={user.ai_used}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Páginas">
          {page > 1 ? <Link href={href({ pagina: page - 1 })} className="text-primary">← Anterior</Link> : <span />}
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link href={href({ pagina: page + 1 })} className="text-primary">Próxima →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
