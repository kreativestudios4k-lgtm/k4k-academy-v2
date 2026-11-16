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

-- Revoke the original failure settlement RPC from automatic refunds on jobs
-- which have ever been claimed for paid provider submission. An uncertain
-- paid submission must be resolved by an authenticated human-approved process.
-- The dispatch claim is never deleted on HTTP timeouts.
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
  if not exists(
   select 1 from public.k4k_multimodel_dispatch_claims c
    where c.job_id=p_job and c.user_id=p_user and c.provider_request_id=v_job.provider_request_id
      and c.recorded_at is not null
  ) then raise exception 'PROVIDER_NOT_RECORDED';end if;
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
  if exists(select 1 from public.k4k_multimodel_dispatch_claims
    where job_id=p_job and user_id=p_user)
  then raise exception 'PROVIDER_DISPATCH_REVIEW_REQUIRED';end if;
  update public.k4k_live_credit_accounts set balance=balance+v_res.credits,updated_at=now()
   where user_id=p_user;
  if not found then raise exception 'CREDIT_ACCOUNT_MISSING';end if;
  update public.k4k_multimodel_jobs set status='failed',updated_at=now() where id=p_job;
  update public.k4k_multimodel_reservations set status='refunded',updated_at=now() where job_id=p_job;
 end if;
 return jsonb_build_object('job_id',p_job,'status',
  case when p_outcome='completed' then 'settled' else 'refunded' end,'newly_finished',true);
end $$;
revoke all on function public.k4k_multimodel_finish_live(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_multimodel_finish_live(uuid,uuid,text,text,text) to service_role;
