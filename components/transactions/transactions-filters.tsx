"use client";

import { CalendarDays, Filter, RotateCcw, Search } from "lucide-react";

export function TransactionsFilters() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-blue-400" />

        <h2 className="text-lg font-semibold text-white">
          Filtros
        </h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />

          <input
            type="text"
            placeholder="Pesquisar transações..."
            className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-12 pr-4 text-white outline-none transition focus:border-blue-500"
          />
        </div>

        <select className="h-12 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none transition focus:border-blue-500">
          <option>Todos os tipos</option>
          <option>Receitas</option>
          <option>Despesas</option>
        </select>

        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />

          <input
            type="date"
            className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-12 pr-4 text-white outline-none transition focus:border-blue-500"
          />
        </div>

        <button
          type="button"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-5 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900"
        >
          <RotateCcw className="h-4 w-4" />
          Limpar
        </button>
      </div>
    </section>
  );
}