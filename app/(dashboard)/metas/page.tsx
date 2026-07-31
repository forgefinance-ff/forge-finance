import { Trash2 } from "lucide-react";

import { deleteGoalAction } from "@/app/actions/goals";
import { EditGoalTrigger } from "@/components/goals/edit-goal-trigger";
import { GoalForm } from "@/components/goals/goal-form";
import { getGoals } from "@/lib/goals";

export default async function MetasPage() {
  const goals = await getGoals();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-[#111827] p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Metas
        </h1>

        <p className="mt-2 max-w-xl text-slate-400">
          Acompanhe seus objetivos financeiros.
        </p>
      </div>

      <GoalForm />

      <div className="rounded-3xl border border-white/10 bg-[#111827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
          <thead className="border-b border-white/10">
            <tr className="text-left text-slate-400">
              <th className="p-4">Meta</th>
              <th className="p-4">Progresso</th>
              <th className="p-4">Prazo</th>
              <th className="p-4 text-right">Ações</th>
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
                  className="border-b border-white/5 transition hover:bg-white/[0.03]"
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
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
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

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditGoalTrigger goal={goal} />

                      <form action={deleteGoalAction}>
                        <input
                          type="hidden"
                          name="id"
                          value={goal.id}
                        />

                        <button
                          type="submit"
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}