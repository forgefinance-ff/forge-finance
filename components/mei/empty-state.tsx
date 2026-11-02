type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <div className="relative mb-5">
        <span
          aria-hidden
          className="absolute -inset-3 rounded-full bg-brand/20 blur-xl"
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-bright/30 bg-brand/15 text-brand-soft">
          <Icon className="h-7 w-7" />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>

      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
