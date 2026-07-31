"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type TransactionsHeaderProps = {
  onNewTransaction?: () => void;
};

export function TransactionsHeader({
  onNewTransaction,
}: TransactionsHeaderProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827] p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
            Financeiro
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Transações
          </h1>

          <p className="mt-2 max-w-xl text-slate-400">
            Gerencie todas as suas receitas e despesas em um único lugar.
          </p>
        </div>

        <Button type="button" onClick={onNewTransaction} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>
    </section>
  );
}
