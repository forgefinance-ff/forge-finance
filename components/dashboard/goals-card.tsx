import { Target } from "lucide-react";

const goals = [
  {
    title: "Reserva de Emergência",
    current: 8200,
    target: 15000,
  },
  {
    title: "Viagem",
    current: 3200,
    target: 5000,
  },
];

export function GoalsCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/15 p-3">
          <Target className="text-violet-400" size={20} />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white">
            Metas Financeiras
          </h3>

          <p className="text-sm text-slate-400">
            Acompanhe seu progresso
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {goals.map((goal) => {
          const progress = (goal.current / goal.target) * 100;

          return (
            <div key={goal.title}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-white">
                  {goal.title}
                </span>

                <span className="text-sm text-slate-400">
                  {progress.toFixed(0)}%
                </span>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-sm text-slate-400">
                <span>
                  {goal.current.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>

                <span>
                  {goal.target.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}