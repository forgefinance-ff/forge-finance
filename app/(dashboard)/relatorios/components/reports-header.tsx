import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type Props = {
  /** Link do relatório completo, já com o período escolhido. */
  exportHref?: string;
};

export function ReportsHeader({ exportHref = "/relatorio-completo" }: Props) {
  return (
    <div className="flex flex-col gap-4 pt-2 pb-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          Relatórios
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Analise receitas, despesas, patrimônio e a evolução financeira em
          um único lugar.
        </p>
      </div>

      <Link href={exportHref} className={buttonVariants({ variant: "default" })}>
        Exportar relatório completo
      </Link>
    </div>
  );
}
