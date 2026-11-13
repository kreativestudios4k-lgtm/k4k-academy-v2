-- K4K soft-launch admission ledger. Additive; no existing users or balances changed.
create table if not exists public.k4k_launch_paid_claims(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 plan_key text not null check(plan_key in ('starter','creator','pro','studio')),
 price_id text not null check(price_id ~ '^price_[A-Za-z0-9]+$'),
 currency text not null check(currency in ('GBP','EUR','USD','BRL')),
 credits integer not null check(credits in (80,160,340,700)),
 state text not null default 'reserved' check(state in ('reserved','paid','expired')),
 stripe_session_id text unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists k4k_launch_one_open_claim on public.k4k_launch_paid_claims(user_id) where state in ('reserved','paid');
alter table public.k4k_launch_paid_claims enable row level security;
revoke all on public.k4k_launch_paid_claims from public,anon,authenticated;
grant select,insert,update on public.k4k_launch_paid_claims to service_role;

create or replace function public.k4k_launch_claim_paid(p_user uuid,p_plan text,p_price text,p_currency text,p_max_seats integer,p_max_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_launch_paid_claims%rowtype; v_credits integer; v_seats integer; v_total bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 v_credits:=case p_plan when 'starter' then 80 when 'creator' then 160 when 'pro' then 340 when 'studio' then 700 else null end;
 if p_user is null or v_credits is null or p_price is null or p_price !~ '^price_[A-Za-z0-9]+$' or p_currency is null or p_currency not in ('GBP','EUR','USD','BRL') or p_max_seats is null or p_max_seats not between 1 and 50 or p_max_credits is null or p_max_credits not between 80 and 35000 then raise exception 'LAUNCH_CONFIG_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 select * into c from public.k4k_launch_paid_claims where user_id=p_user and state in ('reserved','paid');
 if found then
  if c.plan_key<>p_plan or c.price_id<>p_price or c.currency<>p_currency then raise exception 'LAUNCH_CHECKOUT_PENDING';end if;
 else
  if exists(select 1 from public.memberships where user_id=p_user and stripe_subscription_id is not null and status not in ('canceled','incomplete_expired')) then raise exception 'ALREADY_SUBSCRIBED';end if;
  select count(*)::integer,coalesce(sum(credits),0) into v_seats,v_total from public.k4k_launch_paid_claims where state in ('reserved','paid');
  if v_seats>=p_max_seats then raise exception 'LAUNCH_SOLD_OUT';end if;
  if v_total+v_credits>p_max_credits then raise exception 'LAUNCH_CREDIT_CAPACITY';end if;
  insert into public.k4k_launch_paid_claims(user_id,plan_key,price_id,currency,credits) values(p_user,p_plan,p_price,p_currency,v_credits) returning * into c;
 end if;
 return to_jsonb(c)||jsonb_build_object('expires_epoch',floor(extract(epoch from c.created_at+interval '1 hour'))::bigint);
end $$;

create or replace function public.k4k_launch_checkout_update(p_claim uuid,p_user uuid,p_session text,p_outcome text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_launch_paid_claims%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_session is null or p_session !~ '^cs_live_[A-Za-z0-9_]{8,250}$' or p_outcome is null or p_outcome not in ('bind','paid','expired') then raise exception 'LAUNCH_SESSION_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 select * into c from public.k4k_launch_paid_claims where id=p_claim and user_id=p_user for update;
 if not found or (c.stripe_session_id is not null and c.stripe_session_id<>p_session) then raise exception 'LAUNCH_SESSION_INVALID';end if;
 if c.state='expired' and p_outcome<>'expired' then raise exception 'LAUNCH_SESSION_EXPIRED';end if;
 if c.state='paid' and p_outcome='expired' then raise exception 'LAUNCH_SESSION_PAID';end if;
 update public.k4k_launch_paid_claims set stripe_session_id=p_session,state=case when p_outcome='paid' then 'paid' when p_outcome='expired' then 'expired' else state end,updated_at=now() where id=c.id returning * into c;
 return to_jsonb(c);
end $$;

revoke all on function public.k4k_launch_claim_paid(uuid,text,text,text,integer,integer),public.k4k_launch_checkout_update(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.k4k_launch_claim_paid(uuid,text,text,text,integer,integer),public.k4k_launch_checkout_update(uuid,uuid,text,text) to service_role;

create table if not exists public.k4k_launch_tester_grants(
 user_id uuid primary key references auth.users(id) on delete restrict,
 credits integer not null default 80 check(credits=80),
 created_at timestamptz not null default now()
);
alter table public.k4k_launch_tester_grants enable row level security;
revoke all on public.k4k_launch_tester_grants from public,anon,authenticated;
grant select,insert on public.k4k_launch_tester_grants to service_role;

create or replace function public.k4k_launch_grant_tester(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_balance integer;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null then raise exception 'INVALID_TESTER';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042028);
 if exists(select 1 from public.k4k_launch_tester_grants where user_id=p_user) then
  select balance into v_balance from public.studio_credit_accounts where user_id=p_user;
  return jsonb_build_object('granted',false,'credits',80,'balance',v_balance);
 end if;
 if (select count(*) from public.k4k_launch_tester_grants)>=5 then raise exception 'TESTER_LIMIT';end if;
 insert into public.studio_credit_accounts(user_id,balance) values(p_user,0) on conflict(user_id) do nothing;
 if exists(select 1 from public.studio_credit_accounts where user_id=p_user and billing_hold) then raise exception 'BILLING_REVIEW_REQUIRED';end if;
 insert into public.k4k_launch_tester_grants(user_id,credits) values(p_user,80);
 update public.studio_credit_accounts set balance=balance+80,updated_at=now() where user_id=p_user returning balance into v_balance;
 return jsonb_build_object('granted',true,'credits',80,'balance',v_balance);
end $$;
revoke all on function public.k4k_launch_grant_tester(uuid) from public,anon,authenticated;
grant execute on function public.k4k_launch_grant_tester(uuid) to service_role;
