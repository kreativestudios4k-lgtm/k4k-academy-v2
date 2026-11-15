-- Accept approved per-plan custom Stripe product IDs alongside generated IDs.
-- No records, balances, memberships, limits or grants are changed.
begin;
create or replace function public.k4k_manual_pix_reserve(p_user uuid,p_mode text,p_plan text,p_price text,p_product text,p_max_seats integer,p_max_credits integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.k4k_manual_pix_orders%rowtype; v_amount integer;v_credits integer;v_total bigint;v_seats integer;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 v_amount:=case p_plan when 'starter' then 10999 when 'creator' then 20999 when 'pro' then 44999 when 'studio' then 89999 end;
 v_credits:=case p_plan when 'starter' then 80 when 'creator' then 160 when 'pro' then 340 when 'studio' then 700 end;
 if p_user is null or p_mode is null or p_mode not in ('test','live') or v_amount is null or p_price is null or p_price!~'^price_[A-Za-z0-9]+$' or p_product is null or (p_product!~'^prod_[A-Za-z0-9]+$' and p_product<>('k4k_app_'||p_plan||'_2026')) or p_max_seats is null or p_max_seats not between 1 and 50 or p_max_credits is null or p_max_credits not between 80 and 35000 then raise exception 'MANUAL_PIX_CONFIG_INVALID';end if;
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
commit;
