"use client";

import { ArrowUp, CreditCard, Mic, PieChart, Plus, Receipt, Store, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSlidingPill } from "@/components/motion";

import { Bubble, Typing, type ChatMessage } from "./chat";

type Demo = { chip: string; icon: LucideIcon; exchange: [ChatMessage, ChatMessage] };

const DEMOS: Demo[] = [
  {
    chip: "Anotar um gasto",
    icon: Receipt,
    exchange: [
      { from: "user", text: "paguei 38 no almoço" },
      {
        from: "bot",
        text: "Registrado! ✍️\n🔴 Almoço — *R$ 38,00*\nAlimentação • Nubank • hoje\n\nEsse mês em Alimentação: *R$ 412,00*",
        buttons: ["↩️ Desfazer"],
      },
    ],
  },
  {
    chip: "Mandar um áudio",
    icon: Mic,
    exchange: [
      { from: "user", audio: "gastei 45 no mercado" },
      {
        from: "bot",
        text: "🎙️ Entendi: “gastei 45 no mercado”\n\nRegistrado! ✍️\n🔴 Mercado — *R$ 45,00* • Alimentação",
        buttons: ["↩️ Desfazer"],
      },
    ],
  },
  {
    chip: "Ver quanto sobrou",
    icon: Wallet,
    exchange: [
      { from: "user", text: "quanto sobrou esse mês?" },
      {
        from: "bot",
        text: "Entraram *R$ 5.200* e saíram *R$ 3.870*.\nSobraram *R$ 1.330*, e faltam 12 dias para o mês acabar. 💜",
      },
    ],
  },
  {
    chip: "Gastos por categoria",
    icon: PieChart,
    exchange: [
      { from: "user", text: "onde eu mais gastei em outubro?" },
      {
        from: "bot",
        text: "Seus 3 maiores gastos em outubro:",
        bars: [
          { label: "Delivery", value: 100, display: "R$ 612" },
          { label: "Mercado", value: 88, display: "R$ 540" },
          { label: "Transporte", value: 51, display: "R$ 310" },
        ],
      },
    ],
  },
  {
    chip: "Compra parcelada",
    icon: CreditCard,
    exchange: [
      { from: "user", text: "comprei um tênis de 480 em 3x no cartão" },
      {
        from: "bot",
        text: "Confirmar?\n💳 Tênis — *R$ 480,00* em 3x de R$ 160,00\nVestuário • cartão Nubank\nVai para a fatura.",
        buttons: ["✅ Confirmar", "❌ Cancelar"],
      },
    ],
  },
  {
    chip: "Conta a receber (MEI)",
    icon: Store,
    exchange: [
      { from: "user", text: "conta a receber da Maria, 300, dia 15" },
      {
        from: "bot",
        text: "Confirmar?\n🟢 A receber: Maria — *R$ 300,00*\nVence dia 15 • 🏢 Empresa",
        buttons: ["✅ Confirmar", "❌ Cancelar"],
      },
    ],
  },
];

/** A demonstração do topo: um campo de mensagem com pedidos prontos para tocar. */
export function TryIt() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function play(demo: Demo) {
    if (timer.current) clearTimeout(timer.current);
    setCurrent(demo.chip);
    setMessages([demo.exchange[0]]);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages([demo.exchange[0], demo.exchange[1]]);
    }, 1200);
  }

  return (
    <div className="uv-stage__inner">
      {messages.length > 0 && (
        <div className="uv-reply" aria-live="polite">
          {messages.map((message, i) => (
            <div key={`${current}-${i}`} className={i === 1 ? "uv-bubble-in uv-bubble-in--bot" : "uv-bubble-in"}>
              <Bubble message={message} />
            </div>
          ))}
          {typing && <Typing />}
        </div>
      )}

      <div className="uv-composer" aria-hidden>
        <Plus />
        <span className="uv-composer__text">Mande um gasto para o Forge</span>
        <Mic />
        <span className="uv-composer__send">
          <ArrowUp />
        </span>
      </div>

      <div ref={containerRef} className="uv-tags relative justify-center" role="group" aria-label="Pedidos de exemplo">
        <span ref={pillRef} aria-hidden className="t-stretch-pill uv-tags__pill" style={{ opacity: 0 }} />
        {DEMOS.map((demo) => {
          const Icon = demo.icon;
          return (
            <button
              key={demo.chip}
              type="button"
              onClick={() => play(demo)}
              aria-pressed={current === demo.chip}
              data-active={current === demo.chip}
              className="uv-tag t-tab"
            >
              <Icon aria-hidden />
              {demo.chip}
            </button>
          );
        })}
      </div>

      <p className="uv-stage__note">Toque num pedido e veja o Forge resolver. Simulação com dados de exemplo.</p>
    </div>
  );
}
