"use client";

import { useSlidingPill } from "@/components/motion";
import { Briefcase, Coffee, CreditCard, Mic, Moon, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Bubble, Phone, type ChatMessage } from "./chat";
import { useReducedMotion } from "@/hooks/use-client-value";

type Moment = { time: string; title: string; text: string; icon: LucideIcon; chat: [ChatMessage, ChatMessage] };

const MOMENTS: Moment[] = [
  {
    time: "07:40",
    title: "Café na padaria",
    text: "Uma mensagem de 3 segundos enquanto espera o troco.",
    icon: Coffee,
    chat: [
      { from: "user", text: "café 12", time: "07:40" },
      { from: "bot", text: "Registrado! ✍️\n🔴 Café — *R$ 12,00* • Alimentação", buttons: ["↩️ Desfazer"], time: "07:40" },
    ],
  },
  {
    time: "12:30",
    title: "Almoço, por áudio",
    text: "Sem digitar nada: manda um áudio e pronto.",
    icon: Mic,
    chat: [
      { from: "user", audio: "almoço 38 no débito", time: "12:30" },
      { from: "bot", text: "🎙️ Entendi: “almoço 38 no débito”\nRegistrado! 🔴 *R$ 38,00* • Alimentação", buttons: ["↩️ Desfazer"], time: "12:30" },
    ],
  },
  {
    time: "15:20",
    title: "Cliente pagou",
    text: "Pessoal e Empresa (MEI) separados, no mesmo lugar.",
    icon: Briefcase,
    chat: [
      { from: "user", text: "a Maria pagou os 300", time: "15:20" },
      { from: "bot", text: "Confirmar?\n✅ Baixar: Maria — *R$ 300,00*\n🏢 Empresa • conta PJ", buttons: ["✅ Confirmar", "❌ Cancelar"], time: "15:20" },
    ],
  },
  {
    time: "19:10",
    title: "Mercado no cartão",
    text: "Compra no crédito vai para a fatura, sem bagunçar o saldo.",
    icon: CreditCard,
    chat: [
      { from: "user", text: "mercado 210 no cartão", time: "19:10" },
      { from: "bot", text: "Registrado! ✍️\n💳 Mercado — *R$ 210,00*\nVai para a fatura do cartão.", buttons: ["↩️ Desfazer"], time: "19:10" },
    ],
  },
  {
    time: "21:30",
    title: "Antes de dormir",
    text: "Uma pergunta e você sabe exatamente como está.",
    icon: Moon,
    chat: [
      { from: "user", text: "o que vence essa semana?", time: "21:30" },
      { from: "bot", text: "Essa semana:\n• Internet — *R$ 99,90* (qua)\n• DAS do MEI — *R$ 81,05* (sex)\nTotal: *R$ 180,95*", time: "21:30" },
    ],
  },
];

export function DayTimeline() {
  const [active, setActive] = useState(0);
  const [userPaused, setPaused] = useState(false);
  // Quem prefere menos movimento não vê a troca automática.
  const reduced = useReducedMotion();
  const paused = userPaused || reduced;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % MOMENTS.length), 4500);
    return () => clearTimeout(t);
  }, [active, paused]);

  const moment = MOMENTS[active];
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>(active, { radius: 16 });

  return (
    <div className="uv-day" onMouseEnter={() => setPaused(true)} onFocus={() => setPaused(true)}>
      <div ref={containerRef} className="uv-day__list" role="tablist" aria-label="Momentos do dia">
        <span ref={pillRef} aria-hidden className="t-stretch-pill uv-day__pill" style={{ opacity: 0 }} />
        {MOMENTS.map((m, i) => {
          const Icon = m.icon;
          return (
            <button
              key={m.time}
              type="button"
              role="tab"
              aria-selected={i === active}
              data-active={i === active}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className="uv-day__item t-tab"
            >
              <span className="uv-day__icon" aria-hidden>
                <Icon />
              </span>
              <span>
                <span className="uv-day__title">{m.title}</span>
                <span className="uv-day__text">{m.text}</span>
              </span>
              <span className="uv-day__time uv-num">{m.time}</span>
            </button>
          );
        })}
        {!paused && <p className="uv-note mt-2 pl-4">Passa sozinho. Toque num momento para parar.</p>}
      </div>

      <div role="tabpanel">
        <Phone>
          <div key={active} className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Bubble message={moment.chat[0]} />
            <div className="uv-bubble-late">
              <Bubble message={moment.chat[1]} />
            </div>
          </div>
        </Phone>
      </div>
    </div>
  );
}
