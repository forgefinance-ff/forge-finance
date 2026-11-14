import { Trash2 } from "lucide-react";

import { deleteGoalAction } from "@/app/actions/goals";
import { EditGoalTrigger } from "@/components/goals/edit-goal-trigger";
import { GoalForm } from "@/components/goals/goal-form";
import { formatDateBR } from "@/lib/dates";
import { getGoals } from "@/lib/goals";

export default async function MetasPage() {
  const goals = await getGoals();

  return (
    <div className="space-y-8">
      <div className="pt-2 pb-2">

        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          Metas
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Acompanhe seus objetivos financeiros.
        </p>
      </div>

      <GoalForm />

      {/* Celular: um cartão por meta, sem rolar para o lado. */}
      <ul className="space-y-3 sm:hidden">
        {goals.length === 0 && (
          <li className="rounded-[22px] border border-line bg-surface p-6 text-center text-faint">
            Nenhuma meta cadastrada.
          </li>
        )}

        {goals.map((goal) => {
          const percentage =
            goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0;
          const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

          return (
            <li key={goal.id} className="rounded-[22px] border border-line bg-surface p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{goal.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {money.format(goal.current_amount)} de {money.format(goal.target_amount)}
                  </p>
                </div>

                <div className="-mr-1 flex shrink-0 items-center">
                  <EditGoalTrigger goal={goal} />

                  <form action={deleteGoalAction}>
                    <input type="hidden" name="id" value={goal.id} />

                    <button
                      type="submit"
                      aria-label={`Excluir a meta ${goal.title}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-faint transition hover:bg-rose-500/10 hover:text-danger"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-tint-strong">
                <div className="h-full rounded-full bg-brand transition" style={{ width: `${percentage}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{percentage.toFixed(1)}%</span>
                <span>{goal.deadline ? `Prazo: ${formatDateBR(goal.deadline)}` : "Sem prazo"}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-hidden rounded-[22px] border border-line bg-surface sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
          <thead className="border-b border-line">
            <tr className="text-left text-muted-foreground">
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
                  className="p-6 text-center text-faint"
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
                  className="border-b border-line transition hover:bg-tint"
                >
                  <td className="p-4">
                    <div className="font-medium text-foreground">
                      {goal.title}
                    </div>

                    <div className="mt-1 text-sm text-muted-foreground">
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
                    <div className="h-2 w-full overflow-hidden rounded-full bg-tint-strong">
                      <div
                        className="h-full rounded-full bg-brand transition"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </div>
                  </td>

                  <td className="p-4 text-text-soft">
                    {goal.deadline ? formatDateBR(goal.deadline) : "—"}
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
                          aria-label={`Excluir a meta ${goal.title}`}
                          className="rounded-lg p-2 text-faint transition hover:bg-rose-500/10 hover:text-danger"
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