-- Additive separation of LIVE K4K APP memberships from the existing Academy.
-- No legacy membership, subscription, credit balance or Stripe object is copied,
-- updated or deleted. Existing test memberships remain in the legacy table.
create table if not exists public.k4k_app_memberships (
 user_id uuid primary key references auth.users(id) on delete restrict,
 status text not null default 'inactive' check(status in ('inactive','trialing','active','past_due','canceled')),
 plan text not null check(plan in ('starter','creator','pro','studio')),
 stripe_customer_id text unique,
 stripe_subscription_id text unique,
 stripe_price_id text,
 currency text check(currency in ('GBP','EUR','USD','BRL')),
 current_period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 last_event_created bigint,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.k4k_app_memberships enable row level security;
revoke all on public.k4k_app_memberships from public,anon,authenticated;
grant select on public.k4k_app_memberships to authenticated;
grant select,insert,update on public.k4k_app_memberships to service_role;
drop policy if exists k4k_app_membership_owner_select on public.k4k_app_memberships;
create policy k4k_app_membership_owner_select on public.k4k_app_memberships for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.k4k_app_apply_invoice_event(
 p_event text,p_type text,p_created bigint,p_user uuid,p_customer text,p_subscription text,
 p_invoice text,p_status text,p_period_end timestamptz,p_credits integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.k4k_app_memberships%rowtype; g public.k4k_credit_grants%rowtype; result jsonb;
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
  select * into g from public.k4k_credit_grants where invoice_id=p_invoice;
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
   result=result||jsonb_build_object('handled',true,'credits',public.k4k_grant_subscription_credits(p_user,p_invoice,p_credits));
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
 insert into public.studio_credit_accounts(user_id,balance,billing_hold) values(owner_id,0,true) on conflict(user_id) do update set billing_hold=true,updated_at=now();
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'reviewRequired',true);
end;$$;
revoke all on function public.k4k_app_hold_billing_account(text,text,text) from public,anon,authenticated;
grant execute on function public.k4k_app_hold_billing_account(text,text,text) to service_role;
create or replace function public.k4k_app_launch_claim_paid(p_user uuid,p_plan text,p_price text,p_currency text,p_max_seats integer,p_max_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_launch_paid_claims%rowtype; v_credits integer; v_seats integer; v_total bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 v_credits:=case p_plan when 'starter' then 80 when 'creator' then 160 when 'pro' then 340 when 'studio' then 700 else null end;
 if p_user is null or v_credits is null or p_price is null or p_price !~ '^price_[A-Za-z0-9]+$' or p_currency is null or p_currency not in ('GBP','EUR','USD','BRL') or p_max_seats is null or p_max_seats not between 1 and 50 or p_max_credits is null or p_max_credits not between 80 and 35000 then raise exception 'LAUNCH_CONFIG_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 select * into c from public.k4k_launch_paid_claims where user_id=p_user and state in ('reserved','paid');
 if found then
  if c.plan_key<>p_plan or c.price_id<>p_price or c.currency<>p_currency then raise exception 'LAUNCH_CHECKOUT_PENDING';end if;
 else
  if exists(select 1 from public.k4k_app_memberships where user_id=p_user and stripe_subscription_id is not null and status not in ('canceled','incomplete_expired')) then raise exception 'ALREADY_SUBSCRIBED';end if;
  select count(*)::integer,coalesce(sum(credits),0) into v_seats,v_total from public.k4k_launch_paid_claims where state in ('reserved','paid');
  if v_seats>=p_max_seats then raise exception 'LAUNCH_SOLD_OUT';end if;
  if v_total+v_credits>p_max_credits then raise exception 'LAUNCH_CREDIT_CAPACITY';end if;
  insert into public.k4k_launch_paid_claims(user_id,plan_key,price_id,currency,credits) values(p_user,p_plan,p_price,p_currency,v_credits) returning * into c;
 end if;
 return to_jsonb(c)||jsonb_build_object('expires_epoch',floor(extract(epoch from c.created_at+interval '1 hour'))::bigint);
end $$;


revoke all on function public.k4k_app_launch_claim_paid(uuid,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.k4k_app_launch_claim_paid(uuid,text,text,text,integer,integer) to service_role;
