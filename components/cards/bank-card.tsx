import { customFace, findBank } from "@/lib/banks";
import { cn } from "@/lib/utils";

type BankCardProps = {
  name: string;
  color?: string | null;
  /** Texto pequeno no rodapé (ex.: "Vence dia 14"). */
  detail?: string;
  size?: "full" | "mini";
  className?: string;
};

function Chip() {
  return (
    <svg viewBox="0 0 40 30" className="h-auto w-[15cqw] shrink-0" aria-hidden>
      <defs>
        <linearGradient id="chip-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E2A6" />
          <stop offset="0.5" stopColor="#D9B45A" />
          <stop offset="1" stopColor="#B88B2E" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="6" fill="url(#chip-gold)" stroke="rgba(0,0,0,0.18)" />
      <path
        d="M0 10h12M0 20h12M28 10h12M28 20h12M12 0v30M28 0v30M12 15h16"
        stroke="rgba(80,55,10,0.45)"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function Contactless({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-auto w-[8cqw] shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M8.5 8.5a5 5 0 0 1 0 7" />
      <path d="M12 6a8.5 8.5 0 0 1 0 12" />
      <path d="M15.5 3.5a12 12 0 0 1 0 17" />
    </svg>
  );
}

/**
 * Cartão desenhado com as cores do banco (reconhecido pelo nome) ou, para
 * outros bancos, um gradiente a partir da cor escolhida. Proporção de cartão real.
 */
export function BankCard({ name, color, detail, size = "full", className }: BankCardProps) {
  const bank = findBank(name, color);
  const face = bank ?? customFace(color ?? "#7C3AED");
  const title = bank?.name ?? (name.trim() || "Seu cartão");
  // Nome personalizado além do banco ("Nubank Ultravioleta" → "Ultravioleta").
  const nickname = bank && name.trim().toLowerCase() !== bank.name.toLowerCase() ? name.trim() : null;

  if (size === "mini") {
    return (
      <span
        aria-hidden
        className={cn(
          "relative inline-flex aspect-[1.586] w-12 shrink-0 flex-col justify-between overflow-hidden rounded-[6px] p-1 shadow-sm ring-1 ring-black/10",
          className
        )}
        style={{ background: face.background }}
      >
        <span className="truncate font-[family-name:var(--font-display)] text-[6px] font-semibold leading-none" style={{ color: face.foreground }}>
          {title}
        </span>
        <span className="h-1.5 w-2 rounded-[1.5px] bg-[#D9B45A]" />
      </span>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[1.586] w-full overflow-hidden rounded-[18px] p-[7%] shadow-[0_18px_40px_-18px_rgba(20,10,40,0.55)] ring-1 ring-black/10 [container-type:inline-size]",
        className
      )}
      style={{ background: face.background, color: face.foreground }}
      role="img"
      aria-label={`Cartão ${title}${nickname ? ` ${nickname}` : ""}`}
    >
      {/* Brilho diagonal e textura sutil */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.28), transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(0,0,0,0.22), transparent 60%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[18%] -top-[40%] h-[120%] w-[60%] rotate-12 rounded-full border opacity-25"
        style={{ borderColor: face.foreground }}
      />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <span className="font-[family-name:var(--font-display)] text-[clamp(14px,8cqw,22px)] font-semibold leading-none tracking-[-0.02em]">
            {title}
          </span>
          <Contactless color={face.foreground} />
        </div>

        <Chip />

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {nickname && (
              <p className="truncate text-[clamp(10px,5cqw,13px)] font-medium" style={{ color: face.foreground }}>
                {nickname}
              </p>
            )}
            <p className="truncate font-mono text-[clamp(10px,5cqw,13px)] tracking-[0.18em]" style={{ color: face.muted }}>
              •••• ••••
            </p>
          </div>
          <span className="shrink-0 text-right text-[clamp(9px,4.4cqw,12px)] font-medium" style={{ color: face.muted }}>
            {detail ?? "crédito"}
          </span>
        </div>
      </div>
    </div>
  );
}
