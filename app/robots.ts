import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.forgefinance.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/assinar", "/assinatura", "/dashboard", "/conectar-whatsapp"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
