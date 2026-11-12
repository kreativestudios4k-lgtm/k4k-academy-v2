-- REVIEW PATCH: not applied to the shared/production database.
-- Apply as a reviewed migration on an isolated test database first.
-- Only service-role callers may allocate a provider spending budget.
-- All new dispatches must use this RPC once the guard is enabled.
begin;
create table if not exists public.k4k_generation_budget_allocations (
 job_id uuid primary key references public.studio_generation_jobs(id) on delete restrict,
 user_id uuid not null,
 provider text not null check (provider in ('higgsfield','fal')),
 quote_micros bigint not null check (quote_micros > 0),
 created_at timestamptz not null default now()
);
create index if not exists k4k_generation_budget_allocations_created_idx
 on public.k4k_generation_budget_allocations(created_at);
alter table public.k4k_generation_budget_allocations enable row level security;
revoke all on public.k4k_generation_budget_allocations from public,anon,authenticated;
grant select,insert on public.k4k_generation_budget_allocations to service_role;

create or replace function public.k4k_generation_reserve_budgeted(
 p_user uuid,p_job uuid,p_key uuid,p_credits integer,p_enabled boolean,
 p_provider text,p_quote_micros bigint,p_daily_budget_micros bigint,p_max_active integer
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 v_existing public.k4k_generation_reservations%rowtype;
 v_job public.studio_generation_jobs%rowtype;
 v_used bigint;
 v_active bigint;
 v_day_start timestamptz;
 v_result jsonb;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_enabled is distinct from true then raise exception 'GENERATION_DISABLED'; end if;
 if p_provider is null or p_provider not in ('higgsfield','fal')
  or p_quote_micros is null or p_quote_micros < 1 or p_quote_micros > 5000000
  or p_daily_budget_micros is null or p_daily_budget_micros < 1
  or p_daily_budget_micros > 100000000000
  or p_max_active is null or p_max_active not between 1 and 10
  or p_credits is null or p_credits not between 1 and 10000
 then raise exception 'PROVIDER_BUDGET_BLOCKED'; end if;
 -- Serialize the global USD allocation and user active-job check with the
 -- credit reservation in one transaction. No network call occurs under lock.
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 select * into v_existing from public.k4k_generation_reservations
  where user_id=p_user and request_key=p_key;
 if found then
  if v_existing.job_id<>p_job or v_existing.credits<>p_credits then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'credits',v_existing.credits,'newly_reserved',false);
 end if;
 select * into v_existing from public.k4k_generation_reservations
  where user_id=p_user and job_id=p_job;
 if found then
  if v_existing.credits<>p_credits then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'credits',v_existing.credits,'newly_reserved',false);
 end if;
 select * into v_job from public.studio_generation_jobs where id=p_job and user_id=p_user;
 if not found or v_job.status<>'draft' then raise exception 'JOB_NOT_DRAFT'; end if;
 if coalesce(v_job.provider,'higgsfield')<>p_provider then raise exception 'INVALID_JOB'; end if;
 select count(*) into v_active from public.studio_generation_jobs
  where user_id=p_user and status in ('queued','processing');
 if v_active>=p_max_active then raise exception 'ACTIVE_JOB_LIMIT'; end if;
 v_day_start:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select coalesce(sum(quote_micros),0) into v_used from public.k4k_generation_budget_allocations
  where created_at>=v_day_start;
 if v_used+p_quote_micros>p_daily_budget_micros then raise exception 'PROVIDER_DAILY_BUDGET_BLOCKED'; end if;
 v_result:=public.k4k_generation_reserve_checked(p_user,p_job,p_key,p_credits,true);
 if (v_result->>'newly_reserved')::boolean is true then
  insert into public.k4k_generation_budget_allocations(job_id,user_id,provider,quote_micros)
   values(p_job,p_user,p_provider,p_quote_micros);
 end if;
 return v_result;
end;
$$;
revoke all on function public.k4k_generation_reserve_budgeted(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer) from public,anon,authenticated;
grant execute on function public.k4k_generation_reserve_budgeted(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer) to service_role;
commit;
-- Daily allocations intentionally remain counted even after a rejection/refund:
-- conservative upper bound, including uncertain dispatches, prevents overspend.
-- The cutover must stop all legacy dispatch paths; historic provider charges
-- before this guard are not represented. Do not activate midway through a day
-- without reconciling the provider's existing spending.
