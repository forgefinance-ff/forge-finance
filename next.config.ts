import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as rotas.
 * - frame-ancestors/X-Frame-Options: nenhuma página pode ser aberta dentro de
 *   outro site (evita clique escondido, por exemplo em "Conectar WhatsApp").
 * - Referrer-Policy: links com token na URL (/conectar-whatsapp?t=) não vazam
 *   para outros sites.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
