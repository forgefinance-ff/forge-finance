export function DashboardChart() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <h2 className="text-xl font-semibold text-white">
        Fluxo Financeiro
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Em breve este gráfico será alimentado pelo Supabase.
      </p>

      <div className="mt-6 flex h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#09090B]">
        <span className="text-slate-500">
          Área do gráfico
        </span>
      </div>
    </div>
  );
}