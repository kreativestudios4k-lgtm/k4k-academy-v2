-- K4K APP credit safety proposal — REVIEW BEFORE APPLYING.
-- This file is intentionally NOT executed against the connected Academy database.
-- Existing Academy student memberships and Stripe entitlements are untouched.
-- Requires a dedicated trusted server worker; NEVER expose these functions to browser roles.
begin;
create schema if not exists k4k_internal;
revoke all on schema k4k_internal from public, anon, authenticated;
create table if not exists public.studio_credit_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.studio_generation_jobs(id) on delete cascade,
 event text not null check(event in ('reserve','refund')),
 amount integer not null check(amount>0),
 created_at timestamptz not null default now(),
 unique(job_id,event)
);
alter table public.studio_credit_ledger enable row level security;
revoke all on public.studio_credit_ledger from public, anon, authenticated;
grant select on public.studio_credit_ledger to authenticated;
drop policy if exists studio_users_read_own_ledger on public.studio_credit_ledger;
create policy studio_users_read_own_ledger on public.studio_credit_ledger
 for select to authenticated using ((select auth.uid())=user_id);

-- Only a trusted backend with direct database access should execute these routines.
-- These are SECURITY INVOKER and do not bypass RLS. The worker must have
-- appropriately restricted DB privileges; do not grant browser execution.
create or replace function k4k_internal.reserve_credits(
 p_user uuid, p_job uuid, p_amount integer
) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_job public.studio_generation_jobs%rowtype;
begin
 if p_amount<=0 then raise exception 'invalid credit amount'; end if;
 select * into v_job from public.studio_generation_jobs where id=p_job and user_id=p_user for update;
 if not found then raise exception 'job not found'; end if;
 if v_job.status<>'draft' or v_job.credits_reserved<>0 then return false; end if;
 update public.studio_credit_accounts
 set balance=balance-p_amount,updated_at=now()
 where user_id=p_user and balance>=p_amount;
 if not found then return false; end if;
 insert into public.studio_credit_ledger(user_id,job_id,event,amount)
 values(p_user,p_job,'reserve',p_amount);
 update public.studio_generation_jobs set status='queued',credits_reserved=p_amount,updated_at=now() where id=p_job;
 return true;
end $$;

create or replace function k4k_internal.refund_failed_job(p_job uuid)
 returns boolean language plpgsql security invoker set search_path='' as $$
declare v_job public.studio_generation_jobs%rowtype;
begin
 select * into v_job from public.studio_generation_jobs where id=p_job for update;
 if not found then raise exception 'job not found'; end if;
 if v_job.status not in ('failed','cancelled') or v_job.credits_reserved<=0 then return false; end if;
 if exists(select 1 from public.studio_credit_ledger where job_id=p_job and event='refund') then return false; end if;
 insert into public.studio_credit_ledger(user_id,job_id,event,amount)
 values(v_job.user_id,p_job,'refund',v_job.credits_reserved);
 update public.studio_credit_accounts set balance=balance+v_job.credits_reserved,updated_at=now()
 where user_id=v_job.user_id;
 if not found then raise exception 'missing credit account'; end if;
 return true;
end $$;
revoke all on function k4k_internal.reserve_credits(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function k4k_internal.refund_failed_job(uuid) from public,anon,authenticated;
commit;

-- REQUIRED BEFORE DEPLOYMENT:
-- 1. Dedicated least-privilege worker role and DB grants; no browser RPC access.
-- 2. Test simultaneous reservations with one balance; only one may succeed.
-- 3. Test repeated reservation and repeated refund; no duplicate ledger event.
-- 4. Test insufficient funds, missing account, wrong owner and cancellation.
-- 5. Confirm job-status transition permissions are worker-only.
-- 6. Verify RLS with two separate authenticated test users.
-- 7. Confirm credit purchase/grant provenance and payment webhook idempotency.
-- 8. Run Supabase security advisors and migrations in isolated staging first.
