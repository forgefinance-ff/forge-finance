import Link from "next/link";
import { Landmark, ListPlus, Target, WalletCards } from "lucide-react";

import { NewTransactionTrigger } from "@/components/dashboard/new-transaction-trigger";
import { createTransaction } from "@/app/actions/transactions";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";

type QuickActionsCardProps = {
  accounts: Account[];
  categories: Category[];
};

export function QuickActionsCard({
  accounts,
  categories,
}: QuickActionsCardProps) {
  const links = [
    {
      href: "/contas",
      label: "Nova Conta",
      icon: Landmark,
    },
    {
      href: "/cartoes",
      label: "Novo Cartão",
      icon: WalletCards,
    },
    {
      href: "/metas",
      label: "Nova Meta",
      icon: Target,
    },
  ];

  return (
    <div className="rounded-[22px] border border-line bg-surface p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/15 p-3">
          <ListPlus className="text-brand-soft" size={20} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Ações Rápidas
          </h3>

          <p className="text-sm text-muted-foreground">
            Crie novos registros sem sair do dashboard
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <NewTransactionTrigger
          action={createTransaction}
          accounts={accounts}
          categories={categories}
          label="Nova Transação"
          className="flex w-full items-center justify-center gap-2 rounded-xl"
        />

        {links.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-tint px-4 py-3 text-sm font-medium text-text-soft transition hover:border-violet-500/30 hover:bg-tint hover:text-foreground"
            >
              <Icon className="h-4 w-4 text-brand-soft" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
