-- Additive, separately metered generation jobs for the new K4K model families.
-- No changes to subscription products, existing credit balances or Wan ledger.
create table if not exists public.k4k_multimodel_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null check (model_id in ('kling-flash-t2v','flux3-t2i','nano-banana-21-t2i')),
  endpoint text not null,
  prompt text not null check (char_length(prompt) between 1 and 6000),
  parameters jsonb not null,
  kind text not null check (kind in ('image','video')),
  quote_micros bigint not null check (quote_micros between 1 and 2100000),
  quoted_credits integer not null check (quoted_credits between 1 and 10000),
  status text not null default 'draft' check (status in ('draft','queued','processing','completed','failed')),
  request_key uuid,
  provider_job_id text,
  output_path text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint k4k_multimodel_provider_job_unique unique(provider_job_id),
  constraint k4k_multimodel_one_request unique(user_id,request_key),
  constraint k4k_multimodel_output_terminal check (output_path is null or status='completed')
);
create index if not exists k4k_multimodel_owner_status_idx on public.k4k_multimodel_jobs(user_id,status,created_at desc);
create table if not exists public.k4k_multimodel_spend (
 job_id uuid primary key references public.k4k_multimodel_jobs(id) on delete restrict,
 user_id uuid not null references auth.users(id),
 quote_micros bigint not null check(quote_micros between 1 and 2100000),
 created_at timestamptz not null default now()
);
alter table public.k4k_multimodel_jobs enable row level security;
alter table public.k4k_multimodel_spend enable row level security;
revoke all on public.k4k_multimodel_jobs from anon,authenticated;
revoke all on public.k4k_multimodel_spend from anon,authenticated;
grant select on public.k4k_multimodel_jobs to authenticated;
drop policy if exists k4k_multimodel_select_own on public.k4k_multimodel_jobs;
create policy k4k_multimodel_select_own on public.k4k_multimodel_jobs
 for select to authenticated using (user_id=(select auth.uid()));
-- All writes are through service-role-only functions or authenticated server code.
create or replace function public.k4k_multimodel_reserve(
 p_user uuid,p_job uuid,p_key uuid,p_credits integer,
 p_quote_micros bigint,p_daily_budget_micros bigint,p_total_budget_micros bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.k4k_multimodel_jobs%rowtype;
 v_today bigint;v_total bigint;v_active integer;v_available integer;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null or p_job is null or p_key is null or p_credits not between 1 and 10000
  or p_quote_micros not between 1 and 2100000
  or p_daily_budget_micros not between 1 and 200000000
  or p_total_budget_micros not between 1 and 200000000 then raise exception 'INVALID_QUOTE';end if;
 if p_quote_micros>p_credits::bigint*100000 then raise exception 'PROVIDER_BUDGET_BLOCKED';end if;
 perform pg_catalog.pg_advisory_xact_lock(724313,1042026);
 select * into v_job from public.k4k_multimodel_jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'JOB_NOT_FOUND';end if;
 if v_job.status<>'draft' then
  if v_job.request_key=p_key then return jsonb_build_object('newly_reserved',false,'status',v_job.status,'job_id',p_job);end if;
  raise exception 'JOB_NOT_DRAFT';
 end if;
 if v_job.quote_micros<>p_quote_micros or v_job.quoted_credits<>p_credits
   or v_job.endpoint not in ('kling/v4/flash/text-to-video','blackforestlabs/flux-3/text-to-image','google/nano-banana-2.1') then raise exception 'QUOTE_CHANGED';end if;
 select count(*) into v_active from public.k4k_multimodel_jobs
  where user_id=p_user and status in ('queued','processing');
 if v_active>=1 then raise exception 'ACTIVE_JOB_LIMIT';end if;
 select coalesce(sum(quote_micros),0) into v_today from public.k4k_multimodel_spend
  where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select coalesce(sum(quote_micros),0) into v_total from public.k4k_multimodel_spend;
 if v_today+p_quote_micros>p_daily_budget_micros or v_total+p_quote_micros>p_total_budget_micros then raise exception 'PROVIDER_BUDGET_BLOCKED';end if;
 update public.k4k_live_credit_accounts
 set balance=balance-p_credits,updated_at=now()
 where user_id=p_user and not billing_hold and balance>=p_credits
 returning balance into v_available;
 if not found then raise exception 'INSUFFICIENT_CREDITS_OR_BILLING_HOLD';end if;
 update public.k4k_multimodel_jobs set status='queued',request_key=p_key,updated_at=now()
  where id=p_job and user_id=p_user;
 insert into public.k4k_multimodel_spend(job_id,user_id,quote_micros)
  values(p_job,p_user,p_quote_micros);
 return jsonb_build_object('newly_reserved',true,'status','queued','job_id',p_job,'credits',p_credits);
end $$;
create or replace function public.k4k_multimodel_finish(
 p_user uuid,p_job uuid,p_outcome text,p_output_path text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.k4k_multimodel_jobs%rowtype;v_path text;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_outcome not in ('completed','failed') then raise exception 'INVALID_OUTCOME';end if;
 select * into v_job from public.k4k_multimodel_jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'JOB_NOT_FOUND';end if;
 if v_job.status in ('completed','failed') then return jsonb_build_object('status',v_job.status,'replayed',true);end if;
 if v_job.status not in ('queued','processing') or v_job.provider_job_id is null then raise exception 'JOB_NOT_SETTLEABLE';end if;
 if p_outcome='completed' then
  v_path=p_user::text||'/'||p_job::text||case when v_job.kind='video' then '.mp4' else '.png' end;
  if p_output_path is distinct from v_path then raise exception 'INVALID_OUTPUT';end if;
  update public.k4k_multimodel_jobs set status='completed',output_path=v_path,updated_at=now()
   where id=p_job;
 else
  update public.k4k_live_credit_accounts set balance=balance+v_job.quoted_credits,updated_at=now()
   where user_id=p_user;
  if not found then raise exception 'CREDIT_ACCOUNT_MISSING';end if;
  update public.k4k_multimodel_jobs set status='failed',failure_code='PROVIDER_GENERATION_FAILED',updated_at=now()
   where id=p_job;
 end if;
 return jsonb_build_object('status',p_outcome,'job_id',p_job);
end $$;
revoke all on function public.k4k_multimodel_reserve(uuid,uuid,uuid,integer,bigint,bigint,bigint) from public,anon,authenticated;
revoke all on function public.k4k_multimodel_finish(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_reserve(uuid,uuid,uuid,integer,bigint,bigint,bigint) to service_role;
grant execute on function public.k4k_multimodel_finish(uuid,uuid,text,text) to service_role;
