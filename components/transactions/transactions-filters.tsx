"use client";

import { CalendarDays, Filter, RotateCcw, Search } from "lucide-react";

export type TransactionTypeFilter = "all" | "income" | "expense";

type TransactionsFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  type: TransactionTypeFilter;
  onTypeChange: (value: TransactionTypeFilter) => void;
  date: string;
  onDateChange: (value: string) => void;
  onReset: () => void;
};

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-[#09090B] px-4 text-white outline-none transition focus:border-violet-500";

export function TransactionsFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  date,
  onDateChange,
  onReset,
}: TransactionsFiltersProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-violet-400" />

        <h2 className="text-lg font-semibold text-white">Filtros</h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Pesquisar transações..."
            className={`${inputClass} pl-12`}
          />
        </div>

        <select
          value={type}
          onChange={(event) =>
            onTypeChange(event.target.value as TransactionTypeFilter)
          }
          className={inputClass}
        >
          <option value="all">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>

        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className={`${inputClass} pl-12`}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <RotateCcw className="h-4 w-4" />
          Limpar
        </button>
      </div>
    </section>
  );
}
