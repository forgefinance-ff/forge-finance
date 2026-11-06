"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Bubble, Phone, Typing, type ChatMessage } from "./chat";

type Demo = { chip: string; exchange: [ChatMessage, ChatMessage] };

const DEMOS: Demo[] = [
  {
    chip: "Anotar um gasto",
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

const GREETING: ChatMessage = {
  from: "bot",
  text: "Oi! 👋 Toque num pedido aqui embaixo e veja como eu resolvo.",
};

export function TryIt() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [typing, setTyping] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function play(demo: Demo) {
    setShowChips(false);
    setMessages([GREETING, demo.exchange[0]]);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages([GREETING, demo.exchange[0], demo.exchange[1]]);
    }, 1200);
  }

  return (
    <Phone theme="light">
      {messages.map((message, i) => (
        <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Bubble message={message} theme="light" />
        </div>
      ))}
      {typing && <Typing theme="light" />}

      {showChips ? (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {DEMOS.map((demo) => (
            <button
              key={demo.chip}
              type="button"
              onClick={() => play(demo)}
              className="rounded-full border border-black/5 bg-white px-2 py-2 text-[12px] font-medium text-[#111b21] shadow-sm transition hover:border-violet-300 hover:text-violet-700"
            >
              {demo.chip}
            </button>
          ))}
        </div>
      ) : (
        !typing && (
          <button
            type="button"
            onClick={() => {
              setMessages([GREETING]);
              setShowChips(true);
            }}
            className="mx-auto mt-1 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-[#111b21] shadow-sm"
          >
            O que mais posso pedir? <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )
      )}
    </Phone>
  );
}
