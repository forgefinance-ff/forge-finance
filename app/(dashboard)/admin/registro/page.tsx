import { createAdminClient } from "@/lib/supabase/admin";
import { getRecentAdminActions } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";

const ACTION_LABEL: Record<string, string> = {
  grant_pro: "Liberou o Pro",
  extend_access: "Estendeu o acesso",
  revoke_pro: "Retirou o Pro",
  reset_ai_quota: "Zerou a cota de IA",
  disconnect_whatsapp: "Desconectou o WhatsApp",
};

export default async function AdminLogPage() {
  await requireAdmin();
  const actions = await getRecentAdminActions(100);

  const ids = [...new Set(actions.map((a) => a.target_user_id).filter(Boolean))] as string[];
  const emails = new Map<string, string>();
  if (ids.length) {
    const db = createAdminClient();
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        if (data.user?.email) emails.set(id, data.user.email);
      })
    );
  }

  if (actions.length === 0) {
    return <p className="text-muted-foreground">Nenhuma ação registrada ainda.</p>;
  }

  return (
    <ul className="divide-y divide-line rounded-[22px] border border-line bg-surface">
      {actions.map((a) => (
        <li key={a.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground">
              <span className="font-medium">{a.admin_email}</span> · {ACTION_LABEL[a.action] ?? a.action}
              {a.target_user_id && <> de {emails.get(a.target_user_id) ?? "usuário removido"}</>}
            </p>
            {a.reason && <p className="text-muted-foreground">“{a.reason}”</p>}
          </div>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={a.created_at}>
            {new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
          </time>
        </li>
      ))}
    </ul>
  );
}
