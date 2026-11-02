-- Forge Finance: base segura para movimentacoes via WhatsApp.
-- Este arquivo apenas define a migracao; nao a execute em producao sem revisao.

create table if not exists public.whatsapp_pending_actions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    phone text not null,
    account_id uuid not null references public.accounts(id) on delete cascade,
    category_id uuid references public.categories(id) on delete set null,
    type text not null check (type in ('income', 'expense')),
    title text not null check (length(trim(title)) between 1 and 120),
    description text,
    amount numeric(14,2) not null check (amount > 0),
    transaction_date date not null,
    status text not null default 'pending'
        check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
    expires_at timestamptz not null default (now() + interval '10 minutes'),
    created_at timestamptz not null default now(),
    confirmed_at timestamptz
);

create index if not exists idx_whatsapp_pending_user_status
    on public.whatsapp_pending_actions (user_id, status, expires_at);

create table if not exists public.whatsapp_processed_messages (
    provider_message_id text primary key,
    phone text not null,
    event_type text not null default 'message',
    created_at timestamptz not null default now()
);

alter table public.whatsapp_pending_actions enable row level security;
alter table public.whatsapp_processed_messages enable row level security;

revoke all on public.whatsapp_pending_actions from public, anon, authenticated;
revoke all on public.whatsapp_processed_messages from public, anon, authenticated;

grant select, insert, update, delete
    on public.whatsapp_pending_actions to service_role;
grant select, insert, update, delete
    on public.whatsapp_processed_messages to service_role;

create or replace function public.confirm_whatsapp_transaction(
    p_pending_id uuid,
    p_phone text
)
returns table (
    transaction_id uuid,
    new_balance numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_action public.whatsapp_pending_actions%rowtype;
    v_balance numeric(14,2);
    v_transaction_id uuid;
begin
    -- Apenas o backend usando a chave service role pode chamar esta funcao.
    if coalesce(auth.role(), '') <> 'service_role' then
        raise exception 'Operacao nao autorizada';
    end if;

    select *
      into v_action
      from public.whatsapp_pending_actions
     where id = p_pending_id
     for update;

    if not found then
        raise exception 'Confirmacao nao encontrada';
    end if;

    if v_action.phone <> p_phone then
        raise exception 'Telefone nao autorizado para esta confirmacao';
    end if;

    if v_action.status <> 'pending' then
        raise exception 'Esta confirmacao ja foi utilizada ou cancelada';
    end if;

    if v_action.expires_at <= now() then
        update public.whatsapp_pending_actions
           set status = 'expired'
         where id = v_action.id;

        return;
    end if;

    perform 1
      from public.accounts a
     where a.id = v_action.account_id
       and a.user_id = v_action.user_id
     for update;

    if not found then
        raise exception 'Conta nao pertence ao usuario autorizado';
    end if;

    if v_action.category_id is not null and not exists (
        select 1
          from public.categories c
         where c.id = v_action.category_id
           and c.user_id = v_action.user_id
           and c.type = v_action.type
    ) then
        raise exception 'Categoria invalida para esta movimentacao';
    end if;

    insert into public.transactions (
        user_id,
        account_id,
        category_id,
        type,
        title,
        description,
        amount,
        transaction_date
    )
    values (
        v_action.user_id,
        v_action.account_id,
        v_action.category_id,
        v_action.type,
        v_action.title,
        v_action.description,
        v_action.amount,
        v_action.transaction_date
    )
    returning id into v_transaction_id;

    update public.accounts
       set current_balance = current_balance +
           case
               when v_action.type = 'income' then v_action.amount
               else -v_action.amount
           end
     where id = v_action.account_id
       and user_id = v_action.user_id
    returning current_balance into v_balance;

    if not found then
        raise exception 'Nao foi possivel atualizar o saldo';
    end if;

    update public.whatsapp_pending_actions
       set status = 'confirmed',
           confirmed_at = now()
     where id = v_action.id;

    return query select v_transaction_id, v_balance;
end;
$$;

revoke all on function public.confirm_whatsapp_transaction(uuid, text)
    from public, anon, authenticated;
grant execute on function public.confirm_whatsapp_transaction(uuid, text)
    to service_role;

