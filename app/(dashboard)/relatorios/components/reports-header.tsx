export function ReportsHeader() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>

        <p className="text-muted-foreground">
          Analise receitas, despesas, patrimônio e a evolução financeira da sua
          empresa em um único lugar.
        </p>
      </div>
    </div>
  );
}