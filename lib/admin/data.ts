import { createAdminClient } from "@/lib/supabase/admin";

import { requireAdmin } from "./auth";
import { PLAN_PRICING } from "@/lib/billing/plans";

export type AdminOverview = {
  generated_at: string;
  users_total: number;
  signups_today: number;
  signups_7d: number;
  signups_30d: number;
  signups_daily: { day: string; count: number }[];
  funnel: {
    signed_up: number;
    whatsapp: number;
    first_entry: number;
    active_d7: number;
    eligible_d7: number;
    paying: number;
  };
  active: { d1: number; d7: number; d30: number };
  profile: { mei_configured: number; uses_business: number; whatsapp_linked: number };
  channels_30d: { entries_total: number; whatsapp_actions: number };
  revenue: {
    paying_month: number;
    paying_year: number;
    past_due: number;
    canceling: number;
    canceled_this_month: number;
    manual_access: number;
    mrr_cents: number;
  };
  costs: {
    ai_requests_month: number;
    whatsapp_inbound_month: number;
    whatsapp_actions_month: number;
    /** Enviadas de fato pelo bot no mês (contadas desde 15/11/2026). */
    whatsapp_service_sent_month: number;
    whatsapp_template_sent_month: number;
  };
  health: {
    whatsapp_failed_7d: number;
    whatsapp_stuck: number;
    billing_events_30d: number;
    last_billing_event: string | null;
    rate_limited_1h: { bucket: string; email: string | null; hits: number }[];
  };
};

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();
  const db = createAdminClient();
  const monthStart = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7) + "-01";
  const [{ data, error }, { data: outbound }] = await Promise.all([
    db.rpc("ff_admin_overview", {
      p_month_price_cents: PLAN_PRICING.pro.month.cents,
      p_year_price_cents: PLAN_PRICING.pro.year.cents,
      p_pessoal_month_price_cents: PLAN_PRICING.pessoal.month.cents,
      p_pessoal_year_price_cents: PLAN_PRICING.pessoal.year.cents,
    }),
    db.from("whatsapp_outbound_daily").select("kind, sent").gte("day", monthStart),
  ]);
  if (error || !data) throw new Error(`Falha ao carregar a visão geral (${error?.code ?? "sem dados"}).`);

  const overview = data as AdminOverview;
  const sum = (kind: string) =>
    ((outbound ?? []) as { kind: string; sent: number }[]).filter((r) => r.kind === kind).reduce((s, r) => s + r.sent, 0);
  overview.costs.whatsapp_service_sent_month = sum("service");
  overview.costs.whatsapp_template_sent_month = sum("template");
  return overview;
}

export type AdminUsageRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan_id: string;
  access_source: string;
  status: string;
  ai_requests: number;
  unpriced_requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  ai_cost_usd_micros: number;
  inbound: number;
  inbound_audio: number;
  outbound_service: number;
  outbound_template: number;
  outbound_failed: number;
  delivery_failed: number;
  total_users: number;
  total_ai_requests: number;
  total_unpriced_requests: number;
  total_tokens: number;
  total_ai_cost_usd_micros: number;
  total_inbound: number;
  total_outbound_service: number;
  total_outbound_template: number;
  total_delivery_failed: number;
};

export type AdminUsage = {
  rows: AdminUsageRow[];
  totals: {
    users: number;
    aiRequests: number;
    unpricedRequests: number;
    tokens: number;
    aiCostUsdMicros: number;
    inbound: number;
    outboundService: number;
    outboundTemplate: number;
    deliveryFailed: number;
  };
};

/** Uso do mês (AAAA-MM-01) por usuário. Devolve null se a migration ainda não rodou. */
export async function getAdminUsage(month: string, limit = 200): Promise<AdminUsage | null> {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc("ff_admin_usage", { p_month: month, p_limit: limit, p_offset: 0 });
  if (error) {
    console.error("Admin usage", error.code);
    return null;
  }

  const rows = (data ?? []) as AdminUsageRow[];
  const first = rows[0];
  return {
    rows,
    totals: {
      users: Number(first?.total_users ?? 0),
      aiRequests: Number(first?.total_ai_requests ?? 0),
      unpricedRequests: Number(first?.total_unpriced_requests ?? 0),
      tokens: Number(first?.total_tokens ?? 0),
      aiCostUsdMicros: Number(first?.total_ai_cost_usd_micros ?? 0),
      inbound: Number(first?.total_inbound ?? 0),
      outboundService: Number(first?.total_outbound_service ?? 0),
      outboundTemplate: Number(first?.total_outbound_template ?? 0),
      deliveryFailed: Number(first?.total_delivery_failed ?? 0),
    },
  };
}

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  plan_id: string;
  status: string;
  access_source: "beta" | "subscription" | "admin";
  billing_interval: "month" | "year" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider_customer_id: string | null;
  whatsapp: boolean;
  entries_count: number;
  last_entry_at: string | null;
  ai_used: number;
  ai_limit: number;
  is_mei: boolean;
  total_count: number;
};

export const USER_FILTERS = {
  all: "Todos",
  not_activated: "Ainda não lançaram nada",
  manual_expiring: "Acesso liberado acabando",
  paying_idle: "Pagantes sumidos",
  paying: "Pagantes",
  manual: "Acesso liberado",
  mei: "MEI",
} as const;

export type UserFilter = keyof typeof USER_FILTERS;

export function parseFilter(value: string | undefined): UserFilter {
  return value && value in USER_FILTERS ? (value as UserFilter) : "all";
}

export const PAGE_SIZE = 50;

export async function getAdminUsers(opts: { search?: string; filter: UserFilter; page: number }) {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc("ff_admin_users", {
    p_search: opts.search?.trim() || null,
    p_filter: opts.filter,
    p_limit: PAGE_SIZE,
    p_offset: Math.max(0, opts.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(`Falha ao carregar usuários (${error.code}).`);
  const rows = (data ?? []) as AdminUserRow[];
  return { rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
}

export type AdminActionRow = {
  id: string;
  admin_email: string;
  target_user_id: string | null;
  action: string;
  reason: string;
  created_at: string;
};

export async function getRecentAdminActions(limit = 15): Promise<AdminActionRow[]> {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("admin_actions")
    .select("id, admin_email, target_user_id, action, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminActionRow[];
}
