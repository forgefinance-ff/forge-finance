"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { Bubble, type ChatMessage } from "./chat";

type Moment = { time: string; title: string; text: string; chat: [ChatMessage, ChatMessage] };

const MOMENTS: Moment[] = [
  {
    time: "07:40",
    title: "Café na padaria",
    text: "Uma mensagem de 3 segundos enquanto espera o troco.",
    chat: [
      { from: "user", text: "café 12", time: "07:40" },
      { from: "bot", text: "Registrado! ✍️\n🔴 Café — *R$ 12,00* • Alimentação", buttons: ["↩️ Desfazer"], time: "07:40" },
    ],
  },
  {
    time: "12:30",
    title: "Almoço, por áudio",
    text: "Sem digitar nada: manda um áudio e pronto.",
    chat: [
      { from: "user", audio: "almoço 38 no débito", time: "12:30" },
      { from: "bot", text: "🎙️ Entendi: “almoço 38 no débito”\nRegistrado! 🔴 *R$ 38,00* • Alimentação", buttons: ["↩️ Desfazer"], time: "12:30" },
    ],
  },
  {
    time: "15:20",
    title: "Cliente pagou",
    text: "Pessoal e Empresa (MEI) separados, no mesmo lugar.",
    chat: [
      { from: "user", text: "a Maria pagou os 300", time: "15:20" },
      { from: "bot", text: "Confirmar?\n✅ Baixar: Maria — *R$ 300,00*\n🏢 Empresa • conta PJ", buttons: ["✅ Confirmar", "❌ Cancelar"], time: "15:20" },
    ],
  },
  {
    time: "19:10",
    title: "Mercado no cartão",
    text: "Compra no crédito vai para a fatura, sem bagunçar o saldo.",
    chat: [
      { from: "user", text: "mercado 210 no cartão", time: "19:10" },
      { from: "bot", text: "Registrado! ✍️\n💳 Mercado — *R$ 210,00*\nVai para a fatura do cartão.", buttons: ["↩️ Desfazer"], time: "19:10" },
    ],
  },
  {
    time: "21:30",
    title: "Antes de dormir",
    text: "Uma pergunta e você sabe exatamente como está.",
    chat: [
      { from: "user", text: "o que vence essa semana?", time: "21:30" },
      { from: "bot", text: "Essa semana:\n• Internet — *R$ 99,90* (qua)\n• DAS do MEI — *R$ 81,05* (sex)\nTotal: *R$ 180,95*", time: "21:30" },
    ],
  },
];

export function DayTimeline() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % MOMENTS.length), 4500);
    return () => clearTimeout(t);
  }, [active, paused]);

  const moment = MOMENTS[active];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative flex justify-between px-1">
        <div className="absolute left-3 right-3 top-[9px] h-px bg-white/10" />
        <div
          className="absolute left-3 top-[9px] h-px bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
          style={{ width: `calc((100% - 24px) * ${active / (MOMENTS.length - 1)})` }}
        />
        {MOMENTS.map((m, i) => (
          <button
            key={m.time}
            type="button"
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            className="relative z-10 flex flex-col items-center gap-2"
            aria-label={`${m.time} ${m.title}`}
          >
            <span
              className={cn(
                "h-[18px] w-[18px] rounded-full border-2 transition",
                i <= active ? "border-violet-400 bg-violet-500" : "border-white/20 bg-[#0d0c14]"
              )}
            />
            <span className={cn("text-xs tabular-nums", i === active ? "text-white" : "text-white/40")}>{m.time}</span>
          </button>
        ))}
      </div>

      <div key={active} className="mt-8 grid items-center gap-6 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5 animate-in fade-in duration-500 sm:grid-cols-2 sm:p-7">
        <div>
          <p className="text-sm font-medium text-violet-300">{moment.time}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{moment.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{moment.text}</p>
        </div>
        <div className="space-y-2 rounded-2xl bg-[#0b0a12] p-3">
          <Bubble message={moment.chat[0]} />
          <Bubble message={moment.chat[1]} />
        </div>
      </div>
    </div>
  );
}
