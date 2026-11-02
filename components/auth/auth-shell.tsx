import Image from "next/image";

type AuthShellProps = {
  subtitle: string;
  children: React.ReactNode;
};

/**
 * Moldura das telas de login/cadastro. Sempre escura (a classe "dark" aqui
 * redefine os tokens só para este painel, nos dois temas), com grade fina e
 * focos de luz roxo/azul animados em CSS.
 */
export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <main className="forge-auth dark flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
      <div aria-hidden className="forge-auth-orb forge-auth-orb--violet" />
      <div aria-hidden className="forge-auth-orb forge-auth-orb--indigo" />
      <div aria-hidden className="forge-auth-grid" />

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo-forge.png"
            alt="Forge Finance — Controle. Planeje. Conquiste."
            width={906}
            height={785}
            priority
            sizes="(max-width: 640px) 240px, 300px"
            className="h-auto w-60 drop-shadow-[0_0_40px_rgba(124,58,237,0.35)] sm:w-[300px]"
          />

          <p className="mt-5 text-sm text-zinc-400">{subtitle}</p>
        </div>

        {children}
      </div>
    </main>
  );
}
