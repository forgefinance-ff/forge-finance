type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

/** Cabeçalho no mesmo padrão das telas atuais (Contas, Metas…). */
export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          {eyebrow}
        </span>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>
      </div>

      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}
