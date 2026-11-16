-- Fixed early-user cohort; no credits are issued at enrollment.
create table public.k4k_early_free_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'available' check(status in ('available','reserved','consumed','exhausted')),
 attempts integer not null default 0 check(attempts between 0 and 2),
 job_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.k4k_early_free_attempts (
 job_id uuid primary key,
 user_id uuid not null,
 credits integer not null check(credits between 1 and 10000),
 quote_micros bigint not null check(quote_micros between 1 and 700000),
 status text not null default 'reserved' check(status in ('reserved','settled','refunded')),
 created_at timestamptz not null default now()
);
alter table public.k4k_early_free_entitlements enable row level security;
alter table public.k4k_early_free_attempts enable row level security;
revoke all on public.k4k_early_free_entitlements,public.k4k_early_free_attempts from public,anon,authenticated;
grant select on public.k4k_early_free_entitlements to authenticated;
grant select,insert,update on public.k4k_early_free_entitlements,public.k4k_early_free_attempts to service_role;
create policy early_free_owner_read on public.k4k_early_free_entitlements for select to authenticated using ((select auth.uid())=user_id);
insert into public.k4k_early_free_entitlements(user_id)
 select id from auth.users where created_at <= '2026-11-16T12:39:56.925138Z'::timestamptz and not is_anonymous
 on conflict(user_id) do nothing;
-- The normal live budget/credit ledger remains the only generation reservation.
-- Temporarily fund exactly one quote inside the same transaction; no spendable
-- promo credits survive reservation or a failed generation.
create or replace function public.k4k_reserve_early_free_generation(
 p_user uuid,p_job uuid,p_key uuid,p_credits integer,p_enabled boolean,p_provider text,
 p_quote_micros bigint,p_daily_budget_micros bigint,p_max_active integer,p_total_budget_micros bigint,p_source_millis integer
) returns jsonb language plpgsql set search_path='' as $function$
declare
 v_ent public.k4k_early_free_entitlements%rowtype;
 v_existing public.k4k_generation_reservations%rowtype;
 v_result jsonb;
 v_total bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_enabled is distinct from true then raise exception 'GENERATION_DISABLED';end if;
 if p_user is null or p_job is null or p_key is null or p_provider is distinct from 'fal'
  or p_quote_micros is null or p_quote_micros not between 1 and 700000
  or p_source_millis is null or p_source_millis not between 2000 and 5000
  or p_credits is null or p_credits not between 1 and 10000 then raise exception 'FREE_GENERATION_LIMIT';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 select * into v_existing from public.k4k_generation_reservations where user_id=p_user and (request_key=p_key or job_id=p_job) limit 1;
 if found then
  if v_existing.job_id<>p_job or v_existing.credits<>p_credits or v_existing.credit_mode<>'live'
   or not exists(select 1 from public.k4k_early_free_attempts where job_id=p_job and user_id=p_user) then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'credits',v_existing.credits,'newly_reserved',false);
 end if;
 select * into v_ent from public.k4k_early_free_entitlements where user_id=p_user for update;
 if not found or v_ent.status<>'available' or v_ent.attempts>=2 then raise exception 'FREE_GENERATION_UNAVAILABLE';end if;
 select coalesce(sum(quote_micros),0) into v_total from public.k4k_early_free_attempts;
 if v_total+p_quote_micros>70000000 then raise exception 'FREE_GENERATION_BUDGET_BLOCKED';end if;
 insert into public.k4k_live_credit_accounts(user_id,balance) values(p_user,0) on conflict(user_id) do nothing;
 update public.k4k_live_credit_accounts set balance=balance+p_credits,updated_at=now() where user_id=p_user and not billing_hold;
 if not found then raise exception 'BILLING_REVIEW_REQUIRED';end if;
 v_result:=public.k4k_generation_reserve_live_budgeted(p_user,p_job,p_key,p_credits,p_enabled,p_provider,p_quote_micros,p_daily_budget_micros,p_max_active,p_total_budget_micros);
 if coalesce((v_result->>'newly_reserved')::boolean,false) is not true then raise exception 'IDEMPOTENCY_CONFLICT';end if;
 insert into public.k4k_early_free_attempts(job_id,user_id,credits,quote_micros) values(p_job,p_user,p_credits,p_quote_micros);
 update public.k4k_early_free_entitlements set status='reserved',attempts=attempts+1,job_id=p_job,updated_at=now() where user_id=p_user;
 -- The reservation records its internal funding; the customer-facing job cost is zero.
 update public.studio_generation_jobs set credits_reserved=0 where id=p_job and user_id=p_user;
 return v_result;
end;
$function$;
revoke all on function public.k4k_reserve_early_free_generation(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer,bigint,integer) from public,anon,authenticated;
grant execute on function public.k4k_reserve_early_free_generation(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer,bigint,integer) to service_role;
-- Existing completion/refund function updates the reservation atomically. For
-- a promo failure, remove its refund from the live wallet in that same transaction.
create or replace function public.k4k_early_free_settlement() returns trigger language plpgsql set search_path='' as $function$
declare v_attempt public.k4k_early_free_attempts%rowtype;
begin
 if old.status<>'reserved' or new.status not in ('settled','refunded') then return new;end if;
 select * into v_attempt from public.k4k_early_free_attempts where job_id=new.job_id and user_id=new.user_id for update;
 if not found then return new;end if;
 if v_attempt.status<>'reserved' or new.credit_mode<>'live' or new.credits<>v_attempt.credits then raise exception 'FREE_GENERATION_SETTLEMENT_INVALID';end if;
 if new.status='refunded' then
  update public.k4k_live_credit_accounts set balance=balance-v_attempt.credits,updated_at=now() where user_id=new.user_id and balance>=v_attempt.credits;
  if not found then raise exception 'FREE_GENERATION_SETTLEMENT_INVALID';end if;
 end if;
 update public.k4k_early_free_attempts set status=new.status where job_id=new.job_id;
 update public.k4k_early_free_entitlements set status=case when new.status='settled' then 'consumed' when attempts>=2 then 'exhausted' else 'available' end,job_id=case when new.status='settled' then new.job_id else null end,updated_at=now()
  where user_id=new.user_id and job_id=new.job_id and status='reserved';
 if not found then raise exception 'FREE_GENERATION_SETTLEMENT_INVALID';end if;
 return new;
end;
$function$;
revoke all on function public.k4k_early_free_settlement() from public,anon,authenticated;
grant execute on function public.k4k_early_free_settlement() to service_role;
create trigger k4k_early_free_settlement_trigger after update of status on public.k4k_generation_reservations for each row execute function public.k4k_early_free_settlement();
