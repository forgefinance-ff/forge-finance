import { AssistantChat } from "@/components/assistant/assistant-chat";
import { getAiStatus } from "@/lib/ai/config";
import { STANDARD_QUESTIONS } from "@/lib/ai/questions";
import { getActiveScope } from "@/lib/scope-server";

export default async function AssistentePage() {
  const scope = await getActiveScope();
  const ai = getAiStatus();

  return (
    <div className="space-y-6">
      <div className="rounded-[22px] border border-line bg-surface p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          Forge Intelligence
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          Assistente IA
        </h1>

        <p className="mt-2 max-w-2xl text-muted-foreground">
          Peça análises completas dos seus dados: comparações entre meses, onde cortar gastos,
          metas, vencimentos{scope === "business" ? " e o limite do MEI" : ""}. O assistente só
          consulta, nunca altera seus registros. Cada pergunta usa 1 consulta da sua cota mensal.
        </p>
      </div>

      <AssistantChat configured={ai.configured} questions={STANDARD_QUESTIONS[scope]} />
    </div>
  );
}
