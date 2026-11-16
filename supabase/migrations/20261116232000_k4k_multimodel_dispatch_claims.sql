-- One irreversible dispatch claim per paid multimodel job.
-- A claimed job with unknown provider result must be reconciled manually;
-- NEVER automatically retry or refund a possibly accepted paid request.
create table if not exists public.k4k_multimodel_dispatch_claims(
 job_id uuid primary key references public.k4k_multimodel_jobs(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 provider_request_id text unique,
 claimed_at timestamptz not null default now(),
 recorded_at timestamptz,
 constraint provider_request_paired check(
  (provider_request_id is null and recorded_at is null)
  or (provider_request_id is not null and recorded_at is not null)
 )
);
alter table public.k4k_multimodel_dispatch_claims enable row level security;
revoke all on public.k4k_multimodel_dispatch_claims from public,anon,authenticated;
grant select,insert,update on public.k4k_multimodel_dispatch_claims to service_role;

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
     and j.provider='fal' and r.status='reserved'
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

create or replace function public.k4k_multimodel_record_provider_request(
 p_user uuid,p_job uuid,p_provider_request text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_claim public.k4k_multimodel_dispatch_claims%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_provider_request is null or p_provider_request !~ '^[a-zA-Z0-9_-]{1,128}$' then raise exception 'INVALID_PROVIDER_REQUEST';end if;
 select * into v_claim from public.k4k_multimodel_dispatch_claims
  where job_id=p_job and user_id=p_user for update;
 if not found then raise exception 'DISPATCH_CLAIM_NOT_FOUND';end if;
 if v_claim.provider_request_id is not null then
  if v_claim.provider_request_id<>p_provider_request then raise exception 'PROVIDER_REQUEST_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'recorded',false,'status','processing');
 end if;
 update public.k4k_multimodel_jobs set provider_request_id=p_provider_request,
  status='processing',updated_at=now()
  where id=p_job and user_id=p_user and status='queued'
    and provider_request_id is null;
 if not found then raise exception 'INVALID_JOB_STATE';end if;
 update public.k4k_multimodel_dispatch_claims set provider_request_id=p_provider_request,
  recorded_at=now() where job_id=p_job and user_id=p_user;
 return jsonb_build_object('job_id',p_job,'recorded',true,'status','processing');
end $$;

revoke all on function public.k4k_multimodel_claim_dispatch(uuid,uuid) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_claim_dispatch(uuid,uuid) to service_role;
revoke all on function public.k4k_multimodel_record_provider_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_record_provider_request(uuid,uuid,text) to service_role;
