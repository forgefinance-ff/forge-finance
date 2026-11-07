import type { MetadataRoute } from "next";

// Faz o navegador tratar o Forge como app instalável (tela inicial do celular e do PC).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Forge Finance",
    short_name: "Forge",
    description: "Controle financeiro pessoal e do seu negócio, com registro pelo WhatsApp.",
    lang: "pt-BR",
    start_url: "/dashboard?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06060c",
    theme_color: "#06060c",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nova transação", url: "/transacoes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Relatórios", url: "/relatorios", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
