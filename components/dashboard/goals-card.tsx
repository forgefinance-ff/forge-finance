import Link from "next/link";
import { Target } from "lucide-react";

import type { Goal } from "@/lib/goals";

type GoalsCardProps = {
  goals: Goal[];
};

export function GoalsCard({ goals }: GoalsCardProps) {
  const visibleGoals = goals.slice(0, 3);

  return (
    <div className="flex flex-col rounded-[22px] border border-line bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3">
            <Target className="text-brand-soft" size={20} />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Metas Financeiras
            </h3>

            <p className="text-sm text-muted-foreground">
              Acompanhe seu progresso
            </p>
          </div>
        </div>
      </div>

      {visibleGoals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Você ainda não cadastrou nenhuma meta.
          </p>

          <Link
            href="/metas"
            className="mt-4 rounded-xl bg-gradient-to-r from-brand to-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
          >
            Criar primeira meta
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {visibleGoals.map((goal) => {
              const target = Number(goal.target_amount);
              const current = Number(goal.current_amount);

              const progress =
                target > 0
                  ? Math.min((current / target) * 100, 100)
                  : 0;

              return (
                <div key={goal.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {goal.title}
                    </span>

                    <span className="text-sm text-muted-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mb-3 h-2 overflow-hidden rounded-full bg-tint-strong">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {current.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>

                    <span>
                      {target.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href="/metas"
            className="mt-6 text-center text-sm font-medium text-brand-soft transition hover:text-brand-soft"
          >
            Ver todas as metas →
          </Link>
        </>
      )}
    </div>
  );
}
