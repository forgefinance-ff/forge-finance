type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

/** Cabeçalho no mesmo padrão das telas atuais (Contas, Metas…). */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 pt-2 pb-2 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">

        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          {title}
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>
      </div>

      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}
