-- =====================================================
-- WhatsApp: link de primeiro acesso.
-- Quem manda mensagem de um número ainda não vinculado recebe um link que
-- abre o cadastro (ou login) e já conecta aquele número à conta.
-- Só o servidor (service role) lê e grava esta tabela.
-- Idempotente.
-- =====================================================

create table if not exists public.whatsapp_onboarding_tokens (
  token text primary key,
  phone text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_onboarding_tokens_phone_idx
  on public.whatsapp_onboarding_tokens (phone);

alter table public.whatsapp_onboarding_tokens enable row level security;
