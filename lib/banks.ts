/**
 * Visual dos cartões dos bancos mais usados no Brasil: cores aproximadas de
 * cada marca e o nome escrito. Não usamos os logotipos oficiais.
 * O banco é reconhecido pelo nome do cartão (ex.: "Nubank Ultravioleta").
 */
export type Bank = {
  id: string;
  name: string;
  /** Palavras que identificam o banco no nome do cartão (sem acento, minúsculas). */
  aliases: string[];
  /** Cor salva no cartão ao escolher o banco. */
  color: string;
  background: string;
  foreground: string;
  /** Texto secundário (bandeira, "crédito"). */
  muted: string;
};

export const BANKS: Bank[] = [
  {
    id: "nubank",
    name: "Nubank",
    aliases: ["nubank", "nu", "roxinho"],
    color: "#820AD1",
    background: "linear-gradient(135deg, #A13BF0 0%, #820AD1 45%, #56078C 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.72)",
  },
  {
    id: "inter",
    name: "Inter",
    aliases: ["inter", "banco inter"],
    color: "#FF7A00",
    background: "linear-gradient(135deg, #FF9A3C 0%, #FF7A00 45%, #D95400 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
  },
  {
    id: "c6",
    name: "C6 Bank",
    aliases: ["c6", "c6 bank", "c6bank", "carbon"],
    color: "#1C1C1C",
    background: "linear-gradient(135deg, #4A4A4A 0%, #1E1E1E 50%, #080808 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.6)",
  },
  {
    id: "itau",
    name: "Itaú",
    aliases: ["itau", "personnalite", "uniclass"],
    color: "#EC7000",
    background: "linear-gradient(135deg, #FF9532 0%, #EC7000 50%, #BF5200 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
  },
  {
    id: "bradesco",
    name: "Bradesco",
    aliases: ["bradesco", "next"],
    color: "#CC092F",
    background: "linear-gradient(135deg, #F0294E 0%, #CC092F 50%, #85001D 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.75)",
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    aliases: ["banco do brasil", "bb", "ourocard"],
    color: "#FCE22A",
    background: "linear-gradient(135deg, #FFF26B 0%, #FCE22A 45%, #EFBF00 100%)",
    foreground: "#0038A8",
    muted: "rgba(0,56,168,0.72)",
  },
  {
    id: "caixa",
    name: "Caixa",
    aliases: ["caixa", "cef", "caixa economica"],
    color: "#005CA9",
    background: "linear-gradient(135deg, #2A86D6 0%, #005CA9 50%, #00396B 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.72)",
  },
  {
    id: "santander",
    name: "Santander",
    aliases: ["santander"],
    color: "#EC0000",
    background: "linear-gradient(135deg, #FF3B3B 0%, #EC0000 50%, #A80000 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.75)",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    aliases: ["mercado pago", "mercadopago", "mp"],
    color: "#00B1EA",
    background: "linear-gradient(135deg, #48CDF5 0%, #00B1EA 50%, #0086C0 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.8)",
  },
  {
    id: "picpay",
    name: "PicPay",
    aliases: ["picpay", "pic pay"],
    color: "#21C25E",
    background: "linear-gradient(135deg, #4BDB82 0%, #21C25E 50%, #0E9A46 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.8)",
  },
  {
    id: "xp",
    name: "XP",
    aliases: ["xp", "xp investimentos"],
    color: "#111111",
    background: "linear-gradient(135deg, #2E2E2E 0%, #121212 55%, #000000 100%)",
    foreground: "#FFD400",
    muted: "rgba(255,255,255,0.6)",
  },
  {
    id: "btg",
    name: "BTG Pactual",
    aliases: ["btg", "btg pactual"],
    color: "#0B2A59",
    background: "linear-gradient(135deg, #1D4D8F 0%, #0B2A59 50%, #04132A 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.68)",
  },
  {
    id: "neon",
    name: "Neon",
    aliases: ["neon"],
    color: "#00C2E0",
    background: "linear-gradient(135deg, #4CEBF7 0%, #00C2E0 50%, #0090C4 100%)",
    foreground: "#04263A",
    muted: "rgba(4,38,58,0.7)",
  },
  {
    id: "will",
    name: "Will Bank",
    aliases: ["will", "will bank", "willbank"],
    color: "#FFD900",
    background: "linear-gradient(135deg, #FFEB5C 0%, #FFD900 50%, #EDB300 100%)",
    foreground: "#1A1A1A",
    muted: "rgba(26,26,26,0.68)",
  },
  {
    id: "sicredi",
    name: "Sicredi",
    aliases: ["sicredi"],
    color: "#3FA110",
    background: "linear-gradient(135deg, #67C43A 0%, #3FA110 50%, #2A740A 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
  },
  {
    id: "sicoob",
    name: "Sicoob",
    aliases: ["sicoob"],
    color: "#00837A",
    background: "linear-gradient(135deg, #00B5A3 0%, #00837A 50%, #003641 100%)",
    foreground: "#FFFFFF",
    muted: "rgba(255,255,255,0.75)",
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Banco do cartão pelo nome ("Nubank Ultravioleta" → Nubank); senão pela cor salva. */
export function findBank(name: string, color?: string | null): Bank | null {
  const text = ` ${normalize(name)} `;
  for (const bank of BANKS) {
    if (bank.aliases.some((alias) => text.includes(` ${normalize(alias)} `))) return bank;
  }
  if (color) {
    const hex = color.toLowerCase();
    return BANKS.find((bank) => bank.color.toLowerCase() === hex) ?? null;
  }
  return null;
}

/** Visual para um cartão sem banco conhecido: gradiente a partir da cor escolhida. */
export function customFace(color: string) {
  const base = /^#[0-9a-f]{6}$/i.test(color) ? color : "#7C3AED";
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const light = (r * 299 + g * 587 + b * 114) / 1000 > 165;
  return {
    background: `linear-gradient(135deg, color-mix(in oklab, ${base} 70%, white) 0%, ${base} 50%, color-mix(in oklab, ${base} 65%, black) 100%)`,
    foreground: light ? "#141414" : "#FFFFFF",
    muted: light ? "rgba(20,20,20,0.68)" : "rgba(255,255,255,0.72)",
  };
}
