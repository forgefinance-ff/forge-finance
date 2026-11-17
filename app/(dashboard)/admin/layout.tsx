import type { Metadata } from "next";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { PageHeader } from "@/components/mei/page-header";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupportUnreadCount } from "@/lib/admin/support";

export const metadata: Metadata = {
  title: "Admin · Forge Finance",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const supportUnread = await getSupportUnreadCount();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Painel admin"
        description="Números do negócio e dados de conta. O conteúdo financeiro dos usuários não aparece aqui."
      />
      <AdminTabs supportUnread={supportUnread} />
      {children}
    </div>
  );
}
