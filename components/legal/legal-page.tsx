import { ThemeToggle } from "@/components/theme-toggle";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type Props = {
  title: string;
  updated: string;
  email: string;
  sections: LegalSection[];
};

/** Layout das páginas legais (Termos de Uso e Política de Privacidade). */
export function LegalPage({ title, updated, email, sections }: Props) {
  return (
    <main className="relative isolate min-h-screen px-4 py-12 text-text-soft">
      <div aria-hidden className="forge-backdrop" />

      <div className="mx-auto max-w-3xl space-y-6">
        <header className="relative rounded-[22px] border border-line bg-surface p-8">
          <ThemeToggle className="absolute right-5 top-5" />

          <h1 className="pr-12 text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">{title}</h1>

          <p className="mt-2 text-muted-foreground">Última atualização: {updated}</p>
        </header>

        {sections.map((section) => (
          <section key={section.title} className="rounded-[22px] border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>

            {section.paragraphs?.map((text) => (
              <p key={text} className="mt-3 leading-relaxed">
                {text}
              </p>
            ))}

            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="pb-6 text-center text-sm text-faint">
          <a href={`mailto:${email}`} className="underline underline-offset-4 hover:text-text-soft">
            {email}
          </a>
        </p>
      </div>
    </main>
  );
}
