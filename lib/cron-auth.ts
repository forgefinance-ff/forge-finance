import { timingSafeEqual } from "node:crypto";

/** Confere "Authorization: Bearer <CRON_SECRET>" em tempo constante. Sem segredo, recusa. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
