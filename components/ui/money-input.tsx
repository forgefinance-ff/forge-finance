"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

import { parseAmount } from "@/lib/money";

/**
 * Campo de valor em reais usado em todo o app.
 *
 * Funciona como maquininha: os dígitos entram pelos centavos.
 * Digitar 1 5 0 0 0 0 mostra "1.500,00". Colar "R$ 1.500,00", "1500.5"
 * ou "1.500" também funciona.
 *
 * Envia para o formulário um campo escondido com `name` e o valor em
 * formato de máquina ("1500.00"), que todos os servidores já entendem.
 */

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "name" | "prefix"> & {
  name?: string;
  defaultValue?: number | string | null;
  /** Modo controlado (em reais). */
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  /** Permite valores negativos (ex.: saldo inicial de conta). Tecla "-" alterna o sinal. */
  allowNegative?: boolean;
  /** Mostra "R$" dentro do campo. */
  prefix?: boolean;
};

const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toCents(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parsePasted(value);
  if (n === null || !Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Interpreta texto colado/legado em reais (mesma regra do servidor). */
export function parsePasted(raw: string): number | null {
  const n = parseAmount(raw);
  return Number.isFinite(n) ? n : null;
}

function display(cents: number | null, prefix: boolean) {
  if (cents === null) return "";
  const text = fmt.format(Math.abs(cents) / 100);
  return `${cents < 0 ? "-" : ""}${prefix ? "R$ " : ""}${text}`;
}

const MAX_CENTS = 100_000_000_00; // R$ 100 milhões

export function MoneyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  allowNegative = false,
  prefix = false,
  placeholder = "0,00",
  className,
  required,
  disabled,
  ...rest
}: Props) {
  const controlled = value !== undefined;
  const [initialCents] = useState(() => toCents(defaultValue ?? null));
  const [inner, setInner] = useState<number | null>(initialCents);
  const cents = controlled ? toCents(value) : inner;
  const ref = useRef<HTMLInputElement>(null);

  function commit(next: number | null) {
    if (next !== null) next = Math.max(allowNegative ? -MAX_CENTS : 0, Math.min(MAX_CENTS, next));
    if (!controlled) setInner(next);
    onValueChange?.(next === null ? null : next / 100);
  }

  // Volta ao valor inicial quando o formulário é limpo (form.reset()).
  useEffect(() => {
    const form = ref.current?.form;
    if (!form || controlled) return;
    const onReset = () => setInner(initialCents);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [controlled, initialCents]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const current = cents ?? 0;
    const sign = current < 0 ? -1 : 1;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const abs = Math.abs(current);
      if (abs >= MAX_CENTS / 10) return;
      commit(sign * (abs * 10 + Number(e.key)));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const abs = Math.floor(Math.abs(current) / 10);
      commit(abs === 0 && cents !== null && Math.abs(current) < 10 ? null : sign * abs);
    } else if (e.key === "Delete") {
      e.preventDefault();
      commit(null);
    } else if (e.key === "-" && allowNegative) {
      e.preventDefault();
      commit(-current);
    } else if (e.key.length === 1) {
      // Bloqueia letras; vírgula e ponto não são necessários (centavos automáticos).
      e.preventDefault();
    }
  }

  // Teclados móveis (Android) às vezes não enviam keydown com a tecla real.
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const neg = allowNegative && raw.includes("-");
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    if (!digits) return commit(null);
    const n = Number(digits.slice(0, 12));
    commit(neg ? -n : n);
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const parsed = parsePasted(e.clipboardData.getData("text"));
    if (parsed === null) return;
    e.preventDefault();
    commit(Math.round((allowNegative ? parsed : Math.abs(parsed)) * 100));
  }

  const field = (
    <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display(cents, prefix)}
        placeholder={prefix ? `R$ ${placeholder}` : placeholder}
        onKeyDown={onKeyDown}
        onChange={onChange}
        onPaste={onPaste}
        required={required}
        disabled={disabled}
        className={className}
        style={{ fontVariantNumeric: "tabular-nums", ...rest.style, ...(allowNegative ? { paddingRight: "3.25rem" } : null) }}
      />
  );

  const hidden = name && (
    <input type="hidden" name={name} value={cents === null ? "" : (cents / 100).toFixed(2)} disabled={disabled} />
  );

  if (!allowNegative) {
    return (
      <>
        {field}
        {hidden}
      </>
    );
  }

  // O teclado numérico do celular (principalmente no iPhone) não tem a tecla "-":
  // um botão troca o sinal.
  const negative = (cents ?? 0) < 0;
  return (
    <div className="relative">
      {field}
      <button
        type="button"
        disabled={disabled}
        onClick={() => commit(-(cents ?? 0))}
        aria-pressed={negative}
        aria-label={negative ? "Valor negativo. Tocar para deixar positivo" : "Tocar para deixar o valor negativo"}
        className="absolute inset-y-1 right-1 flex w-11 items-center justify-center rounded-lg text-base font-semibold text-muted-foreground transition hover:bg-tint hover:text-foreground aria-pressed:bg-danger/10 aria-pressed:text-danger"
      >
        ±
      </button>
      {hidden}
    </div>
  );
}
