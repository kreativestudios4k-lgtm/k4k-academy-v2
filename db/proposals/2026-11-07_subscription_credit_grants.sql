-- PROPOSAL ONLY. Do not apply until approved. Additive: adds one table and one function.
-- Grants plan credits once per Stripe invoice, onto the existing studio_credit_accounts balance.
-- Check before applying: studio_credit_accounts.user_id must be unique (it is used for ON CONFLICT).

create table if not exists public.k4k_credit_grants (
  invoice_id text primary key,
  user_id uuid not null references public.studio_credit_accounts(user_id),
  credits integer not null check (credits between 1 and 10000),
  created_at timestamptz not null default now()
);

alter table public.k4k_credit_grants enable row level security;

create or replace function public.k4k_grant_subscription_credits(p_user uuid, p_invoice text, p_credits integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted boolean;
  new_balance integer;
begin
  if p_user is null or p_invoice is null or p_credits is null or p_credits not between 1 and 10000 then
    raise exception 'Invalid grant';
  end if;

  insert into public.studio_credit_accounts (user_id, balance) values (p_user, 0)
  on conflict (user_id) do nothing;

  insert into public.k4k_credit_grants (invoice_id, user_id, credits) values (p_invoice, p_user, p_credits)
  on conflict (invoice_id) do nothing;
  inserted := found;

  if inserted then
    update public.studio_credit_accounts
      set balance = balance + p_credits, updated_at = now()
      where user_id = p_user
      returning balance into new_balance;
  else
    select balance into new_balance from public.studio_credit_accounts where user_id = p_user;
  end if;

  return jsonb_build_object('granted', inserted, 'balance', new_balance);
end;
$$;

revoke all on function public.k4k_grant_subscription_credits(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.k4k_grant_subscription_credits(uuid, text, integer) to service_role;
