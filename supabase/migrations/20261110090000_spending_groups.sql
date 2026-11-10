-- =====================================================
-- Raio-X da rotina: grupo de gasto das categorias PESSOAIS
-- (essencial x estilo de vida), usado no "Para onde vai cada R$ 100".
-- Na Empresa, o Raio-X usa a classe de custo que já existe (cost_class).
-- Seguro rodar mais de uma vez.
-- =====================================================

alter table public.categories
  add column if not exists spending_group text;

alter table public.categories
  drop constraint if exists categories_spending_group_check;

alter table public.categories
  add constraint categories_spending_group_check
  check (spending_group is null or spending_group in ('essential', 'lifestyle'));

-- Grupo padrão pelo nome da categoria (as categorias padrão já vêm classificadas).
create or replace function public.ff_default_spending_group(p_name text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case lower(trim(p_name))
    when 'moradia' then 'essential'
    when 'aluguel' then 'essential'
    when 'saúde' then 'essential'
    when 'saude' then 'essential'
    when 'farmácia' then 'essential'
    when 'transporte' then 'essential'
    when 'educação' then 'essential'
    when 'educacao' then 'essential'
    when 'contas e serviços' then 'essential'
    when 'contas e servicos' then 'essential'
    when 'alimentação' then 'essential'
    when 'alimentacao' then 'essential'
    when 'mercado' then 'essential'
    when 'supermercado' then 'essential'
    when 'pets' then 'essential'
    when 'lazer' then 'lifestyle'
    when 'compras' then 'lifestyle'
    when 'assinaturas' then 'lifestyle'
    when 'cuidados pessoais' then 'lifestyle'
    when 'restaurantes' then 'lifestyle'
    when 'delivery' then 'lifestyle'
    when 'viagens' then 'lifestyle'
    when 'viagem' then 'lifestyle'
    when 'presentes' then 'lifestyle'
    else null
  end;
$$;

create or replace function public.ff_categories_default_spending_group()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.spending_group is null
     and new.scope = 'personal'
     and new.type = 'expense'
     and coalesce(new.kind, 'regular') = 'regular' then
    new.spending_group := public.ff_default_spending_group(new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_spending_group on public.categories;
create trigger trg_categories_spending_group
before insert on public.categories
for each row execute function public.ff_categories_default_spending_group();

-- Classifica as categorias pessoais que já existem.
update public.categories
   set spending_group = public.ff_default_spending_group(name)
 where scope = 'personal'
   and type = 'expense'
   and coalesce(kind, 'regular') = 'regular'
   and spending_group is null;

-- Troca o grupo de uma categoria (só do próprio usuário, só despesa pessoal).
create or replace function public.ff_set_category_spending_group(p_id uuid, p_group text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_group is not null and p_group not in ('essential', 'lifestyle') then
    raise exception 'Grupo inválido.' using errcode = '22023';
  end if;

  update public.categories
     set spending_group = p_group
   where id = p_id
     and user_id = auth.uid()
     and scope = 'personal'
     and type = 'expense';

  if not found then
    raise exception 'Categoria não encontrada.' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.ff_set_category_spending_group(uuid, text) from public, anon;
grant execute on function public.ff_set_category_spending_group(uuid, text) to authenticated;
