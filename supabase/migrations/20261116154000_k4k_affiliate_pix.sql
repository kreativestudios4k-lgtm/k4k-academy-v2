-- Persist the exact first-payment discount inside the existing funded order.
-- Existing Pix orders and payment/credit functions retain their behavior.
alter table public.k4k_manual_pix_orders add column affiliate_code text
 check(affiliate_code is null or (credit_mode='live' and (affiliate_code='matheusborrascah' or affiliate_code~'^[a-z0-9][a-z0-9-]{1,37}10$')));
-- Wrap the current reserve function under its existing global funding lock.
-- The base reserve owns capacity and credit guards; this wrapper owns the code.
create function public.k4k_manual_pix_reserve_affiliate(p_user uuid,p_mode text,p_plan text,p_price text,p_product text,p_max_seats integer,p_max_credits integer,p_code text,p_explicit boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.k4k_manual_pix_orders%rowtype; p public.k4k_app_partners%rowtype; v jsonb; v_ref jsonb; v_code text;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_mode<>'live' or p_explicit is null then raise exception 'MANUAL_PIX_DISCOUNT_UNAVAILABLE';end if;
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 select * into o from public.k4k_manual_pix_orders where user_id=p_user and credit_mode=p_mode and state='reserved' for update;
 if found then
  if p_explicit and (p_code is null or o.affiliate_code is distinct from p_code) then raise exception 'MANUAL_PIX_CHECKOUT_PENDING';end if;
  return public.k4k_manual_pix_reserve(p_user,p_mode,p_plan,p_price,p_product,p_max_seats,p_max_credits);
 end if;
 if p_code is not null then
  if p_code<>'matheusborrascah' and p_code!~'^[a-z0-9][a-z0-9-]{1,37}10$' then raise exception 'INVALID_DISCOUNT_CODE';end if;
  select * into p from public.k4k_app_partners where code=p_code and active and commission_bps in (1000,2500) for share;
  if not found or p.user_id=p_user then
   if p_explicit then raise exception 'MANUAL_PIX_DISCOUNT_UNAVAILABLE';end if;
  elsif exists(select 1 from public.k4k_manual_pix_orders where user_id=p_user and credit_mode='live' and (fulfilled_at is not null or state='disputed')) or exists(select 1 from public.k4k_launch_paid_claims where user_id=p_user and state='paid') or exists(select 1 from public.k4k_app_memberships where user_id=p_user and stripe_subscription_id is not null) then
   if p_explicit then raise exception 'MANUAL_PIX_DISCOUNT_USED';end if;
  else
   v_ref:=public.k4k_app_record_referral(p_user,p_code);
   if coalesce((v_ref->>'attributed')::boolean,false) and v_ref->>'code'=p_code then v_code:=p_code;
   elsif p_explicit then raise exception 'MANUAL_PIX_DISCOUNT_UNAVAILABLE';end if;
  end if;
 elsif p_explicit then raise exception 'INVALID_DISCOUNT_CODE';
 end if;
 v:=public.k4k_manual_pix_reserve(p_user,p_mode,p_plan,p_price,p_product,p_max_seats,p_max_credits);
 if v_code is null then return v;end if;
 update public.k4k_manual_pix_orders set amount=amount-round(amount::numeric/10)::integer,affiliate_code=v_code
  where id=(v->>'id')::uuid and state='reserved' and stripe_session_id is null and affiliate_code is null returning * into o;
 if not found then raise exception 'MANUAL_PIX_CHECKOUT_PENDING';end if;
 return to_jsonb(o);
end $$;
revoke all on function public.k4k_manual_pix_reserve_affiliate(uuid,text,text,text,text,integer,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.k4k_manual_pix_reserve_affiliate(uuid,text,text,text,text,integer,integer,text,boolean) to service_role;
