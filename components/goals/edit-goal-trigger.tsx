"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { GoalForm } from "@/components/goals/goal-form";
import { updateGoalAction } from "@/app/actions/goals";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Goal } from "@/lib/goals";

type Props = {
  goal: Goal;
};

export function EditGoalTrigger({ goal }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-500/10 hover:text-violet-400"
        title="Editar meta"
      >
        <Pencil className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Editar Meta</SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <GoalForm
              action={updateGoalAction}
              goal={goal}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
