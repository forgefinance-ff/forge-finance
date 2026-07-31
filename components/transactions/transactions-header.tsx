"use client";

import { Filter, Plus, Search } from "lucide-react";

type TransactionsHeaderProps = {
  onNewTransaction?: () => void;
};

export function TransactionsHeader({
  onNewTransaction,
}: TransactionsHeaderProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
            Financeiro
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Transações
          </h1>

          <p className="mt-2 text-zinc-400">
            Gerencie todas as suas receitas e despesas em um único lugar.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewTransaction}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus className="h-5 w-5" />
          Nova Transação
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />

          <input
            type="text"
            placeholder="Pesquisar transações..."
            className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-12 pr-4 text-white outline-none transition focus:border-blue-500"
          />
        </div>

        <button
          type="button"
          className="inline-flex h-12 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
        >
          <Filter className="h-5 w-5" />
          Filtros
        </button>
      </div>
    </section>
  );
}