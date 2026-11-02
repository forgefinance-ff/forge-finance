-- Diagnóstico da cota de IA (somente leitura). Rodar no SQL Editor do Supabase.

-- 1) Tabelas de cota existem?
select t.table_name, (to_regclass('public.' || t.table_name) is not null) as existe
from (values ('plans'), ('user_entitlements'), ('usage_records')) as t(table_name);

-- 2) A função existe, é SECURITY DEFINER e quem pode executá-la?
select p.proname,
       p.prosecdef as security_definer,
       pg_get_function_result(p.oid) as retorno,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_pode_executar,
       has_function_privilege('anon', p.oid, 'execute') as anon_pode_executar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('consume_my_ai_quota', 'ensure_my_beta_entitlement', 'provision_beta_entitlement');

-- 3) A função já tem a correção de ambiguidade?
select position('#variable_conflict use_column' in pg_get_functiondef(p.oid)) > 0 as corrigida
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'consume_my_ai_quota';

-- 3b) Nome da PK de usage_records (a correção usa usage_records_pkey).
select conname from pg_constraint
where conrelid = to_regclass('public.usage_records') and contype = 'p';

-- 4) Catálogo de planos.
select id, ai_monthly_limit, is_active from public.plans order by id;

-- 5) Trigger de provisionamento em auth.users.
select tgname, tgenabled from pg_trigger
where tgrelid = 'auth.users'::regclass and tgname = 'trg_provision_beta_entitlement';

-- 6) Seu usuário: plano/assinatura e consumo do mês. Troque o e-mail.
select u.id as user_id,
       e.plan_id, e.status, e.access_source,
       pl.ai_monthly_limit, pl.is_active as plano_ativo,
       r.usage_count as uso_mes_atual
from auth.users u
left join public.user_entitlements e on e.user_id = u.id
left join public.plans pl on pl.id = e.plan_id
left join public.usage_records r
       on r.user_id = u.id
      and r.resource = 'ai_assistant'
      and r.period_start = date_trunc('month', now() at time zone 'UTC')::date
where u.email = 'SEU_EMAIL_AQUI';
