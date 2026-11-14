import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-faint">Erro 404</p>
      <h1 className="text-2xl font-semibold text-foreground">Essa página não existe.</h1>
      <p className="text-muted-foreground">O endereço pode ter mudado. Volte para o início e siga de lá.</p>
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center rounded-xl bg-foreground px-5 text-sm font-semibold text-background"
      >
        Ir para o início
      </Link>
    </main>
  );
}
