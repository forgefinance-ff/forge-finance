import { deleteGoalAction } from "@/app/actions/goals";
import { GoalForm } from "@/components/goals/goal-form";
import { getGoals } from "@/lib/goals";

export default async function MetasPage() {
  const goals = await getGoals();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Metas
        </h1>

        <p className="mt-2 text-slate-400">
          Acompanhe seus objetivos financeiros.
        </p>
      </div>

      <GoalForm />

      <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr className="text-left text-slate-400">
              <th className="p-4">Meta</th>
              <th className="p-4">Progresso</th>
              <th className="p-4">Prazo</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>

          <tbody>
            {goals.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-slate-500"
                >
                  Nenhuma meta cadastrada.
                </td>
              </tr>
            )}

            {goals.map((goal) => {
              const percentage =
                goal.target_amount > 0
                  ? Math.min(
                      (goal.current_amount / goal.target_amount) * 100,
                      100
                    )
                  : 0;

              return (
                <tr
                  key={goal.id}
                  className="border-b border-white/5"
                >
                  <td className="p-4">
                    <div className="font-medium text-white">
                      {goal.title}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(goal.current_amount)}
                      {" / "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(goal.target_amount)}
                    </div>
                  </td>

                  <td className="p-4 w-80">
                    <div className="h-3 w-full rounded-full bg-slate-700">
                      <div
                        className="h-3 rounded-full bg-violet-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="mt-2 text-sm text-slate-400">
                      {percentage.toFixed(1)}%
                    </div>
                  </td>

                  <td className="p-4 text-slate-300">
                    {new Date(goal.deadline).toLocaleDateString("pt-BR")}
                  </td>

                  <td className="p-4">
                    <form action={deleteGoalAction}>
                      <input
                        type="hidden"
                        name="id"
                        value={goal.id}
                      />

                      <button
                        className="text-red-400 hover:text-red-300"
                      >
                        Excluir
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}