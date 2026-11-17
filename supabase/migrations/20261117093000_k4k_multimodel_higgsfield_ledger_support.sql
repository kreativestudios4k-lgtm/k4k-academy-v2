-- Add first-class Higgsfield model identities to the isolated multimodel ledger.
-- DO NOT enable provider dispatch. Existing customer balances and subscriptions unchanged.
-- Both providers use the same global budget advisory lock and private credit wallet.
alter table public.k4k_multimodel_jobs drop constraint if exists k4k_multimodel_jobs_provider_check;
alter table public.k4k_multimodel_jobs add constraint k4k_multimodel_jobs_provider_check check(provider in ('fal','higgsfield'));
alter table public.k4k_multimodel_jobs drop constraint if exists k4k_multimodel_jobs_model_check;
alter table public.k4k_multimodel_jobs add constraint k4k_multimodel_jobs_model_check check(model in ('kling-flash-t2v','seedance-25-t2v','flux3-t2i','nano-banana-21-t2i','genjutsu-motion'));
alter table public.k4k_multimodel_jobs drop constraint if exists multimodel_kind_match;
alter table public.k4k_multimodel_jobs add constraint multimodel_kind_match check(
 (provider='higgsfield' and model='genjutsu-motion' and media_kind='video')
 or (provider='fal' and model in ('kling-flash-t2v','seedance-25-t2v') and media_kind='video')
 or (provider='fal' and model in ('flux3-t2i','nano-banana-21-t2i') and media_kind='image')
);
alter table public.k4k_multimodel_budget_allocations drop constraint if exists k4k_multimodel_budget_allocations_provider_check;
alter table public.k4k_multimodel_budget_allocations add constraint k4k_multimodel_budget_allocations_provider_check check(provider in ('fal','higgsfield'));

-- Reserve remains live-wallet atomic and idempotent. No model-specific HTTP access added.
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
 if not found or v_job.status<>'draft' or v_job.provider not in ('fal','higgsfield')
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
  values(p_job,p_user,v_job.provider,p_quote_micros);
 return jsonb_build_object('job_id',p_job,'status','reserved','newly_reserved',true,'credits',p_credits);
end $$;


-- One-shot dispatch claims now accept either supported provider; each job remains unique.
create or replace function public.k4k_multimodel_claim_dispatch(p_user uuid,p_job uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_claim public.k4k_multimodel_dispatch_claims%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null or p_job is null then raise exception 'INVALID_JOB';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 if not exists(
   select 1 from public.k4k_multimodel_jobs j
   join public.k4k_multimodel_reservations r on r.job_id=j.id and r.user_id=j.user_id
   where j.id=p_job and j.user_id=p_user and j.status='queued'
     and j.provider in ('fal','higgsfield') and r.status='reserved'
 ) then raise exception 'DISPATCH_NOT_READY';end if;
 insert into public.k4k_multimodel_dispatch_claims(job_id,user_id)
 values(p_job,p_user) on conflict(job_id) do nothing;
 if found then return jsonb_build_object('job_id',p_job,'claimed',true,'state','dispatch_uncertain');end if;
 select * into v_claim from public.k4k_multimodel_dispatch_claims
  where job_id=p_job and user_id=p_user;
 if not found then raise exception 'DISPATCH_IDENTITY_MISMATCH';end if;
 return jsonb_build_object('job_id',p_job,'claimed',false,
  'state',case when v_claim.provider_request_id is null then 'dispatch_uncertain' else 'provider_recorded' end);
end $$;

