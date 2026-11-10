import { cn } from "@/lib/utils";

/** Cartão padrão do Raio-X (mesmo visual dos painéis de Gestão). */
export function RxCard({
  title,
  description,
  badge,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-[22px] border border-line bg-surface p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-xs text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** Frase de leitura automática ("o que isso quer dizer"). */
export function RxInsight({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-2.5 rounded-2xl border border-brand/25 bg-brand/[0.07] px-3.5 py-2.5 text-sm text-text-soft">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-bright shadow-[0_0_10px_var(--brand-bright)]" />
      <p>{children}</p>
    </div>
  );
}
