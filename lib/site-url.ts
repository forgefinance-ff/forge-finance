const PRODUCTION_SITE_URL = "https://forge-finance-app.vercel.app";

export function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_SITE_URL;

  return siteUrl.replace(/\/+$/, "");
}
