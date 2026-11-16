-- Staged only: atomic, idempotent live-wallet reservation and settlement
-- for isolated multimodel jobs. No existing function/table is replaced.
create table if not exists public.k4k_multimodel_reservations(
 job_id uuid primary key references public.k4k_multimodel_jobs(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 request_key uuid not null,
 credits integer not null check(credits between 1 and 10000),
 quote_micros bigint not null check(quote_micros between 1 and 5000000),
 status text not null default 'reserved' check(status in ('reserved','settled','refunded')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,request_key)
);
-- Multimodel jobs cannot be inserted into the legacy allocation table:
-- its job_id FK points exclusively to studio_generation_jobs.
-- Keep separate FK-safe allocations, but count BOTH under the same lock.
create table if not exists public.k4k_multimodel_budget_allocations(
 job_id uuid primary key references public.k4k_multimodel_jobs(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 provider text not null default 'fal' check(provider='fal'),
 quote_micros bigint not null check(quote_micros between 1 and 5000000),
 created_at timestamptz not null default now()
);
create index if not exists k4k_multimodel_budget_allocations_created
 on public.k4k_multimodel_budget_allocations(created_at);
alter table public.k4k_multimodel_budget_allocations enable row level security;
revoke all on public.k4k_multimodel_budget_allocations from public,anon,authenticated;
grant select,insert on public.k4k_multimodel_budget_allocations to service_role;
alter table public.k4k_multimodel_reservations enable row level security;
revoke all on public.k4k_multimodel_reservations from public,anon,authenticated;
grant select,insert,update on public.k4k_multimodel_reservations to service_role;
grant usage on schema public to service_role;

create or replace function public.k4k_multimodel_reserve_live(
 p_user uuid,p_job uuid,p_key uuid,p_fingerprint text,
 p_quote_micros bigint,p_credits integer,p_enabled boolean,
 p_daily_budget_micros bigint,p_total_budget_micros bigint,p_max_active integer
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 v_job public.k4k_multimodel_jobs%rowtype;
 v_existing public.k4k_multimodel_reservations%rowtype;
 v_day bigint;v_total bigint;v_active bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_enabled is distinct from true then raise exception 'GENERATION_DISABLED';end if;
 if p_user is null or p_job is null or p_key is null
  or p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$'
  or p_quote_micros is null or p_quote_micros not between 1 and 5000000
  or p_credits is null or p_credits not between 1 and 10000
  or p_daily_budget_micros is null or p_daily_budget_micros not between 1 and 100000000000
  or p_total_budget_micros is null or p_total_budget_micros not between 1 and 100000000000
  or p_max_active is null or p_max_active not between 1 and 10
 then raise exception 'INVALID_RESERVATION';end if;
 -- Shared lock with the existing production budget-ledger allocator.
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 select * into v_existing from public.k4k_multimodel_reservations
  where user_id=p_user and request_key=p_key;
 if found then
  if v_existing.job_id<>p_job or v_existing.credits<>p_credits or v_existing.quote_micros<>p_quote_micros
  then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'newly_reserved',false,'credits',v_existing.credits);
 end if;
 select * into v_existing from public.k4k_multimodel_reservations where job_id=p_job;
 if found then
  if v_existing.user_id<>p_user or v_existing.credits<>p_credits or v_existing.quote_micros<>p_quote_micros
  then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'newly_reserved',false,'credits',v_existing.credits);
 end if;
 select * into v_job from public.k4k_multimodel_jobs where id=p_job and user_id=p_user for update;
 if not found or v_job.status<>'draft' or v_job.provider<>'fal'
  or v_job.input_fingerprint<>p_fingerprint
  or v_job.quote_expires_at is null or v_job.quote_expires_at<=now()
  or v_job.quoted_usd_micros is distinct from p_quote_micros
  or v_job.credits_quoted is distinct from p_credits
 then raise exception 'QUOTE_CHANGED';end if;
 -- Do not allow a service caller to overcharge relative to the configured
 -- current minimum rate of $0.10/credit.
 if p_quote_micros>p_credits::bigint*100000 then raise exception 'PROVIDER_BUDGET_BLOCKED';end if;
 select count(*) into v_active from (
  select id from public.studio_generation_jobs where user_id=p_user and status in ('queued','processing')
  union all
  select id from public.k4k_multimodel_jobs where user_id=p_user and status in ('queued','processing')
 ) active_jobs;
 if v_active>=p_max_active then raise exception 'ACTIVE_JOB_LIMIT';end if;
 select coalesce(sum(quote_micros),0),
  coalesce(sum(quote_micros) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0)
  into v_total,v_day from (
   select quote_micros,created_at from public.k4k_generation_budget_allocations
   union all
   select quote_micros,created_at from public.k4k_multimodel_budget_allocations
  ) unified_allocations;
 if v_day+p_quote_micros>p_daily_budget_micros then raise exception 'PROVIDER_DAILY_BUDGET_BLOCKED';end if;
 if v_total+p_quote_micros>p_total_budget_micros then raise exception 'PROVIDER_TOTAL_BUDGET_BLOCKED';end if;
 -- Conditional debit is atomic: billing holds and short balances fail closed.
 update public.k4k_live_credit_accounts set balance=balance-p_credits,updated_at=now()
  where user_id=p_user and not billing_hold and balance>=p_credits;
 if not found then
  if exists(select 1 from public.k4k_live_credit_accounts where user_id=p_user and billing_hold)
   then raise exception 'BILLING_REVIEW_REQUIRED';end if;
  raise exception 'INSUFFICIENT_CREDITS';
 end if;
 insert into public.k4k_multimodel_reservations(job_id,user_id,request_key,credits,quote_micros)
  values(p_job,p_user,p_key,p_credits,p_quote_micros);
 update public.k4k_multimodel_jobs set status='queued',updated_at=now()
  where id=p_job and user_id=p_user and status='draft';
 if not found then raise exception 'JOB_NOT_DRAFT';end if;
 insert into public.k4k_multimodel_budget_allocations(job_id,user_id,provider,quote_micros)
  values(p_job,p_user,'fal',p_quote_micros);
 return jsonb_build_object('job_id',p_job,'status','reserved','newly_reserved',true,'credits',p_credits);
end $$;

create or replace function public.k4k_multimodel_finish_live(
 p_user uuid,p_job uuid,p_outcome text,p_output_mime text default null,p_output_path text default null
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_res public.k4k_multimodel_reservations%rowtype;
 v_job public.k4k_multimodel_jobs%rowtype;v_extension text;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_outcome not in ('completed','failed') then raise exception 'INVALID_OUTCOME';end if;
 select * into v_res from public.k4k_multimodel_reservations
  where job_id=p_job and user_id=p_user for update;
 if not found then raise exception 'RESERVATION_NOT_FOUND';end if;
 if v_res.status<>'reserved' then
  return jsonb_build_object('job_id',p_job,'status',v_res.status,'newly_finished',false);
 end if;
 select * into v_job from public.k4k_multimodel_jobs where id=p_job and user_id=p_user for update;
 if not found or v_job.status not in ('queued','processing') then raise exception 'INVALID_JOB_STATE';end if;
 if p_outcome='completed' then
  if v_job.provider_request_id is null then raise exception 'PROVIDER_NOT_RECORDED';end if;
  v_extension:=case p_output_mime when 'video/mp4' then 'mp4'
   when 'image/png' then 'png' when 'image/jpeg' then 'jpg' else null end;
  if v_extension is null
   or (v_job.media_kind='video' and p_output_mime<>'video/mp4')
   or (v_job.media_kind='image' and p_output_mime not in ('image/png','image/jpeg'))
   or p_output_path is distinct from (p_user::text||'/'||p_job::text||'.'||v_extension)
  then raise exception 'INVALID_OUTPUT';end if;
  update public.k4k_multimodel_jobs set status='completed',output_mime=p_output_mime,
   output_path=p_output_path,updated_at=now() where id=p_job;
  update public.k4k_multimodel_reservations set status='settled',updated_at=now() where job_id=p_job;
 else
  if p_output_path is not null or p_output_mime is not null then raise exception 'INVALID_OUTPUT';end if;
  update public.k4k_live_credit_accounts set balance=balance+v_res.credits,updated_at=now()
   where user_id=p_user;
  if not found then raise exception 'CREDIT_ACCOUNT_MISSING';end if;
  update public.k4k_multimodel_jobs set status='failed',updated_at=now() where id=p_job;
  update public.k4k_multimodel_reservations set status='refunded',updated_at=now() where job_id=p_job;
 end if;
 return jsonb_build_object('job_id',p_job,'status',
  case when p_outcome='completed' then 'settled' else 'refunded' end,'newly_finished',true);
end $$;

revoke all on function public.k4k_multimodel_reserve_live(uuid,uuid,uuid,text,bigint,integer,boolean,bigint,bigint,integer) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_reserve_live(uuid,uuid,uuid,text,bigint,integer,boolean,bigint,bigint,integer) to service_role;
revoke all on function public.k4k_multimodel_finish_live(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_finish_live(uuid,uuid,text,text,text) to service_role;
