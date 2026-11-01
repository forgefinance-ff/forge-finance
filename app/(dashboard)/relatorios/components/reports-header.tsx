export function ReportsHeader() {
  return (
    <div className="rounded-[22px] border border-white/[0.07] bg-surface p-8">
      <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
        Financeiro
      </span>

      <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
        Relatórios
      </h1>

      <p className="mt-2 max-w-xl text-slate-400">
        Analise receitas, despesas, patrimônio e a evolução financeira em
        um único lugar.
      </p>
    </div>
  );
}
