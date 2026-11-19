-- Forge Finance: confere o que já está aplicado no banco.
-- SÓ LEITURA: não altera nada. Rode no SQL Editor e veja a coluna "situacao".

select 1 as ordem, '20261115090000_admin_panel' as item,
       case when to_regclass('public.admin_actions') is not null then 'APLICADA' else 'FALTA' end as situacao
union all
select 2, '20261115100000_support_chat',
       case when to_regclass('public.support_threads') is not null then 'APLICADA' else 'FALTA' end
union all
select 3, '20261115110000_support_notify',
       case when to_regprocedure('public.ff_admin_whatsapp_phones(text[])') is not null then 'APLICADA' else 'FALTA' end
union all
select 4, '20261115120000_whatsapp_outbound',
       case when to_regclass('public.whatsapp_outbound_daily') is not null then 'APLICADA' else 'FALTA' end
union all
select 5, '20261117090000_trial_monthly_summary',
       case when exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'user_entitlements' and column_name = 'trial_ends_at'
       ) then 'APLICADA' else 'FALTA' end
union all
select 6, '20261118090000_agenda',
       case when to_regclass('public.events') is not null and to_regclass('public.calendars') is not null then 'APLICADA' else 'FALTA' end
union all
select 7, '20261118100000_security_fixes',
       case when to_regprocedure('public.ff_rate_limit_for(text, text, integer, integer)') is not null then 'APLICADA' else 'FALTA' end
union all
select 8, '20261118110000_planos_pessoal_mei',
       case when exists (select 1 from public.plans where id = 'pessoal')
             and to_regprocedure('public.ff_admin_overview(integer, integer, integer, integer)') is not null
            then 'APLICADA' else 'FALTA' end
union all
select 9, '20261118120000_usage_costs',
       case when to_regclass('public.ai_usage_daily') is not null
             and to_regprocedure('public.ff_admin_usage(date, integer, integer)') is not null
            then 'APLICADA' else 'FALTA' end
union all
select 20, 'INFO: contas no total', count(*)::text from auth.users
union all
select 21, 'INFO: contas com o teste grátis vencido e sem plano pago', count(*)::text
  from public.user_entitlements e
 where e.trial_ends_at <= now()
   and not (e.plan_id <> 'free' and e.status in ('active', 'past_due'))
   and e.access_source <> 'admin'
union all
select 22, 'INFO: assinaturas pagas ativas', count(*)::text
  from public.user_entitlements e
 where e.access_source = 'subscription' and e.status in ('active', 'past_due')
order by ordem;
