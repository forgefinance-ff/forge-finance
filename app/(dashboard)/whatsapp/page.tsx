import {
  generateWhatsappCode,
  setWhatsappDefaultAccount,
  unlinkWhatsapp,
} from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { getAccounts } from "@/lib/accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const panel = "rounded-[22px] border border-line bg-surface p-6";

function maskPhone(phone: string) {
  return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} •••••${phone.slice(-4)}`;
}

export default async function WhatsappPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: link } = await supabase
    .from("whatsapp_links")
    .select("phone, default_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const accounts = link ? await getAccounts() : [];

  const { data: codeRow } = link
    ? { data: null }
    : await createAdminClient()
        .from("whatsapp_link_codes")
        .select("code, expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      <div className="rounded-[22px] border border-line bg-surface p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          Integrações
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          WhatsApp
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Registre gastos e receitas mandando um texto ou um áudio. Você sempre
          confirma antes de salvar.
        </p>
      </div>

      {link ? (
        <>
          <section className={panel}>
            <h2 className="text-lg font-semibold text-foreground">Número vinculado</h2>
            <p className="mt-1 text-text-soft">{maskPhone(link.phone)}</p>

            <p className="mt-4 text-sm text-muted-foreground">
              Exemplos: “gastei 45 no mercado”, “recebi 1500 de freelance”,
              “ontem paguei 80 de uber”. Também funciona por áudio.
            </p>

            <form action={unlinkWhatsapp} className="mt-5">
              <Button type="submit" variant="outline" size="sm">
                Desvincular número
              </Button>
            </form>
          </section>

          <section className={panel}>
            <h2 className="text-lg font-semibold text-foreground">Conta padrão</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Usada quando você não citar a conta na mensagem.
            </p>

            <form
              action={setWhatsappDefaultAccount}
              className="mt-4 flex flex-wrap items-center gap-3"
            >
              <select
                name="account_id"
                defaultValue={link.default_account_id ?? ""}
                className="rounded-xl border border-line bg-background-soft px-4 py-3 text-foreground outline-none transition focus:border-violet-500"
              >
                <option value="">Nenhuma (perguntar sempre)</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm">
                Salvar
              </Button>
            </form>
          </section>
        </>
      ) : (
        <section className={panel}>
          <h2 className="text-lg font-semibold text-foreground">Vincular seu número</h2>

          {codeRow ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Envie esta mensagem, do WhatsApp que você quer vincular, para o
                número do Forge Finance. O código vale por 15 minutos.
              </p>

              <p className="inline-block rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 font-mono text-2xl tracking-widest text-foreground">
                VINCULAR {codeRow.code}
              </p>

              {botNumber && (
                <div>
                  <a
                    href={`https://wa.me/${botNumber}?text=${encodeURIComponent(
                      `VINCULAR ${codeRow.code}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-brand-soft underline underline-offset-4"
                  >
                    Abrir no WhatsApp
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Gere um código e envie para o número do Forge Finance no WhatsApp.
            </p>
          )}

          <form action={generateWhatsappCode} className="mt-5">
            <Button type="submit" size="sm">
              {codeRow ? "Gerar novo código" : "Gerar código"}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
