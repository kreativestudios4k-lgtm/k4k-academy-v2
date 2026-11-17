-- Verified provider failure pathway for claimed multimodel jobs.
-- Only service_role can invoke this *after* a server-authenticated provider status lookup.
-- A browser-supplied failure, timeout, or missing request ID must never trigger this RPC.
create table if not exists public.k4k_multimodel_terminal_evidence(
 job_id uuid primary key references public.k4k_multimodel_jobs(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete restrict,
 provider text not null check(provider in ('fal','higgsfield')),
 provider_request_id text not null,
 terminal_status text not null check(terminal_status in ('failed','nsfw','canceled')),
 evidence_digest text not null check(evidence_digest ~ '^[0-9a-f]{64}$'),
 confirmed_at timestamptz not null default now()
);
alter table public.k4k_multimodel_terminal_evidence enable row level security;
revoke all on public.k4k_multimodel_terminal_evidence from public,anon,authenticated;
grant select,insert on public.k4k_multimodel_terminal_evidence to service_role;
create or replace function public.k4k_multimodel_refund_confirmed_provider_failure(
 p_user uuid,p_job uuid,p_provider_request text,p_terminal_status text,p_evidence_digest text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_res public.k4k_multimodel_reservations%rowtype;
 v_job public.k4k_multimodel_jobs%rowtype;
 v_claim public.k4k_multimodel_dispatch_claims%rowtype;
 v_prior public.k4k_multimodel_terminal_evidence%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null or p_job is null
 or p_provider_request is null or p_provider_request !~ '^[A-Za-z0-9_-]{1,128}$'
 or p_terminal_status not in ('failed','nsfw','canceled')
 or p_evidence_digest is null or p_evidence_digest !~ '^[a-f0-9]{64}$'
 then raise exception 'INVALID_VERIFIED_TERMINAL_EVIDENCE';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 select * into v_res from public.k4k_multimodel_reservations where job_id=p_job and user_id=p_user for update;
 if not found then raise exception 'RESERVATION_NOT_FOUND';end if;
 select * into v_job from public.k4k_multimodel_jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'JOB_NOT_FOUND';end if;
 select * into v_claim from public.k4k_multimodel_dispatch_claims where job_id=p_job and user_id=p_user for update;
 if not found or v_claim.provider_request_id is distinct from p_provider_request
 or v_claim.recorded_at is null or v_job.provider_request_id is distinct from p_provider_request
 then raise exception 'PROVIDER_REQUEST_NOT_AUTHENTICATED';end if;
 if v_res.status='settled' then
  return jsonb_build_object('job_id',p_job,'status','settled','newly_finished',false);
 end if;
 if v_res.status='refunded' then
  select * into v_prior from public.k4k_multimodel_terminal_evidence where job_id=p_job;
  if not found or v_prior.provider_request_id<>p_provider_request or v_prior.terminal_status<>p_terminal_status
    or v_prior.evidence_digest<>p_evidence_digest
  then raise exception 'EVIDENCE_CONFLICT';end if;
  return jsonb_build_object('job_id',p_job,'status','refunded','newly_finished',false);
 end if;
 if v_res.status<>'reserved' or v_job.status<>'processing' or v_job.provider not in ('fal','higgsfield')
 then raise exception 'INVALID_JOB_STATE';end if;
 insert into public.k4k_multimodel_terminal_evidence(job_id,user_id,provider,provider_request_id,terminal_status,evidence_digest)
 values(p_job,p_user,v_job.provider,p_provider_request,p_terminal_status,p_evidence_digest);
 update public.k4k_live_credit_accounts set balance=balance+v_res.credits,updated_at=now()
 where user_id=p_user;
 if not found then raise exception 'CREDIT_ACCOUNT_MISSING';end if;
 update public.k4k_multimodel_jobs set status='failed',error_code='PROVIDER_'||upper(p_terminal_status),updated_at=now() where id=p_job;
 update public.k4k_multimodel_reservations set status='refunded',updated_at=now() where job_id=p_job;
 return jsonb_build_object('job_id',p_job,'status','refunded','newly_finished',true);
end $$;
revoke all on function public.k4k_multimodel_refund_confirmed_provider_failure(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_refund_confirmed_provider_failure(uuid,uuid,text,text,text) to service_role;
