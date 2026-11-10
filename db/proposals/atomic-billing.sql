-- Additive billing functions. No account resets or subscription changes on install.
-- Callers must authenticate Stripe signatures and validate the server price allowlist.
alter table public.studio_credit_accounts add column if not exists billing_hold boolean not null default false;
create table if not exists public.k4k_topup_purchases (
 session_id text primary key,
 user_id uuid not null references public.studio_credit_accounts(user_id),
 payment_intent text unique not null,
 pack_key text not null,
 credits integer not null check(credits between 1 and 10000),
 amount integer not null check(amount>0),
 base_amount integer not null check(base_amount>0),
 currency text not null check(currency in ('GBP','EUR','USD','BRL')),
 reversed_credits integer not null default 0 check(reversed_credits>=0),
 reversal_debt integer not null default 0 check(reversal_debt>=0),
 status text not null default 'paid' check(status in ('paid','partially_refunded','refunded','disputed')),
 created_at timestamptz not null default now()
);
alter table public.k4k_topup_purchases enable row level security;
grant select,insert,update on public.k4k_topup_purchases to service_role;
revoke all on public.k4k_topup_purchases from anon,authenticated;

create or replace function public.k4k_apply_invoice_event(
 p_event text,p_type text,p_created bigint,p_user uuid,p_customer text,p_subscription text,
 p_invoice text,p_status text,p_period_end timestamptz,p_credits integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.memberships%rowtype; g public.k4k_credit_grants%rowtype; result jsonb;
begin
 if p_event is null or p_type not in ('invoice.paid','invoice.payment_failed') or p_created is null or p_user is null or p_subscription is null or p_invoice is null or p_credits is null or p_credits not between 0 and 10000 or p_status not in ('active','past_due') or (p_type<>'invoice.paid' and p_credits<>0) then raise exception 'INVALID_INVOICE';end if;
 perform pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 perform pg_advisory_xact_lock(hashtext('k4k-invoice:'||p_invoice));
 select * into m from public.memberships where user_id=p_user for update;
 if not found or m.stripe_customer_id is distinct from p_customer then raise exception 'UNKNOWN_CUSTOMER';end if;
 if m.stripe_subscription_id is distinct from p_subscription then
  -- Subscription-created may arrive after its first invoice. Retry while unlinked.
  if m.stripe_subscription_id is null then raise exception 'SUBSCRIPTION_NOT_LINKED';end if;
  result=jsonb_build_object('handled',false,'reason','SUBSCRIPTION_MISMATCH');
 elsif m.last_event_created is not null and m.last_event_created>p_created then
  result=jsonb_build_object('handled',false,'reason','STALE_EVENT');
 else
  select * into g from public.k4k_credit_grants where invoice_id=p_invoice;
  if found and (g.user_id<>p_user or g.credits<>p_credits) then raise exception 'CREDIT_GRANT_CONFLICT';end if;
  update public.memberships set status=p_status,last_event_created=p_created,current_period_end=coalesce(p_period_end,current_period_end),updated_at=now() where user_id=p_user;
  result=jsonb_build_object('handled',true);
  if p_credits>0 then
   result=result||jsonb_build_object('credits',public.k4k_grant_subscription_credits(p_user,p_invoice,p_credits));
  end if;
 end if;
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return result;
end;$$;
revoke all on function public.k4k_apply_invoice_event(text,text,bigint,uuid,text,text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.k4k_apply_invoice_event(text,text,bigint,uuid,text,text,text,text,timestamptz,integer) to service_role;

create or replace function public.k4k_apply_topup_event(
 p_event text,p_type text,p_session text,p_user uuid,p_intent text,p_pack text,p_credits integer,p_amount integer,p_currency text,p_total integer default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare purchase public.k4k_topup_purchases%rowtype; allowed_amount integer; new_balance integer;
begin
 if p_event is null or p_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded') or p_session is null or p_user is null or p_intent is null then raise exception 'INVALID_TOPUP';end if;
 select amount into allowed_amount from (values
 ('boost20','GBP',20,499),('boost20','EUR',20,599),('boost20','USD',20,649),('boost20','BRL',20,3499),
 ('boost50','GBP',50,1099),('boost50','EUR',50,1299),('boost50','USD',50,1449),('boost50','BRL',50,7499),
 ('boost100','GBP',100,1999),('boost100','EUR',100,2399),('boost100','USD',100,2699),('boost100','BRL',100,13999)
 ) as packs(pack,currency,credits,amount) where pack=p_pack and currency=p_currency and credits=p_credits;
 p_total=coalesce(p_total,p_amount);
 if p_total<p_amount then raise exception 'INVALID_TOPUP_TOTAL';end if;
 if allowed_amount is null or allowed_amount<>p_amount then raise exception 'INVALID_TOPUP_PRICE';end if;
 perform pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 perform pg_advisory_xact_lock(hashtext('k4k-session:'||p_session));
 insert into public.studio_credit_accounts(user_id,balance) values(p_user,0) on conflict(user_id) do nothing;
 select * into purchase from public.k4k_topup_purchases where session_id=p_session;
 if found then
  if purchase.user_id<>p_user or purchase.payment_intent<>p_intent or purchase.credits<>p_credits or purchase.currency<>p_currency or purchase.amount<>p_total or purchase.base_amount<>p_amount then raise exception 'TOPUP_CONFLICT';end if;
  insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
  return jsonb_build_object('handled',false,'reason','ALREADY_GRANTED');
 end if;
 insert into public.k4k_topup_purchases(session_id,user_id,payment_intent,pack_key,credits,amount,base_amount,currency) values(p_session,p_user,p_intent,p_pack,p_credits,p_total,p_amount,p_currency);
 update public.studio_credit_accounts set balance=balance+p_credits,updated_at=now() where user_id=p_user returning balance into new_balance;
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'granted',true,'credits',p_credits,'balance',new_balance);
end;$$;
revoke all on function public.k4k_apply_topup_event(text,text,text,uuid,text,text,integer,integer,text,integer) from public,anon,authenticated;
grant execute on function public.k4k_apply_topup_event(text,text,text,uuid,text,text,integer,integer,text,integer) to service_role;

create or replace function public.k4k_reverse_topup(
 p_event text,p_type text,p_intent text,p_refunded_amount integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare purchase public.k4k_topup_purchases%rowtype; target integer; delta integer; recovered integer; available integer;
begin
 if p_event is null or p_type not in ('charge.refunded','charge.dispute.created') or p_intent is null or p_refunded_amount is null or p_refunded_amount<0 then raise exception 'INVALID_REVERSAL';end if;
 perform pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 select * into purchase from public.k4k_topup_purchases where payment_intent=p_intent for update;
 if not found then return jsonb_build_object('handled',false,'reason','NOT_TOPUP');end if;
 if p_refunded_amount>purchase.amount then raise exception 'INVALID_REVERSAL_AMOUNT';end if;
 target=case when p_type='charge.dispute.created' then purchase.credits else ceil(purchase.credits::numeric*p_refunded_amount/purchase.amount)::integer end;
 delta=greatest(target-purchase.reversed_credits,0);
 select balance into available from public.studio_credit_accounts where user_id=purchase.user_id for update;
 recovered=least(available,delta);
 update public.studio_credit_accounts set balance=balance-recovered,billing_hold=billing_hold or delta>recovered or p_type='charge.dispute.created',updated_at=now() where user_id=purchase.user_id;
 update public.k4k_topup_purchases set reversed_credits=greatest(reversed_credits,target),reversal_debt=reversal_debt+delta-recovered,status=case when p_type='charge.dispute.created' then 'disputed' when target=credits then 'refunded' else 'partially_refunded' end where session_id=purchase.session_id;
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'creditsRecovered',recovered,'reviewRequired',delta>recovered or p_type='charge.dispute.created');
end;$$;
revoke all on function public.k4k_reverse_topup(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.k4k_reverse_topup(text,text,text,integer) to service_role;

-- Reuse the existing reservation transaction, locking its account first so a
-- refund/dispute cannot race a new generation past the billing hold.
create or replace function public.k4k_generation_reserve_checked(p_user uuid,p_job uuid,p_key uuid,p_credits integer,p_enabled boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare hold boolean;
begin
 select billing_hold into hold from public.studio_credit_accounts where user_id=p_user for update;
 if hold then raise exception 'BILLING_REVIEW_REQUIRED';end if;
 return public.k4k_generation_reserve_draft(p_user,p_job,p_key,p_credits,p_enabled);
end;$$;
revoke all on function public.k4k_generation_reserve_checked(uuid,uuid,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.k4k_generation_reserve_checked(uuid,uuid,uuid,integer,boolean) to service_role;
create or replace function public.k4k_hold_billing_account(p_event text,p_type text,p_customer text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid;
begin
 if p_type not in ('charge.refunded','charge.dispute.created') then raise exception 'INVALID_REVIEW';end if;
 perform pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 select user_id into owner_id from public.memberships where stripe_customer_id=p_customer;
 if owner_id is null then return jsonb_build_object('handled',false,'reason','UNKNOWN_CUSTOMER');end if;
 insert into public.studio_credit_accounts(user_id,balance,billing_hold) values(owner_id,0,true) on conflict(user_id) do update set billing_hold=true,updated_at=now();
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'reviewRequired',true);
end;$$;
revoke all on function public.k4k_hold_billing_account(text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_hold_billing_account(text,text,text) to service_role;
