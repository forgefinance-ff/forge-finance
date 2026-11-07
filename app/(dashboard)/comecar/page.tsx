import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  ListIcon,
  MessageCircleIcon,
  MonitorIcon,
  PhoneIcon,
  RotateCcwIcon,
  SparklesIcon,
  TargetIcon,
  UploadIcon,
} from "lucide-react";

import { skipGuide } from "@/app/actions/guide";
import { setWhatsappDefaultAccount } from "@/app/actions/whatsapp";
import { Button } from "@/components/ui/button";
import { WaitForStep } from "@/components/guide/wait-for-step";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { getAccounts } from "@/lib/accounts";
import { ensureLinkCode, formatBotNumber, getGuideProgress, type GuideProgress } from "@/lib/guide";
import { createClient } from "@/lib/supabase/server";
import { botNumber } from "@/lib/whatsapp/onboarding";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Primeiros passos · Forge Finance" };

const panel = "rounded-[22px] border border-line bg-surface p-6";
const greenButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-semibold text-white transition hover:bg-emerald-500";

function wa(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function StepHeader({
  n,
  title,
  done,
  current,
}: {
  n: number;
  title: string;
  done: boolean;
  current: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          done
            ? "bg-emerald-500 text-white"
            : current
              ? "bg-violet-600 text-white ring-4 ring-violet-500/20"
              : "bg-tint-strong text-muted-foreground"
        )}
      >
        {done ? <CheckIcon className="h-4 w-4" strokeWidth={3} /> : n}
      </span>
      <h2 className={cn("text-lg font-semibold", done ? "text-muted-foreground" : "text-foreground")}>
        {title}
        {done && <span className="ml-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">feito</span>}
      </h2>
    </div>
  );
}

function SubSteps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-text-soft">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] font-semibold text-muted-foreground">
            {String.fromCharCode(97 + i)}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

const GUIDE = [
  {
    icon: LayoutDashboardIcon,
    title: "Painel",
    href: "/dashboard",
    text: "Seu saldo, quanto entrou e saiu no mês e o que vence nos próximos dias.",
  },
  {
    icon: ListIcon,
    title: "Transações",
    href: "/transacoes",
    text: "Tudo o que você lançou (pelo app ou pelo WhatsApp). Dá para editar, filtrar e apagar.",
  },
  {
    icon: CreditCardIcon,
    title: "Contas e cartões",
    href: "/contas",
    text: "Cadastre seu banco e seu cartão para o Forge separar o saldo de cada um e a fatura.",
  },
  {
    icon: TargetIcon,
    title: "Metas",
    href: "/metas",
    text: "Crie uma meta (ex.: Viagem, R$ 5 mil) e vá guardando. Pelo WhatsApp: “guarda 200 na meta Viagem”.",
  },
  {
    icon: UploadIcon,
    title: "Importar extrato",
    href: "/importar",
    text: "Suba o extrato do banco (OFX ou CSV) e traga meses de histórico de uma vez.",
  },
  {
    icon: SparklesIcon,
    title: "Assistente IA",
    href: "/assistente",
    text: "Pergunte qualquer coisa sobre seu dinheiro: “onde estou gastando mais?”.",
  },
];

