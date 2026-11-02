export function ReportsHeader() {
  return (
    <div className="rounded-[22px] border border-line bg-surface p-8">
      <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
        Financeiro
      </span>

      <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
        Relatórios
      </h1>

      <p className="mt-2 max-w-xl text-muted-foreground">
        Analise receitas, despesas, patrimônio e a evolução financeira em
        um único lugar.
      </p>
    </div>
  );
}
