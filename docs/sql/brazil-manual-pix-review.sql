-- Additive proposal, validated on isolated Postgres. Do not apply automatically.
-- Requires existing live credit isolation and funded launch tables.
begin;
create table public.k4k_manual_pix_orders(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 credit_mode text not null check(credit_mode in ('test','live')),
 plan_key text not null check(plan_key in ('starter','creator','pro','studio')),
 source_price_id text not null,product_id text not null,
 amount integer not null check(amount>0),credits integer not null check(credits>0),
 state text not null default 'reserved' check(state in ('reserved','paid','expired','refunded','disputed')),
 stripe_session_id text unique,stripe_payment_intent_id text unique,
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 hour',
 paid_at timestamptz,period_end timestamptz,fulfilled_at timestamptz,
 refunded_amount integer not null default 0 check(refunded_amount>=0 and refunded_amount<=amount),
 reversed_credits integer not null default 0 check(reversed_credits>=0 and reversed_credits<=credits),
 reversal_debt integer not null default 0 check(reversal_debt>=0)
);
create unique index k4k_manual_pix_reserved_user on public.k4k_manual_pix_orders(user_id,credit_mode) where state='reserved';
create index k4k_manual_pix_owner_period on public.k4k_manual_pix_orders(user_id,credit_mode,period_end desc);
alter table public.k4k_manual_pix_orders enable row level security;
revoke all on public.k4k_manual_pix_orders from public,anon,authenticated;
grant select(id,user_id,credit_mode,plan_key,state,paid_at,period_end) on public.k4k_manual_pix_orders to authenticated;
grant select,insert,update on public.k4k_manual_pix_orders to service_role;
create policy k4k_manual_pix_owner on public.k4k_manual_pix_orders for select to authenticated using ((select auth.uid())=user_id);