export default async function GuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const progress = await getGuideProgress(user.id);
  if (progress.mode === "free") return <FreeGuide progress={progress} />;

  const number = botNumber();
  const code = progress.whatsapp ? null : await ensureLinkCode(user.id);
  const accounts = progress.whatsapp && !progress.defaultAccount ? await getAccounts({ allScopes: true }) : [];

  const current = !progress.whatsapp ? 1 : !progress.firstEntry ? 2 : !progress.defaultAccount ? 3 : 0;
  const waiting = current === 1 || current === 2;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {waiting && <WaitForStep />}

      <ProgressHero
        progress={progress}
        title={progress.complete ? "Tudo pronto! 🎉" : "Vamos deixar seu Forge pronto"}
        text={
          progress.complete
            ? "Agora é só mandar seus gastos pelo WhatsApp. Abaixo tem um resumo de cada parte do app."
            : "São 3 passos e leva uns 2 minutos. O mais importante é o primeiro: conectar seu WhatsApp, porque é por lá que você vai registrar quase tudo."
        }
      />

      {/* Passo 1: conectar o WhatsApp */}
      <section className={cn(panel, current === 1 && "border-violet-500/40 shadow-[0_20px_60px_-30px_rgba(124,58,237,0.6)]")}>
        <StepHeader n={1} title="Conecte seu WhatsApp" done={progress.whatsapp} current={current === 1} />

        {!progress.whatsapp && number && code && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Assim o Forge reconhece que as mensagens vêm de você. É só mandar um código pelo WhatsApp que você
              quer usar.
            </p>

            {/* Celular */}
            <div className="md:hidden">
              <SubSteps
                items={[
                  <>Toque no botão verde abaixo. O WhatsApp abre com a mensagem já escrita.</>,
                  <>
                    Toque em <strong>enviar</strong> (a setinha). Não precisa mudar nada no texto.
                  </>,
                  <>Volte para esta tela. Ela atualiza sozinha e o passo 1 fica verde.</>,
                ]}
              />
              <a href={wa(number, `VINCULAR ${code}`)} className={cn(greenButton, "mt-5 w-full")}>
                <MessageCircleIcon className="h-5 w-5" /> Abrir o WhatsApp
              </a>
            </div>

            {/* Computador */}
            <div className="hidden md:block">
              <SubSteps
                items={[
                  <>
                    Pegue o <strong>celular</strong> e abra o WhatsApp.
                  </>,
                  <>
                    Comece uma conversa com o número do Forge:{" "}
                    <strong className="whitespace-nowrap text-foreground">{formatBotNumber(number)}</strong>
                  </>,
                  <>Mande exatamente esta mensagem:</>,
                ]}
              />
              <p className="ml-8 mt-3 inline-block rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 font-mono text-2xl tracking-widest text-foreground">
                VINCULAR {code}
              </p>
              <p className="ml-8 mt-3 text-sm text-muted-foreground">
                Esta tela atualiza sozinha quando a mensagem chegar. O código vale 15 minutos; se passar, é só
                recarregar a página para ganhar outro.
              </p>
              <p className="ml-8 mt-3 text-sm text-muted-foreground">
                Usa o WhatsApp Web neste computador?{" "}
                <a href={wa(number, `VINCULAR ${code}`)} target="_blank" rel="noreferrer" className="font-medium text-brand-soft underline underline-offset-4">
                  Abrir com a mensagem pronta
                </a>
              </p>
            </div>

            <p className="mt-5 flex items-center gap-2 rounded-xl bg-tint px-4 py-3 text-xs text-muted-foreground">
              <RotateCcwIcon className="h-4 w-4 shrink-0" />
              Esperando sua mensagem… Se não ficar verde em 1 minuto, confira se mandou do número certo e se o
              código está igual.
            </p>
          </>
        )}

        {!progress.whatsapp && (!number || !code) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Abra a página <Link href="/whatsapp" className="font-medium text-brand-soft underline">WhatsApp</Link> para
            conectar.
          </p>
        )}
      </section>

      {/* Passo 2: primeiro lançamento */}
      <section className={cn(panel, current === 2 && "border-violet-500/40 shadow-[0_20px_60px_-30px_rgba(124,58,237,0.6)]")}>
        <StepHeader n={2} title="Mande seu primeiro gasto" done={progress.firstEntry} current={current === 2} />

        {!progress.firstEntry && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Escreva do jeito que você falaria com um amigo. O Forge entende valor, categoria e data sozinho.
            </p>
            <SubSteps
              items={[
                <>
                  Na conversa com o Forge, mande algo como <strong>“gastei 25 no almoço”</strong>. Também vale
                  áudio: segure o microfone e fale.
                </>,
                <>
                  O Forge responde <strong>“Registrado! ✍️”</strong> com um botão <strong>↩️ Desfazer</strong>, caso
                  tenha errado.
                </>,
                <>Pronto: o gasto já aparece no seu painel.</>,
              ]}
            />
            {current === 2 && number && (
              <a href={wa(number, "gastei 25 no almoço")} target="_blank" rel="noreferrer" className={cn(greenButton, "mt-5 w-full sm:w-auto")}>
                <MessageCircleIcon className="h-5 w-5" /> Testar agora no WhatsApp
              </a>
            )}
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {["recebi 1500 de salário", "paguei 80 de uber ontem", "qual meu saldo?"].map((example) => (
                <span key={example} className="rounded-xl border border-line bg-tint px-3 py-2 text-xs text-text-soft">
                  “{example}”
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Passo 3: conta padrão */}
      <section className={cn(panel, current === 3 && "border-violet-500/40 shadow-[0_20px_60px_-30px_rgba(124,58,237,0.6)]")}>
        <StepHeader n={3} title="Escolha sua conta principal" done={progress.defaultAccount} current={current === 3} />

        {!progress.defaultAccount && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Quando você não disser o banco na mensagem, o Forge lança nesta conta. Você ainda pode falar “no Nubank”
              ou “no cartão” quando quiser outra.
            </p>

            {current === 3 && accounts.length > 0 && (
              <form action={setWhatsappDefaultAccount} className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  name="account_id"
                  required
                  defaultValue=""
                  className="h-11 rounded-xl border border-line bg-background-soft px-4 text-foreground outline-none transition focus:border-violet-500"
                >
                  <option value="" disabled>
                    Escolha a conta
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <Button type="submit">Salvar</Button>
              </form>
            )}

            {current === 3 && accounts.length === 0 && (
              <Link href="/contas" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-soft">
                Cadastrar minha primeira conta <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </>
        )}
      </section>

      <InstallAppCard />

      <AppTour />

      {!progress.complete && (
        <form action={skipGuide} className="text-center">
          <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Fazer depois
          </button>
        </form>
      )}

      {progress.complete && <DoneButton />}
    </div>
  );
}

function DoneButton() {
  return (
    <div className="text-center">
      <Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-6 font-semibold text-white hover:bg-violet-500">
        Ir para o painel <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ProgressHero({ progress, title, text }: { progress: GuideProgress; title: string; text: string }) {
  return (
    <div className={cn(panel, "p-8")}>
      <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">Primeiros passos</span>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text}</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-tint-strong">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all"
          style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {progress.done} de {progress.total} concluídos
      </p>
    </div>
  );
}

/** Plano grátis (cobrança ligada): tudo pelo app; o WhatsApp aparece como convite ao Pro. */
function FreeGuide({ progress }: { progress: GuideProgress }) {
  const current = !progress.hasAccount ? 1 : !progress.firstEntry ? 2 : 0;
  const highlight = "border-violet-500/40 shadow-[0_20px_60px_-30px_rgba(124,58,237,0.6)]";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ProgressHero
        progress={progress}
        title={progress.complete ? "Tudo pronto! 🎉" : "Vamos deixar seu Forge pronto"}
        text={
          progress.complete
            ? "Seu Forge já está funcionando. Abaixo tem um resumo de cada parte do app."
            : "São 2 passos rápidos para você ver seu dinheiro organizado no painel."
        }
      />

      <section className={cn(panel, current === 1 && highlight)}>
        <StepHeader n={1} title="Cadastre sua conta principal" done={progress.hasAccount} current={current === 1} />
        {!progress.hasAccount && (
          <>
            <SubSteps
              items={[
                <>Abra Contas e toque em adicionar.</>,
                <>
                  Dê um nome (ex.: <strong>Nubank</strong>) e coloque o saldo que tem hoje.
                </>,
                <>Salve e volte aqui.</>,
              ]}
            />
            <Link href="/contas" className={cn(greenButton, "mt-5 w-full bg-violet-600 hover:bg-violet-500 sm:w-auto")}>
              Cadastrar minha conta <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        )}
      </section>

      <section className={cn(panel, current === 2 && highlight)}>
        <StepHeader n={2} title="Registre seu primeiro lançamento" done={progress.firstEntry} current={current === 2} />
        {!progress.firstEntry && (
          <>
            <SubSteps
              items={[
                <>Abra Transações e toque em nova transação.</>,
                <>Escolha se é gasto ou receita, o valor, a categoria e a conta.</>,
                <>Salve: ele já aparece no painel.</>,
              ]}
            />
            {current === 2 && (
              <Link href="/transacoes" className={cn(greenButton, "mt-5 w-full bg-violet-600 hover:bg-violet-500 sm:w-auto")}>
                Registrar agora <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </>
        )}
      </section>

      <section className="rounded-[22px] border border-emerald-500/30 bg-emerald-500/[0.06] p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <MessageCircleIcon className="h-4 w-4" /> Forge Pro
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Prefere só mandar uma mensagem?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No Forge Pro você registra gastos pelo WhatsApp, por texto ou áudio: “gastei 45 no mercado” e pronto. Sem
          abrir o app.
        </p>
        <Link href="/assinar?plano=anual" className={cn(greenButton, "mt-4 h-11 text-sm")}>
          Conhecer o Forge Pro <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </section>

      <InstallAppCard />

      <AppTour />

      {!progress.complete && (
        <form action={skipGuide} className="text-center">
          <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Fazer depois
          </button>
        </form>
      )}

      {progress.complete && <DoneButton />}
    </div>
  );
}

function AppTour() {
  return (
      <section className={panel}>
        <h2 className="text-lg font-semibold text-foreground">Conheça o resto do Forge</h2>
        <p className="mt-1 text-sm text-muted-foreground">Toque em qualquer parte para abrir.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GUIDE.map(({ icon: Icon, title, href, text }) => (
            <Link
              key={href}
              href={href}
              className="group flex gap-3 rounded-2xl border border-line bg-tint p-4 transition hover:border-violet-500/40"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-soft" />
              <span>
                <span className="block text-sm font-semibold text-foreground">{title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{text}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-line p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PhoneIcon className="h-4 w-4 text-brand-soft" /> No WhatsApp você também pode
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm text-text-soft sm:grid-cols-2">
            <li>“desfazer”: apaga o último registro</li>
            <li>“quanto gastei com mercado esse mês?”</li>
            <li>“o que vence essa semana?”</li>
            <li>“ajuda”: lista tudo o que dá para pedir</li>
          </ul>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <MonitorIcon className="h-4 w-4" /> Você pode voltar a este guia quando quiser pelo menu, em Primeiros
          passos.
        </p>
      </section>
  );
}
