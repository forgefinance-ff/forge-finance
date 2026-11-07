"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  CompassIcon,
  DownloadIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  MonitorIcon,
  SquarePlusIcon,
  ShareIcon,
  SmartphoneIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { INSTALLED_KEY, promptInstall, useInstallState, type Platform } from "./install-store";

const TABS: { id: Platform; label: string; icon: typeof SmartphoneIcon }[] = [
  { id: "ios", label: "iPhone", icon: SmartphoneIcon },
  { id: "android", label: "Android", icon: SmartphoneIcon },
  { id: "desktop", label: "Computador", icon: MonitorIcon },
];

/** Ícone "como aparece na tela", para a pessoa achar o botão certo. */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-line bg-tint-strong px-1.5 py-0.5 align-middle text-xs font-semibold text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
      {children}
    </span>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-text-soft">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text-soft">{children}</p>
  );
}

function IosSteps({ notSafari }: { notSafari: boolean }) {
  return (
    <div className="space-y-4">
      {notSafari && (
        <Note>
          Para funcionar melhor, abra este site no <strong>Safari</strong> <CompassIcon className="inline h-4 w-4" /> e
          siga os passos abaixo.
        </Note>
      )}
      <Steps
        items={[
          <>
            Toque no botão <strong>Compartilhar</strong>{" "}
            <Key>
              <ShareIcon />
            </Key>{" "}
            (o quadrado com uma seta para cima). Se não aparecer, toque primeiro nos três pontinhos{" "}
            <Key>
              <EllipsisIcon />
            </Key>{" "}
            ao lado do endereço do site.
          </>,
          <>
            Role a lista para baixo e toque em{" "}
            <Key>
              <SquarePlusIcon /> Adicionar à Tela de Início
            </Key>
            .
          </>,
          <>
            Deixe ligada a opção <strong>Abrir como App Web</strong> (se aparecer) e toque em{" "}
            <strong>Adicionar</strong> no canto de cima.
          </>,
          <>Pronto! O ícone do Forge aparece na sua tela inicial. Abra sempre por ele.</>,
        ]}
      />
    </div>
  );
}

function AndroidSteps({ samsung }: { samsung: boolean }) {
  if (samsung) {
    return (
      <Steps
        items={[
          <>
            Toque no menu{" "}
            <Key>☰</Key> na barra de baixo do navegador.
          </>,
          <>
            Toque em <strong>Adicionar página a</strong> e depois em <strong>Tela inicial</strong>.
          </>,
          <>
            Confirme em <strong>Adicionar</strong>. O ícone do Forge aparece na sua tela inicial.
          </>,
        ]}
      />
    );
  }

  return (
    <Steps
      items={[
        <>
          No Chrome, toque nos três pontinhos{" "}
          <Key>
            <EllipsisVerticalIcon />
          </Key>{" "}
          no canto de cima.
        </>,
        <>
          Toque em{" "}
          <Key>
            <DownloadIcon /> Instalar app
          </Key>{" "}
          ou <strong>Adicionar à tela inicial</strong>.
        </>,
        <>
          Confirme em <strong>Instalar</strong>. O ícone do Forge aparece junto com seus outros apps.
        </>,
      ]}
    />
  );
}

function DesktopSteps({ browser }: { browser: string }) {
  if (browser === "safari") {
    return (
      <Steps
        items={[
          <>
            No Safari do Mac, clique em <strong>Arquivo</strong> na barra de menus lá em cima.
          </>,
          <>
            Clique em <strong>Adicionar ao Dock</strong> e depois em <strong>Adicionar</strong>.
          </>,
          <>O Forge vira um app no seu Dock e na pasta Aplicativos.</>,
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      {browser === "firefox" && (
        <Note>
          O Firefox não instala sites como app. Abra o Forge no <strong>Chrome</strong> ou no <strong>Edge</strong>.
        </Note>
      )}
      <Steps
        items={[
          <>
            Na barra de endereço, clique no ícone{" "}
            <Key>
              <DownloadIcon />
            </Key>{" "}
            <strong>Instalar</strong> (fica no canto direito, perto da estrelinha).
          </>,
          <>
            Não achou? Clique nos três pontinhos{" "}
            <Key>
              <EllipsisVerticalIcon />
            </Key>{" "}
            do navegador e procure <strong>Instalar Forge Finance</strong> (no Chrome fica em{" "}
            <em>Transmitir, salvar e compartilhar</em>; no Edge, em <em>Apps</em>).
          </>,
          <>
            Clique em <strong>Instalar</strong>. O Forge abre em uma janela própria e ganha atalho na área de
            trabalho e no menu Iniciar.
          </>,
        ]}
      />
    </div>
  );
}

/**
 * Instrução completa de como colocar o Forge na tela inicial, já aberta no aparelho
 * que a pessoa está usando. Onde o navegador deixa (Android/PC), mostra o botão de
 * instalar com um toque.
 */
export function InstallGuide({ onInstalled }: { onInstalled?: () => void }) {
  const install = useInstallState();
  const [tab, setTab] = useState<Platform | null>(null);
  const active = tab ?? install.platform;

  if (install.installed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-text-soft">
        <CheckIcon className="h-5 w-5 shrink-0 text-emerald-500" />
        Você já está usando o Forge como app. Tudo certo!
      </div>
    );
  }

  const onThisDevice = active === install.platform;

  return (
    <div className="space-y-5">
      {install.canPrompt && onThisDevice && (
        <button
          type="button"
          onClick={async () => {
            if (await promptInstall()) onInstalled?.();
          }}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-base font-semibold text-white shadow-[0_12px_40px_-12px_rgba(124,58,237,0.8)] transition hover:bg-violet-500"
        >
          <DownloadIcon className="h-5 w-5" /> Instalar agora
        </button>
      )}

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-tint-strong p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm",
              active === id ? "bg-surface-solid text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {install.canPrompt && onThisDevice && (
        <p className="text-xs text-muted-foreground">Se o botão acima não funcionar, faça pelo menu:</p>
      )}

      {active === "ios" && <IosSteps notSafari={onThisDevice && install.browser !== "safari"} />}
      {active === "android" && (
        <div className="space-y-4">
          {onThisDevice && install.browser === "inapp" && (
            <Note>
              Você abriu o Forge dentro de outro app. Toque nos três pontinhos e escolha{" "}
              <strong>Abrir no Chrome</strong> (ou no navegador) antes de seguir.
            </Note>
          )}
          <AndroidSteps samsung={onThisDevice && install.browser === "samsung"} />
        </div>
      )}
      {active === "desktop" && <DesktopSteps browser={onThisDevice ? install.browser : "chrome"} />}
    </div>
  );
}

/** true se o aparelho já tem o app (ou a pessoa disse que instalou). */
export function useProbablyInstalled() {
  const install = useInstallState();
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    try {
      setMarked(localStorage.getItem(INSTALLED_KEY) === "1");
    } catch {}
  }, []);

  return { ready: install.ready, installed: install.installed || marked };
}

export function markInstalled() {
  try {
    localStorage.setItem(INSTALLED_KEY, "1");
  } catch {}
}
