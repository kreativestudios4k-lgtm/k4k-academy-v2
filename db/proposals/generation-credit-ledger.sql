-- REVIEW ONLY: not a migration and not applied to any hosted database.
-- Wrap in one transaction when promoted to a reviewed migration.
-- Existing public.studio_credit_accounts balances are never seeded here.
begin;
create schema k4k_generation;
revoke all on schema k4k_generation from public, anon, authenticated;
grant usage on schema k4k_generation to service_role;
create table k4k_generation.jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.studio_credit_accounts(user_id),
 request_key uuid not null,
 input jsonb not null check (jsonb_typeof(input)='object'),
 credits integer not null check (credits between 1 and 10000),
 state text not null default 'reserved' check(state in ('reserved','submitting','queued','in_progress','completed','refunded')),
 provider_id text unique,
 provider_status_url text,
 provider_status text,
 output_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,request_key)
);
create index on k4k_generation.jobs(user_id,state);
create table k4k_generation.ledger (
 job_id uuid not null references k4k_generation.jobs(id),
 kind text not null check(kind in ('reserve','refund')),
 delta integer not null check((kind='reserve' and delta<0) or (kind='refund' and delta>0)),
 created_at timestamptz not null default now(),
 primary key(job_id,kind)
);
alter table k4k_generation.jobs enable row level security;
alter table k4k_generation.ledger enable row level security;
revoke all on all tables in schema k4k_generation from public,anon,authenticated;
grant select,insert,update on k4k_generation.jobs to service_role;
grant select,insert on k4k_generation.ledger to service_role;
-- SECURITY INVOKER: service_role only; never pass user_id/cost/input straight
-- from a browser. The server validates the session and derives an approved quote.
create function public.k4k_generation_reserve(p_user uuid,p_key uuid,p_input jsonb,p_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j k4k_generation.jobs; available integer;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 if p_user is null or p_key is null or p_credits is null or p_credits not between 1 and 10000 or p_input is null or jsonb_typeof(p_input)<>'object' then raise exception 'Invalid reservation'; end if;
 -- All mutations lock the account before the job: serializes spends per user.
 select balance into available from public.studio_credit_accounts where user_id=p_user for update;
 if not found then raise exception 'Credit account missing'; end if;
 select * into j from k4k_generation.jobs where user_id=p_user and request_key=p_key for update;
 if found then
  if j.input<>p_input or j.credits<>p_credits then raise exception 'Idempotency conflict'; end if;
  return to_jsonb(j);
 end if;
 if available<p_credits then raise exception 'Insufficient credits'; end if;
 if (select count(*) from k4k_generation.jobs where user_id=p_user and state in ('reserved','submitting','queued','in_progress')) >= 2 then raise exception 'Concurrent job limit'; end if;
 update public.studio_credit_accounts set balance=balance-p_credits,updated_at=now() where user_id=p_user;
 insert into k4k_generation.jobs(user_id,request_key,input,credits) values(p_user,p_key,p_input,p_credits) returning * into j;
 insert into k4k_generation.ledger(job_id,kind,delta) values(j.id,'reserve',-p_credits);
 return to_jsonb(j);
end $$;
create function public.k4k_generation_submitting(p_user uuid,p_job uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j k4k_generation.jobs;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 perform 1 from public.studio_credit_accounts where user_id=p_user for update;
 select * into j from k4k_generation.jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'Job not found'; end if;
 if j.state='reserved' then
  update k4k_generation.jobs set state='submitting',updated_at=now() where id=j.id returning * into j;
 elsif j.state<>'submitting' then raise exception 'Invalid submission state'; end if;
 -- A submitting retry must use the saved input and SAME provider idempotency key.
 return to_jsonb(j);
end $$;
create function public.k4k_generation_attach(p_user uuid,p_job uuid,p_provider_id text,p_status_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j k4k_generation.jobs;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 if p_provider_id is null or p_provider_id !~ '^[a-zA-Z0-9_-]{1,128}$' or p_status_url is distinct from 'https://api.higgsfield.ai/requests/'||p_provider_id||'/status' then raise exception 'Invalid provider ID'; end if;
 perform 1 from public.studio_credit_accounts where user_id=p_user for update;
 select * into j from k4k_generation.jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'Job not found'; end if;
 if j.provider_id is not null then
  if j.provider_id<>p_provider_id or j.provider_status_url is distinct from p_status_url then raise exception 'Provider ID conflict'; end if;
  return to_jsonb(j);
 end if;
 if j.state<>'submitting' then raise exception 'Invalid submission state'; end if;
 update k4k_generation.jobs set state='queued',provider_id=p_provider_id,provider_status_url=p_status_url,provider_status='queued',updated_at=now() where id=j.id returning * into j;
 return to_jsonb(j);
end $$;
create function public.k4k_generation_settle(p_user uuid,p_job uuid,p_provider_id text,p_status text,p_output_url text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j k4k_generation.jobs;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 if p_status is null or p_status not in ('queued','in_progress','completed','failed','nsfw','canceled') then raise exception 'Unverified provider outcome'; end if;
 perform 1 from public.studio_credit_accounts where user_id=p_user for update;
 select * into j from k4k_generation.jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'Job not found'; end if;
 if j.provider_id is null or p_provider_id is distinct from j.provider_id then raise exception 'Provider ID mismatch'; end if;
 if j.state in ('completed','refunded') then
  if p_status is distinct from j.provider_status or (p_status='completed' and p_output_url is distinct from j.output_url) then raise exception 'Conflicting terminal outcome'; end if;
  return to_jsonb(j);
 end if;
 if p_status='completed' and (p_output_url is null or p_output_url !~ '^https://[^[:space:]]+$') then raise exception 'Output required'; end if;
 if p_status in ('failed','nsfw','canceled') then
  insert into k4k_generation.ledger(job_id,kind,delta) values(j.id,'refund',j.credits);
  update public.studio_credit_accounts set balance=balance+j.credits,updated_at=now() where user_id=p_user;
 end if;
 -- A stale queued poll cannot move an in-progress job backwards.
 if j.state='in_progress' and p_status='queued' then return to_jsonb(j); end if;
 update k4k_generation.jobs set state=case when p_status in ('failed','nsfw','canceled') then 'refunded' else p_status end,
 provider_status=p_status,output_url=case when p_status='completed' then p_output_url else null end,updated_at=now() where id=j.id returning * into j;
 return to_jsonb(j);
end $$;
revoke all on function public.k4k_generation_reserve(uuid,uuid,jsonb,integer) from public,anon,authenticated;
revoke all on function public.k4k_generation_submitting(uuid,uuid) from public,anon,authenticated;
revoke all on function public.k4k_generation_attach(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.k4k_generation_settle(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_generation_reserve(uuid,uuid,jsonb,integer) to service_role;
grant execute on function public.k4k_generation_submitting(uuid,uuid) to service_role;
grant execute on function public.k4k_generation_attach(uuid,uuid,text,text) to service_role;
grant execute on function public.k4k_generation_settle(uuid,uuid,text,text,text) to service_role;
create function public.k4k_generation_read(p_user uuid,p_job uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j k4k_generation.jobs;
begin
 if current_user <> 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 select * into j from k4k_generation.jobs where id=p_job and user_id=p_user;
 if not found then raise exception 'Job not found'; end if;
 return to_jsonb(j);
end $$;
revoke all on function public.k4k_generation_read(uuid,uuid) from public,anon,authenticated;
grant execute on function public.k4k_generation_read(uuid,uuid) to service_role;
commit;
