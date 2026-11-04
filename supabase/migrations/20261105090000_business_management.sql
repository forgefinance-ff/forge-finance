-- =====================================================
-- Gestão da Empresa: DRE, ponto de equilíbrio, metas, PF x PJ.
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Depende de 20261104090000_movement_kinds.sql.
-- =====================================================

-- -----------------------------------------------------
-- 1) Classe de custo das categorias de despesa da Empresa (para a DRE)
--    variable  -> custo variável (insumos, frete, maquininha…)
--    fixed     -> custo fixo (aluguel, software, contador…)
--    tax       -> impostos (DAS…)
--    prolabore -> pró-labore do dono
--    null      -> ainda não classificada
-- -----------------------------------------------------

alter table public.categories
  add column if not exists cost_class text;

alter table public.categories
  drop constraint if exists categories_cost_class_check;

alter table public.categories
  add constraint categories_cost_class_check
  check (cost_class is null or cost_class in ('variable', 'fixed', 'tax', 'prolabore'));

create or replace function public.ff_default_cost_class(p_name text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case lower(trim(p_name))
    when 'impostos' then 'tax'
    when 'pró-labore' then 'prolabore'
    when 'pro-labore' then 'prolabore'
    when 'fornecedores' then 'variable'
    when 'matéria-prima e insumos' then 'variable'
    when 'embalagens' then 'variable'
    when 'taxas bancárias e maquininha' then 'variable'
    when 'frete e entregas' then 'variable'
    when 'marketing' then 'fixed'
    when 'anúncios online' then 'fixed'
    when 'ferramentas e software' then 'fixed'
    when 'contabilidade' then 'fixed'
    when 'salários e freelancers' then 'fixed'
    when 'aluguel' then 'fixed'
    when 'água, luz e internet' then 'fixed'
    when 'telefone' then 'fixed'
    when 'transporte' then 'fixed'
    when 'alimentação' then 'fixed'
    when 'manutenção' then 'fixed'
    when 'equipamentos' then 'fixed'
    when 'cursos e capacitação' then 'fixed'
    when 'outros' then 'fixed'
    else null
  end;
$$;

-- Categorias novas de despesa da Empresa já nascem classificadas (se o nome for conhecido).
create or replace function public.ff_categories_default_cost_class()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.cost_class is null
     and new.scope = 'business'
     and new.type = 'expense'
     and coalesce(new.kind, 'regular') = 'regular' then
    new.cost_class := public.ff_default_cost_class(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_cost_class on public.categories;
create trigger trg_categories_cost_class
before insert on public.categories
for each row execute function public.ff_categories_default_cost_class();

-- Classifica as categorias da Empresa que já existem.
update public.categories
   set cost_class = public.ff_default_cost_class(name)
 where scope = 'business'
   and type = 'expense'
   and kind = 'regular'
   and cost_class is null;

create or replace function public.ff_set_category_cost_class(p_id uuid, p_class text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_class is not null and p_class not in ('variable', 'fixed', 'tax', 'prolabore') then
    raise exception 'Classe de custo inválida.' using errcode = '22023';
  end if;

  update public.categories
     set cost_class = p_class
   where id = p_id
     and user_id = auth.uid()
     and scope = 'business'
     and type = 'expense';

  if not found then
    raise exception 'Categoria não encontrada.' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.ff_set_category_cost_class(uuid, text) from public, anon;
grant execute on function public.ff_set_category_cost_class(uuid, text) to authenticated;

-- -----------------------------------------------------
-- 2) Metas da Empresa (junto das configurações do MEI)
-- -----------------------------------------------------

alter table public.mei_settings
  add column if not exists monthly_revenue_goal numeric(14,2)
    check (monthly_revenue_goal is null or monthly_revenue_goal > 0);

alter table public.mei_settings
  add column if not exists target_margin_pct numeric(5,2)
    check (target_margin_pct is null or (target_margin_pct > 0 and target_margin_pct < 100));

-- -----------------------------------------------------
-- 3) Transferências entre Pessoal e Empresa (pró-labore, retirada, aporte)
--    Criam DUAS transações ligadas pelo mesmo transfer_group.
-- -----------------------------------------------------

alter table public.transactions
  add column if not exists transfer_group uuid;

create index if not exists transactions_transfer_group_idx
  on public.transactions (transfer_group)
  where transfer_group is not null;

-- Acha (ou cria) a categoria certa para cada lado da transferência.
create or replace function public.ff_transfer_category(
  p_scope text,
  p_type text,
  p_name text,
  p_kind text,
  p_icon text,
  p_color text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  select id into v_id
    from public.categories
   where user_id = v_user
     and scope = p_scope
     and type = p_type
     and kind = p_kind
     and lower(name) = lower(p_name)
   limit 1;

  if v_id is null then
    insert into public.categories (user_id, name, type, color, icon, scope, kind)
    values (v_user, p_name, p_type, p_color, p_icon, p_scope, p_kind)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.ff_transfer_category(text, text, text, text, text, text) from public, anon;
grant execute on function public.ff_transfer_category(text, text, text, text, text, text) to authenticated;

create or replace function public.ff_scope_transfer(
  p_kind text,             -- 'prolabore' | 'withdrawal' | 'contribution'
  p_from_account uuid,
  p_to_account uuid,
  p_amount numeric,
  p_date date,
  p_description text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid := gen_random_uuid();
  v_from_scope text;
  v_to_scope text;
  v_from_cat uuid;
  v_to_cat uuid;
  v_title text;
  v_out uuid;
  v_in uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_kind not in ('prolabore', 'withdrawal', 'contribution') then
    raise exception 'Tipo de transferência inválido.' using errcode = '22023';
  end if;

  select scope into v_from_scope from public.accounts where id = p_from_account and user_id = v_user;
  select scope into v_to_scope from public.accounts where id = p_to_account and user_id = v_user;

  if v_from_scope is null or v_to_scope is null then
    raise exception 'Conta não encontrada.' using errcode = '23514';
  end if;

  if p_kind in ('prolabore', 'withdrawal') and (v_from_scope <> 'business' or v_to_scope <> 'personal') then
    raise exception 'Pró-labore e retirada saem de uma conta da Empresa para uma conta Pessoal.' using errcode = '22023';
  end if;

  if p_kind = 'contribution' and (v_from_scope <> 'personal' or v_to_scope <> 'business') then
    raise exception 'O aporte sai de uma conta Pessoal para uma conta da Empresa.' using errcode = '22023';
  end if;

  if p_kind = 'prolabore' then
    v_title := coalesce(nullif(trim(p_description), ''), 'Pró-labore');
    v_from_cat := public.ff_transfer_category('business', 'expense', 'Pró-labore', 'regular', '👤', '#8B5CF6');
    v_to_cat := public.ff_transfer_category('personal', 'income', 'Pró-labore', 'regular', '💼', '#22C55E');
    update public.categories set cost_class = 'prolabore' where id = v_from_cat and cost_class is null;
  elsif p_kind = 'withdrawal' then
    v_title := coalesce(nullif(trim(p_description), ''), 'Retirada de lucros');
    v_from_cat := public.ff_transfer_category('business', 'expense', 'Retirada de lucros', 'contribution', '💸', '#0D9488');
    v_to_cat := public.ff_transfer_category('personal', 'income', 'Retirada de lucros', 'regular', '💸', '#14B8A6');
  else
    v_title := coalesce(nullif(trim(p_description), ''), 'Aporte na empresa');
    v_from_cat := public.ff_transfer_category('personal', 'expense', 'Aportes', 'contribution', '🏦', '#0D9488');
    v_to_cat := public.ff_transfer_category('business', 'income', 'Aportes', 'contribution', '🏦', '#14B8A6');
  end if;

  v_out := public.ff_create_transaction(p_from_account, v_from_cat, 'expense', v_title, v_title, p_amount, p_date);
  v_in := public.ff_create_transaction(p_to_account, v_to_cat, 'income', v_title, v_title, p_amount, p_date);

  update public.transactions
     set transfer_group = v_group
   where id in (v_out, v_in)
     and user_id = v_user;

  return v_group;
end;
$$;

revoke all on function public.ff_scope_transfer(text, uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.ff_scope_transfer(text, uuid, uuid, numeric, date, text) to authenticated;

-- Novas categorias da Empresa: pró-labore e retirada já classificadas.
update public.categories
   set cost_class = 'prolabore'
 where scope = 'business' and type = 'expense' and kind = 'regular'
   and lower(name) in ('pró-labore', 'pro-labore') and cost_class is null;
