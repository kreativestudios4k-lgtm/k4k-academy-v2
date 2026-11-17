-- Higgsfield billing QA SANDBOX ONLY. Independent credits are non-redeemable.
-- Does not alter any Stripe plan, customer credit account or production generation job.
create table if not exists public.k4k_hf_preview_wallets(
 user_id uuid primary key references auth.users(id) on delete restrict,
 sandbox_credits integer not null default 0 check(sandbox_credits between 0 and 100000),
 billing_hold boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.k4k_hf_preview_billing_jobs(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete restrict,
 request_key uuid not null,
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 quote_micros bigint not null check(quote_micros between 1 and 5000000),
 credits integer not null check(credits between 1 and 10000),
 state text not null default 'reserved' check(state in ('reserved','submitted','settled','refunded','review_required')),
 provider_request_id text unique check(provider_request_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,request_key),
 constraint hf_preview_request_state check (
  (state='reserved' and provider_request_id is null)
  or (state in ('submitted','settled','refunded','review_required') and provider_request_id is not null)
 )
);
create index if not exists k4k_hf_preview_billing_created on public.k4k_hf_preview_billing_jobs(created_at);
alter table public.k4k_hf_preview_wallets enable row level security;
alter table public.k4k_hf_preview_billing_jobs enable row level security;
revoke all on public.k4k_hf_preview_wallets from public,anon,authenticated;
revoke all on public.k4k_hf_preview_billing_jobs from public,anon,authenticated;
grant select,insert,update on public.k4k_hf_preview_wallets to service_role;
grant select,insert,update on public.k4k_hf_preview_billing_jobs to service_role;

-- All functions require server service_role and a separate preview-only web gate.
-- No client receives any authority to mint sandbox credits or charge live credits.
create or replace function public.k4k_hf_preview_reserve(
 p_user uuid,p_job uuid,p_key uuid,p_fingerprint text,p_quote_micros bigint,
 p_credits integer,p_daily_budget_micros bigint,p_total_budget_micros bigint,
 p_max_active integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.k4k_hf_preview_billing_jobs%rowtype;
 v_day bigint;v_total bigint;v_active integer;
begin
 if current_user<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null or p_job is null or p_key is null
 or p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$'
 or p_quote_micros is null or p_quote_micros not between 1 and 5000000
 or p_credits is null or p_credits not between 1 and 10000
 or p_quote_micros>p_credits::bigint*100000
 or p_daily_budget_micros is null or p_daily_budget_micros not between 1 and 100000000
 or p_total_budget_micros is null or p_total_budget_micros not between 1 and 100000000
 or p_max_active is null or p_max_active not between 1 and 5
 then raise exception 'INVALID_PREVIEW_QUOTE';end if;
 perform pg_catalog.pg_advisory_xact_lock(734512,17112026);
 select * into v from public.k4k_hf_preview_billing_jobs where user_id=p_user and request_key=p_key;
 if found then
  if v.id<>p_job or v.fingerprint<>p_fingerprint or v.quote_micros<>p_quote_micros or v.credits<>p_credits
   then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'state',v.state,'newly_reserved',false);
 end if;
 select * into v from public.k4k_hf_preview_billing_jobs where id=p_job;
 if found then
  if v.user_id<>p_user or v.request_key<>p_key or v.fingerprint<>p_fingerprint or v.quote_micros<>p_quote_micros or v.credits<>p_credits
   then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'state',v.state,'newly_reserved',false);
 end if;
 select coalesce(sum(quote_micros),0),coalesce(sum(quote_micros) filter(
  where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0),
  count(*) filter(where state in ('reserved','submitted','review_required'))
 into v_total,v_day,v_active from public.k4k_hf_preview_billing_jobs;
 if v_day+p_quote_micros>p_daily_budget_micros then raise exception 'DAILY_BUDGET_BLOCKED';end if;
 if v_total+p_quote_micros>p_total_budget_micros then raise exception 'TOTAL_BUDGET_BLOCKED';end if;
 if v_active>=p_max_active then raise exception 'ACTIVE_JOB_LIMIT';end if;
 update public.k4k_hf_preview_wallets set sandbox_credits=sandbox_credits-p_credits,updated_at=now()
 where user_id=p_user and not billing_hold and sandbox_credits>=p_credits;
 if not found then raise exception 'INSUFFICIENT_SANDBOX_CREDITS_OR_HOLD';end if;
 insert into public.k4k_hf_preview_billing_jobs(id,user_id,request_key,fingerprint,quote_micros,credits)
 values(p_job,p_user,p_key,p_fingerprint,p_quote_micros,p_credits);
 return jsonb_build_object('job_id',p_job,'state','reserved','newly_reserved',true);
end $$;

create or replace function public.k4k_hf_preview_record_provider(
 p_user uuid,p_job uuid,p_request text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.k4k_hf_preview_billing_jobs%rowtype;
begin
 if current_user<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_request is null or p_request !~ '^[a-zA-Z0-9_-]{1,128}$' then raise exception 'INVALID_PROVIDER_REQUEST';end if;
 select * into v from public.k4k_hf_preview_billing_jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'JOB_NOT_FOUND';end if;
 if v.state='submitted' and v.provider_request_id=p_request then
  return jsonb_build_object('job_id',p_job,'state','submitted','newly_recorded',false);
 end if;
 if v.state<>'reserved' or v.provider_request_id is not null then raise exception 'INVALID_JOB_STATE';end if;
 update public.k4k_hf_preview_billing_jobs set state='submitted',provider_request_id=p_request,updated_at=now() where id=p_job;
 return jsonb_build_object('job_id',p_job,'state','submitted','newly_recorded',true);
end $$;

create or replace function public.k4k_hf_preview_finish(
 p_user uuid,p_job uuid,p_request text,p_outcome text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.k4k_hf_preview_billing_jobs%rowtype;v_next text;
begin
 if current_user<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_outcome not in ('completed','failed') or p_request is null then raise exception 'INVALID_OUTCOME';end if;
 select * into v from public.k4k_hf_preview_billing_jobs where id=p_job and user_id=p_user for update;
 if not found or v.provider_request_id is distinct from p_request then raise exception 'PROVIDER_REQUEST_MISMATCH';end if;
 if v.state in ('settled','refunded') then
  return jsonb_build_object('job_id',p_job,'state',v.state,'newly_finished',false);
 end if;
 if v.state<>'submitted' then raise exception 'RECONCILIATION_REQUIRED';end if;
 v_next:=case when p_outcome='completed' then 'settled' else 'refunded' end;
 if v_next='refunded' then
  update public.k4k_hf_preview_wallets
  set sandbox_credits=sandbox_credits+v.credits,updated_at=now() where user_id=p_user;
  if not found then raise exception 'SANDBOX_WALLET_MISSING';end if;
 end if;
 update public.k4k_hf_preview_billing_jobs set state=v_next,updated_at=now() where id=p_job;
 return jsonb_build_object('job_id',p_job,'state',v_next,'newly_finished',true);
end $$;

revoke all on function public.k4k_hf_preview_reserve(uuid,uuid,uuid,text,bigint,integer,bigint,bigint,integer) from public,anon,authenticated;
revoke all on function public.k4k_hf_preview_record_provider(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.k4k_hf_preview_finish(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.k4k_hf_preview_reserve(uuid,uuid,uuid,text,bigint,integer,bigint,bigint,integer) to service_role;
grant execute on function public.k4k_hf_preview_record_provider(uuid,uuid,text) to service_role;
grant execute on function public.k4k_hf_preview_finish(uuid,uuid,text,text) to service_role;
