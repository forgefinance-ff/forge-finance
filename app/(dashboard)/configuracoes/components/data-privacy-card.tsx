"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";

import { deleteMyAccount } from "@/app/actions/account";
import { Button, buttonVariants } from "@/components/ui/button";

/** LGPD: baixar todos os dados e excluir a conta. */
export function DataPrivacyCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await deleteMyAccount(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/?conta=excluida");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="text-lg font-semibold text-foreground">
        Seus dados
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Os dados são seus. Baixe uma cópia completa quando quiser ou exclua a conta.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/api/account/export" download className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Baixar meus dados (JSON)
        </a>
        {!open && (
          <Button
            variant="ghost"
            className="min-h-11 text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Excluir minha conta
          </Button>
        )}
      </div>

      {open && (
        <form action={submit} className="mt-5 space-y-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-foreground">
            Isto apaga a conta e <strong>todos</strong> os lançamentos, contas, cartões, metas e o vínculo com o
            WhatsApp. <strong>Não dá para desfazer.</strong> Se quiser, baixe seus dados antes.
          </p>
          <div>
            <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-medium text-text-soft">
              Digite EXCLUIR para confirmar
            </label>
            <input
              id="delete-confirm"
              name="confirm"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none focus:border-danger focus:ring-2 focus:ring-danger/20"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              className="min-h-11"
              disabled={pending || confirm.trim().toUpperCase() !== "EXCLUIR"}
            >
              {pending ? "Excluindo..." : "Excluir conta para sempre"}
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
