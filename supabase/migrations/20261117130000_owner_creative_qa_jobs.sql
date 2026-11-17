-- Owner-only fal image/video QA. No customer credits or plans touched.
create table if not exists public.k4k_owner_creative_qa_jobs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 request_key uuid not null unique,
 model_key text not null check(model_key in ('seedance_2_5','kling4_0','nano_banana_2','flux_3_image')),
 endpoint text not null,
 prompt_hash text not null check(prompt_hash ~ '^[0-9a-f]{64}$'),
 budget_reservation_micros bigint not null check(budget_reservation_micros between 1 and 5000000),
 status text not null default 'dispatching' check(status in ('dispatching','submitted','completed','failed','review')),
 provider_request_id text unique,
 output_path text,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.k4k_owner_creative_qa_jobs enable row level security;
revoke all on public.k4k_owner_creative_qa_jobs from public,anon,authenticated;
grant select,insert,update on public.k4k_owner_creative_qa_jobs to service_role;
create or replace function public.k4k_owner_creative_qa_reserve(
 p_owner uuid,p_key uuid,p_model text,p_endpoint text,p_hash text,p_micros bigint)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v public.k4k_owner_creative_qa_jobs%rowtype;
declare v_today bigint;
declare v_total bigint;
declare v_count int;
begin
 if current_user<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_owner is distinct from '0ef1af08-4df8-4858-967b-eac1a16f9f2c'::uuid
  or p_model not in ('seedance_2_5','kling4_0','nano_banana_2','flux_3_image')
  or p_key is null or p_hash !~ '^[0-9a-f]{64}$'
  or p_micros is null or p_micros not between 1 and 5000000
  or p_endpoint is null or length(p_endpoint)>130 then raise exception 'INVALID_QA';end if;
 perform pg_catalog.pg_advisory_xact_lock(862149,1102026);
 select * into v from public.k4k_owner_creative_qa_jobs where request_key=p_key;
 if found then
  if v.owner_id<>p_owner or v.model_key<>p_model or v.prompt_hash<>p_hash or v.endpoint<>p_endpoint
   then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('id',v.id,'status',v.status,'newly_reserved',false);
 end if;
 select count(*),coalesce(sum(budget_reservation_micros),0),
  coalesce(sum(budget_reservation_micros) filter(where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),0)
 into v_count,v_total,v_today from public.k4k_owner_creative_qa_jobs;
 if v_count>=10 or v_total+p_micros>25000000 then raise exception 'QA_TOTAL_LIMIT';end if;
 if v_today+p_micros>10000000 or
  (select count(*) from public.k4k_owner_creative_qa_jobs where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=3
  then raise exception 'QA_DAILY_LIMIT';end if;
 if exists(select 1 from public.k4k_owner_creative_qa_jobs where status in ('dispatching','submitted','review'))
  then raise exception 'QA_ACTIVE_JOB';end if;
 insert into public.k4k_owner_creative_qa_jobs(owner_id,request_key,model_key,endpoint,prompt_hash,budget_reservation_micros)
 values(p_owner,p_key,p_model,p_endpoint,p_hash,p_micros) returning * into v;
 return jsonb_build_object('id',v.id,'status',v.status,'newly_reserved',true);
end $fn$;
revoke all on function public.k4k_owner_creative_qa_reserve(uuid,uuid,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.k4k_owner_creative_qa_reserve(uuid,uuid,text,text,text,bigint) to service_role;
