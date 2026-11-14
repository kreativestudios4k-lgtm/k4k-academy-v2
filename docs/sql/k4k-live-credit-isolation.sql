-- Additive live credit separation. Existing test and Academy balances and grants
-- remain unchanged. Only server-verified live Stripe invoices grant live credits.
-- Apply after preview database regression tests; production checkout stays closed.
begin;
create table public.k4k_live_credit_accounts(
 user_id uuid primary key references auth.users(id) on delete restrict,
 balance integer not null default 0 check(balance>=0),
 billing_hold boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.k4k_live_credit_grants(
 invoice_id text primary key,
 user_id uuid not null references auth.users(id) on delete restrict,
 credits integer not null check(credits between 1 and 10000),
 created_at timestamptz not null default now()
);
alter table public.k4k_live_credit_accounts enable row level security;
alter table public.k4k_live_credit_grants enable row level security;
revoke all on public.k4k_live_credit_accounts,public.k4k_live_credit_grants from public,anon,authenticated;
grant select on public.k4k_live_credit_accounts to authenticated;
grant select,insert,update on public.k4k_live_credit_accounts to service_role;
grant select,insert on public.k4k_live_credit_grants to service_role;
create policy k4k_live_credit_owner_select on public.k4k_live_credit_accounts for select to authenticated using ((select auth.uid())=user_id);
alter table public.k4k_generation_reservations add column credit_mode text not null default 'test' check(credit_mode in ('test','live'));
create function public.k4k_grant_live_subscription_credits(p_user uuid,p_invoice text,p_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare inserted boolean; new_balance integer;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null or p_invoice is null or p_invoice !~ '^in_[A-Za-z0-9_]+$' or p_credits is null or p_credits not between 1 and 10000 then raise exception 'INVALID_GRANT';end if;
 if not exists(select 1 from public.k4k_app_memberships where user_id=p_user and stripe_subscription_id is not null) then raise exception 'LIVE_MEMBERSHIP_REQUIRED';end if;
 insert into public.k4k_live_credit_accounts(user_id,balance) values(p_user,0) on conflict(user_id) do nothing;
 insert into public.k4k_live_credit_grants(invoice_id,user_id,credits) values(p_invoice,p_user,p_credits) on conflict(invoice_id) do nothing;
 inserted:=found;
 if inserted then
  update public.k4k_live_credit_accounts set balance=balance+p_credits,updated_at=now() where user_id=p_user returning balance into new_balance;
 else
  if not exists(select 1 from public.k4k_live_credit_grants where invoice_id=p_invoice and user_id=p_user and credits=p_credits) then raise exception 'CREDIT_GRANT_CONFLICT';end if;
  select balance into new_balance from public.k4k_live_credit_accounts where user_id=p_user;
 end if;
 return jsonb_build_object('granted',inserted,'balance',new_balance);
end;$$;
revoke all on function public.k4k_grant_live_subscription_credits(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.k4k_grant_live_subscription_credits(uuid,text,integer) to service_role;
create or replace function public.k4k_app_apply_invoice_event(
 p_event text,p_type text,p_created bigint,p_user uuid,p_customer text,p_subscription text,
 p_invoice text,p_status text,p_period_end timestamptz,p_credits integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.k4k_app_memberships%rowtype; g public.k4k_live_credit_grants%rowtype; result jsonb;
begin
 if p_event is null or p_type not in ('invoice.paid','invoice.payment_failed') or p_created is null or p_user is null or p_subscription is null or p_invoice is null or p_credits is null or p_credits not between 0 and 10000 or (p_type='invoice.paid' and p_status is distinct from 'active') or (p_type='invoice.payment_failed' and (p_status is distinct from 'past_due' or p_credits<>0)) then raise exception 'INVALID_INVOICE';end if;
 perform pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 perform pg_advisory_xact_lock(hashtext('k4k-invoice:'||p_invoice));
 select * into m from public.k4k_app_memberships where user_id=p_user for update;
 if not found or m.stripe_customer_id is distinct from p_customer then raise exception 'UNKNOWN_CUSTOMER';end if;
 if m.stripe_subscription_id is distinct from p_subscription then
  -- Subscription-created may arrive after its first invoice. Retry while unlinked.
  if m.stripe_subscription_id is null then raise exception 'SUBSCRIPTION_NOT_LINKED';end if;
  result=jsonb_build_object('handled',false,'reason','SUBSCRIPTION_MISMATCH');
 else
  -- Membership chronology and the invoice's financial entitlement are independent.
  -- An older paid renewal for this verified subscription must still grant once.
  select * into g from public.k4k_live_credit_grants where invoice_id=p_invoice;
  if found and (g.user_id<>p_user or (p_credits>0 and g.credits<>p_credits)) then raise exception 'CREDIT_GRANT_CONFLICT';end if;
  if p_type='invoice.payment_failed' and g.invoice_id is not null then
   result=jsonb_build_object('handled',false,'reason','INVOICE_ALREADY_PAID');
  elsif (m.last_event_created is not null and m.last_event_created>p_created)
     or (p_period_end is not null and m.current_period_end is not null and p_period_end<m.current_period_end)
     or m.status in ('canceled','incomplete_expired') then
   result=jsonb_build_object('handled',false,'reason','STALE_MEMBERSHIP_STATE');
  else
   update public.k4k_app_memberships set status=p_status,last_event_created=p_created,current_period_end=coalesce(p_period_end,current_period_end),updated_at=now() where user_id=p_user;
   result=jsonb_build_object('handled',true);
  end if;
  if p_type='invoice.paid' and p_credits>0 then
   result=result||jsonb_build_object('handled',true,'credits',public.k4k_grant_live_subscription_credits(p_user,p_invoice,p_credits));
  end if;
 end if;
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return result;
end;$$;
revoke all on function public.k4k_app_apply_invoice_event(text,text,bigint,uuid,text,text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.k4k_app_apply_invoice_event(text,text,bigint,uuid,text,text,text,text,timestamptz,integer) to service_role;

create or replace function public.k4k_app_hold_billing_account(p_event text,p_type text,p_customer text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid;
begin
 if p_type not in ('charge.refunded','charge.dispute.created') then raise exception 'INVALID_REVIEW';end if;
 perform pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 select user_id into owner_id from public.k4k_app_memberships where stripe_customer_id=p_customer;
 if owner_id is null then return jsonb_build_object('handled',false,'reason','UNKNOWN_CUSTOMER');end if;
 insert into public.k4k_live_credit_accounts(user_id,balance,billing_hold) values(owner_id,0,true) on conflict(user_id) do update set billing_hold=true,updated_at=now();
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'reviewRequired',true);
end;$$;
revoke all on function public.k4k_app_hold_billing_account(text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_app_hold_billing_account(text,text,text) to service_role;

create or replace function public.k4k_generation_reserve_live_budgeted(
 p_user uuid,p_job uuid,p_key uuid,p_credits integer,p_enabled boolean,
 p_provider text,p_quote_micros bigint,p_daily_budget_micros bigint,p_max_active integer,p_total_budget_micros bigint
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 v_existing public.k4k_generation_reservations%rowtype;
 v_job public.studio_generation_jobs%rowtype;
 v_used bigint;
 v_active bigint;
 v_total bigint;
 v_day_start timestamptz;
 v_result jsonb;
begin
 if current_user <> 'service_role' or coalesce(auth.role(),'') <> 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_enabled is distinct from true then raise exception 'GENERATION_DISABLED'; end if;
 if p_provider is distinct from 'fal'
  or p_quote_micros is null or p_quote_micros < 1 or p_quote_micros > 5000000
  or p_daily_budget_micros is null or p_daily_budget_micros < 1
  or p_daily_budget_micros > 100000000000
  or p_total_budget_micros is null or p_total_budget_micros<1 or p_total_budget_micros>100000000000
  or p_max_active is null or p_max_active not between 1 and 10
  or p_credits is null or p_credits not between 1 and 10000
 then raise exception 'PROVIDER_BUDGET_BLOCKED'; end if;
 -- Serialize the global USD allocation and user active-job check with the
 -- credit reservation in one transaction. No network call occurs under lock.
 perform pg_catalog.pg_advisory_xact_lock(724312,1042026);
 select * into v_existing from public.k4k_generation_reservations
  where user_id=p_user and request_key=p_key;
 if found then
  if v_existing.credit_mode<>'live' or v_existing.job_id<>p_job or v_existing.credits<>p_credits then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'credits',v_existing.credits,'newly_reserved',false);
 end if;
 select * into v_existing from public.k4k_generation_reservations
  where user_id=p_user and job_id=p_job;
 if found then
  if v_existing.credit_mode<>'live' or v_existing.credits<>p_credits then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('job_id',p_job,'status',v_existing.status,'credits',v_existing.credits,'newly_reserved',false);
 end if;
 select * into v_job from public.studio_generation_jobs where id=p_job and user_id=p_user;
 if not found or v_job.status<>'draft' then raise exception 'JOB_NOT_DRAFT'; end if;
 if v_job.provider is distinct from p_provider or v_job.model is distinct from 'lite' then raise exception 'INVALID_JOB'; end if;
 select count(*) into v_active from public.studio_generation_jobs
  where user_id=p_user and status in ('queued','processing');
 if v_active>=p_max_active then raise exception 'ACTIVE_JOB_LIMIT'; end if;
 v_day_start:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select coalesce(sum(quote_micros),0) into v_used from public.k4k_generation_budget_allocations
  where created_at>=v_day_start;
 if v_used+p_quote_micros>p_daily_budget_micros then raise exception 'PROVIDER_DAILY_BUDGET_BLOCKED'; end if;
 select coalesce(sum(quote_micros),0) into v_total from public.k4k_generation_budget_allocations;
 if v_total+p_quote_micros>p_total_budget_micros then raise exception 'PROVIDER_TOTAL_BUDGET_BLOCKED'; end if;
 -- Lock the live wallet; a test balance is never consulted.
 if p_quote_micros>p_credits::bigint*100000 then raise exception 'PROVIDER_BUDGET_BLOCKED';end if;
 select * into v_job from public.studio_generation_jobs where id=p_job and user_id=p_user for update;
 if not found or v_job.status<>'draft' or v_job.provider<>'fal' or v_job.model<>'lite' or v_job.reference_video_path is null or cardinality(v_job.reference_paths) not between 1 and 8 then raise exception 'INVALID_JOB';end if;
 perform 1 from public.k4k_live_credit_accounts where user_id=p_user and billing_hold for update;
 if found then raise exception 'BILLING_REVIEW_REQUIRED';end if;
 update public.k4k_live_credit_accounts set balance=balance-p_credits,updated_at=now() where user_id=p_user and not billing_hold and balance>=p_credits;
 if not found then raise exception 'INSUFFICIENT_CREDITS';end if;
 insert into public.k4k_generation_reservations(user_id,job_id,request_key,credits,credit_mode) values(p_user,p_job,p_key,p_credits,'live');
 update public.studio_generation_jobs set status='queued',credits_reserved=p_credits,updated_at=now() where id=p_job;
 v_result:=jsonb_build_object('job_id',p_job,'status','reserved','credits',p_credits,'newly_reserved',true);
 if (v_result->>'newly_reserved')::boolean is true then
  insert into public.k4k_generation_budget_allocations(job_id,user_id,provider,quote_micros)
   values(p_job,p_user,p_provider,p_quote_micros);
 end if;
 return v_result;
end;
$$;
revoke all on function public.k4k_generation_reserve_live_budgeted(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer,bigint) from public,anon,authenticated;
grant execute on function public.k4k_generation_reserve_live_budgeted(uuid,uuid,uuid,integer,boolean,text,bigint,bigint,integer,bigint) to service_role;

CREATE OR REPLACE FUNCTION public.k4k_generation_finish(p_user uuid, p_job uuid, p_outcome text, p_output_path text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare v_res public.k4k_generation_reservations%rowtype;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_outcome not in ('completed','failed') then raise exception 'INVALID_OUTCOME'; end if;
 select * into v_res from public.k4k_generation_reservations where job_id=p_job and user_id=p_user for update;
 if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;
 if v_res.status<>'reserved' then return jsonb_build_object('job_id',p_job,'status',v_res.status); end if;
 if p_outcome='completed' then
   if p_output_path is distinct from (p_user::text || '/' || p_job::text || '.mp4') then raise exception 'INVALID_OUTPUT'; end if;
   update public.studio_generation_jobs set status='completed',output_path=p_output_path,updated_at=now() where id=p_job and user_id=p_user and status in ('queued','processing');
   if not found then raise exception 'INVALID_JOB_STATE'; end if;
   update public.k4k_generation_reservations set status='settled',updated_at=now() where id=v_res.id;
 else
   update public.studio_generation_jobs set status='failed',updated_at=now() where id=p_job and user_id=p_user and status in ('queued','processing');
   if not found then raise exception 'INVALID_JOB_STATE'; end if;
   if v_res.credit_mode='live' then
     update public.k4k_live_credit_accounts set balance=balance+v_res.credits,updated_at=now() where user_id=p_user;
     if not found then raise exception 'CREDIT_ACCOUNT_MISSING';end if;
   else
     update public.studio_credit_accounts set balance=balance+v_res.credits,updated_at=now() where user_id=p_user;
     if not found then raise exception 'CREDIT_ACCOUNT_MISSING';end if;
   end if;
   update public.k4k_generation_reservations set status='refunded',updated_at=now() where id=v_res.id;
 end if;
 return jsonb_build_object('job_id',p_job,'status',case when p_outcome='failed' then 'refunded' else 'settled' end);
end $function$
;
revoke all on function public.k4k_generation_finish(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.k4k_generation_finish(uuid,uuid,text,text) to service_role;
commit;