create function public.k4k_manual_pix_reserve(p_user uuid,p_mode text,p_plan text,p_price text,p_product text,p_max_seats integer,p_max_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.k4k_manual_pix_orders%rowtype; v_amount integer;v_credits integer;v_total bigint;v_seats integer;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 v_amount:=case p_plan when 'starter' then 10999 when 'creator' then 20999 when 'pro' then 44999 when 'studio' then 89999 end;
 v_credits:=case p_plan when 'starter' then 80 when 'creator' then 160 when 'pro' then 340 when 'studio' then 700 end;
 if p_user is null or p_mode is null or p_mode not in ('test','live') or v_amount is null or p_price is null or p_price!~'^price_[A-Za-z0-9]+$' or p_product is null or p_product!~'^prod_[A-Za-z0-9]+$' or p_max_seats is null or p_max_seats not between 1 and 50 or p_max_credits is null or p_max_credits not between 80 and 35000 then raise exception 'MANUAL_PIX_CONFIG_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 if (p_mode='live' and exists(select 1 from public.k4k_live_credit_accounts where user_id=p_user and billing_hold)) or (p_mode='test' and exists(select 1 from public.studio_credit_accounts where user_id=p_user and billing_hold)) or exists(select 1 from public.k4k_manual_pix_orders where user_id=p_user and credit_mode=p_mode and state='disputed') then raise exception 'BILLING_REVIEW_REQUIRED';end if;
 if p_mode='live' and (exists(select 1 from public.k4k_app_memberships where user_id=p_user and stripe_subscription_id is not null and status not in ('canceled','incomplete_expired')) or exists(select 1 from public.k4k_launch_paid_claims where user_id=p_user and state='reserved')) then raise exception 'EXISTING_SUBSCRIPTION_OR_CHECKOUT';end if;
 if exists(select 1 from public.k4k_manual_pix_orders where user_id=p_user and credit_mode=p_mode and fulfilled_at is not null and period_end>now() and state in ('paid','disputed')) then raise exception 'MANUAL_PIX_PERIOD_ACTIVE';end if;
 select * into o from public.k4k_manual_pix_orders where user_id=p_user and credit_mode=p_mode and state='reserved';
 if found then
  if o.plan_key<>p_plan or o.source_price_id<>p_price or o.product_id<>p_product then raise exception 'MANUAL_PIX_CHECKOUT_PENDING';end if;
  return to_jsonb(o);
 end if;
 -- Count both payment models under the same launch lock. Paid commitments are
 -- retained conservatively; refunds never silently recycle spent funding.
 if p_mode='live' then
  select coalesce(sum(credits),0) into v_total from public.k4k_launch_paid_claims where state in ('reserved','paid');
  select v_total+coalesce(sum(credits),0) into v_total from public.k4k_manual_pix_orders where credit_mode='live' and (state in ('reserved','disputed') or fulfilled_at is not null);
  select count(*) into v_seats from (select user_id from public.k4k_launch_paid_claims where state in ('reserved','paid') union select user_id from public.k4k_manual_pix_orders where credit_mode='live' and (state in ('reserved','disputed') or fulfilled_at is not null)) u;
  if v_total+v_credits>p_max_credits then raise exception 'LAUNCH_CREDIT_CAPACITY';end if;
  if v_seats>=p_max_seats and not exists(select 1 from public.k4k_manual_pix_orders where user_id=p_user and credit_mode='live' and fulfilled_at is not null) and not exists(select 1 from public.k4k_launch_paid_claims where user_id=p_user and state='paid') then raise exception 'LAUNCH_SOLD_OUT';end if;
 end if;
 insert into public.k4k_manual_pix_orders(user_id,credit_mode,plan_key,source_price_id,product_id,amount,credits) values(p_user,p_mode,p_plan,p_price,p_product,v_amount,v_credits) returning * into o;
 return to_jsonb(o);
end;$$;
create function public.k4k_manual_pix_bind(p_order uuid,p_user uuid,p_session text,p_expired boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.k4k_manual_pix_orders%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 select * into o from public.k4k_manual_pix_orders where id=p_order and user_id=p_user for update;
 if not found or p_session is null or p_session!~('^cs_'||o.credit_mode||'_[A-Za-z0-9]+$') or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) then raise exception 'MANUAL_PIX_ORDER_INVALID';end if;
 if p_expired and o.state not in ('reserved','expired') then return jsonb_build_object('handled',false,'reason','PAYMENT_ALREADY_RECORDED');end if;
 update public.k4k_manual_pix_orders set stripe_session_id=p_session,state=case when p_expired then 'expired' else state end where id=o.id;
 return jsonb_build_object('handled',true);
end;$$;
create function public.k4k_manual_pix_apply(p_order uuid,p_event text,p_type text,p_session text,p_intent text,p_paid_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare o public.k4k_manual_pix_orders%rowtype;v_balance integer;v_grant integer;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_event is null or p_type is null or p_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded','manual_pix.reconcile') or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'MANUAL_PIX_PAYMENT_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 select * into o from public.k4k_manual_pix_orders where id=p_order for update;
 if not found or p_session is null or p_session!~('^cs_'||o.credit_mode||'_[A-Za-z0-9]+$') or p_intent is null or p_intent!~'^pi_[A-Za-z0-9]+$' or (o.stripe_session_id is not null and o.stripe_session_id<>p_session) or (o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id<>p_intent) then raise exception 'MANUAL_PIX_ORDER_INVALID';end if;
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) or o.fulfilled_at is not null then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 if p_paid_at<o.created_at-interval '5 minutes' then raise exception 'MANUAL_PIX_PAYMENT_INVALID';end if;
 v_grant:=o.credits-o.reversed_credits;
 if o.credit_mode='live' then
  insert into public.k4k_live_credit_accounts(user_id,balance) values(o.user_id,0) on conflict(user_id) do nothing;
  update public.k4k_live_credit_accounts set balance=balance+v_grant,updated_at=now() where user_id=o.user_id returning balance into v_balance;
 else
  insert into public.studio_credit_accounts(user_id,balance) values(o.user_id,0) on conflict(user_id) do nothing;
  update public.studio_credit_accounts set balance=balance+v_grant,updated_at=now() where user_id=o.user_id returning balance into v_balance;
 end if;
 update public.k4k_manual_pix_orders set stripe_session_id=p_session,stripe_payment_intent_id=p_intent,paid_at=p_paid_at,period_end=p_paid_at+interval '1 month',fulfilled_at=now(),state=case when state='disputed' then state when refunded_amount=amount then 'refunded' else 'paid' end where id=o.id;
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'credits',v_grant,'balance',v_balance,'renewalMode','manual');
end;$$;
create function public.k4k_manual_pix_review(p_order uuid,p_event text,p_type text,p_intent text,p_amount integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.k4k_manual_pix_orders%rowtype;v_reversed integer;v_delta integer;v_balance integer;v_debit integer;v_hold boolean;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_event is null or p_type is null or p_type not in ('charge.refunded','charge.dispute.created') or p_amount is null or p_amount<0 then raise exception 'INVALID_REVIEW';end if;
 perform pg_catalog.pg_advisory_xact_lock(hashtext('k4k-event:'||p_event));
 if exists(select 1 from public.stripe_webhook_events where event_id=p_event) then return jsonb_build_object('handled',false,'reason','DUPLICATE');end if;
 select * into o from public.k4k_manual_pix_orders where id=p_order for update;
 if not found or p_intent is null or p_intent!~'^pi_[A-Za-z0-9]+$' or (o.stripe_payment_intent_id is not null and o.stripe_payment_intent_id<>p_intent) or p_amount>o.amount then raise exception 'MANUAL_PIX_ORDER_INVALID';end if;
 v_reversed:=ceil(o.credits::numeric*greatest(o.refunded_amount,p_amount)/o.amount)::integer;
 v_delta:=case when o.fulfilled_at is null then 0 else greatest(0,v_reversed-o.reversed_credits) end;
 if o.credit_mode='live' then
  insert into public.k4k_live_credit_accounts(user_id,balance) values(o.user_id,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.k4k_live_credit_accounts where user_id=o.user_id for update;
 else
  insert into public.studio_credit_accounts(user_id,balance) values(o.user_id,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.studio_credit_accounts where user_id=o.user_id for update;
 end if;
 v_debit:=least(v_balance,v_delta);v_hold:=p_type='charge.dispute.created' or v_delta>v_debit;
 if o.credit_mode='live' then update public.k4k_live_credit_accounts set balance=balance-v_debit,billing_hold=billing_hold or v_hold,updated_at=now() where user_id=o.user_id;
 else update public.studio_credit_accounts set balance=balance-v_debit,billing_hold=billing_hold or v_hold,updated_at=now() where user_id=o.user_id;end if;
 update public.k4k_manual_pix_orders set stripe_payment_intent_id=p_intent,refunded_amount=greatest(refunded_amount,p_amount),reversed_credits=v_reversed,reversal_debt=reversal_debt+v_delta-v_debit,state=case when p_type='charge.dispute.created' or state='disputed' then 'disputed' when p_amount=amount then 'refunded' else state end where id=o.id;
 insert into public.stripe_webhook_events(event_id,type) values(p_event,p_type);
 return jsonb_build_object('handled',true,'reviewRequired',v_hold,'creditsRemoved',v_debit);
end;$$;
revoke all on function public.k4k_manual_pix_reserve(uuid,text,text,text,text,integer,integer),public.k4k_manual_pix_bind(uuid,uuid,text,boolean),public.k4k_manual_pix_apply(uuid,text,text,text,text,timestamptz),public.k4k_manual_pix_review(uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.k4k_manual_pix_reserve(uuid,text,text,text,text,integer,integer),public.k4k_manual_pix_bind(uuid,uuid,text,boolean),public.k4k_manual_pix_apply(uuid,text,text,text,text,timestamptz),public.k4k_manual_pix_review(uuid,text,text,text,integer) to service_role;

-- Existing card admission uses the same global funding lock and commitments.
create or replace function public.k4k_app_launch_claim_paid(p_user uuid,p_plan text,p_price text,p_currency text,p_max_seats integer,p_max_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_launch_paid_claims%rowtype; v_credits integer; v_seats integer; v_total bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 v_credits:=case p_plan when 'starter' then 80 when 'creator' then 160 when 'pro' then 340 when 'studio' then 700 else null end;
 if p_user is null or v_credits is null or p_price is null or p_price !~ '^price_[A-Za-z0-9]+$' or p_currency is null or p_currency not in ('GBP','EUR','USD','BRL') or p_max_seats is null or p_max_seats not between 1 and 50 or p_max_credits is null or p_max_credits not between 80 and 35000 then raise exception 'LAUNCH_CONFIG_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 if exists(select 1 from public.k4k_manual_pix_orders where user_id=p_user and credit_mode='live' and (state in ('reserved','disputed') or (fulfilled_at is not null and period_end>now() and state in ('paid','disputed')))) then raise exception 'LAUNCH_CHECKOUT_PENDING';end if;
 select * into c from public.k4k_launch_paid_claims where user_id=p_user and state in ('reserved','paid');
 if found then
  if c.plan_key<>p_plan or c.price_id<>p_price or c.currency<>p_currency then raise exception 'LAUNCH_CHECKOUT_PENDING';end if;
 else
  if exists(select 1 from public.k4k_app_memberships where user_id=p_user and stripe_subscription_id is not null and status not in ('canceled','incomplete_expired')) then raise exception 'ALREADY_SUBSCRIBED';end if;
  select count(*)::integer,coalesce(sum(credits),0) into v_seats,v_total from public.k4k_launch_paid_claims where state in ('reserved','paid');
  select v_total+coalesce(sum(credits),0) into v_total from public.k4k_manual_pix_orders where credit_mode='live' and (state in ('reserved','disputed') or fulfilled_at is not null);
  select count(*) into v_seats from (select user_id from public.k4k_launch_paid_claims where state in ('reserved','paid') union select user_id from public.k4k_manual_pix_orders where credit_mode='live' and (state in ('reserved','disputed') or fulfilled_at is not null)) u;
  if v_seats>=p_max_seats and not exists(select 1 from public.k4k_manual_pix_orders where user_id=p_user and credit_mode='live' and fulfilled_at is not null) then raise exception 'LAUNCH_SOLD_OUT';end if;
  if v_total+v_credits>p_max_credits then raise exception 'LAUNCH_CREDIT_CAPACITY';end if;
  insert into public.k4k_launch_paid_claims(user_id,plan_key,price_id,currency,credits) values(p_user,p_plan,p_price,p_currency,v_credits) returning * into c;
 end if;
 return to_jsonb(c)||jsonb_build_object('expires_epoch',floor(extract(epoch from c.created_at+interval '1 hour'))::bigint);
end $$;
revoke all on function public.k4k_app_launch_claim_paid(uuid,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.k4k_app_launch_claim_paid(uuid,text,text,text,integer,integer) to service_role;
commit;
