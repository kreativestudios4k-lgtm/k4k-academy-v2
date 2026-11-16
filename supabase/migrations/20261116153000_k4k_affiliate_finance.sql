-- Affiliate accounting is separate from membership/credit fulfillment.
-- No payments, balances or existing partner rates are changed by this migration.
create table public.k4k_affiliate_commissions(
 source_kind text not null check(source_kind in ('card_invoice','manual_pix')),
 source_id text not null,charge_id text not null unique,
 customer_user_id uuid not null references auth.users(id) on delete restrict,
 partner_user_id uuid not null references public.k4k_app_partners(user_id) on delete restrict,
 partner_code text not null,commission_bps integer not null check(commission_bps in (1000,2500)),
 currency text not null check(currency in ('BRL','GBP','EUR','USD')),
 gross_minor integer not null check(gross_minor>0),
 tax_minor integer not null check(tax_minor between 0 and gross_minor),
 refunded_minor integer not null default 0 check(refunded_minor between 0 and gross_minor),
 disputed boolean not null default false,
 eligible_minor integer generated always as (case when disputed then 0 else greatest(gross_minor-tax_minor-refunded_minor,0) end) stored,
 commission_minor integer generated always as (floor((case when disputed then 0 else greatest(gross_minor-tax_minor-refunded_minor,0) end)::numeric*commission_bps/10000)::integer) stored,
 state text not null default 'pending' check(state in ('pending','approved','paid','reversed','review')),
 paid_minor integer not null default 0 check(paid_minor>=0),payout_channel text check(payout_channel in ('pix','bank')),
 payout_reference text check(length(payout_reference) between 4 and 120),
 payment_at timestamptz not null,approved_at timestamptz,requested_at timestamptz,paid_at timestamptz,
 verified_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(source_kind,source_id),check(customer_user_id<>partner_user_id),
 check((paid_minor=0 and paid_at is null and payout_reference is null and payout_channel is null) or (paid_minor>0 and paid_at is not null and payout_reference is not null and payout_channel is not null))
);
create index k4k_affiliate_commission_partner_idx on public.k4k_affiliate_commissions(partner_user_id,payment_at desc);
alter table public.k4k_affiliate_commissions enable row level security;
revoke all on public.k4k_affiliate_commissions from public,anon,authenticated;
grant select,insert,update on public.k4k_affiliate_commissions to service_role;

-- A verified Stripe payment is immutable in identity, currency and gross amount.
-- Refunds are monotonic; a subsequent reversal never erases a recorded payout.
create function public.k4k_affiliate_record_commission(p_kind text,p_source text,p_charge text,p_user uuid,p_currency text,p_gross integer,p_tax integer,p_refund integer,p_disputed boolean,p_paid_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_affiliate_commissions%rowtype; r public.k4k_app_referrals%rowtype; p public.k4k_app_partners%rowtype; v_refund integer;v_disputed boolean;v_net integer;v_state text;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_kind is null or p_kind not in ('card_invoice','manual_pix') or p_source is null or (p_kind='card_invoice' and p_source!~'^in_[A-Za-z0-9_]{3,240}$') or (p_kind='manual_pix' and p_source!~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') or p_charge is null or p_charge!~'^(ch|py)_[A-Za-z0-9_]{3,240}$' or p_user is null or p_currency is null or p_currency not in ('BRL','GBP','EUR','USD') or p_gross is null or p_gross<=0 or p_tax is null or p_tax<0 or p_tax>p_gross or p_refund is null or p_refund<0 or p_refund>p_gross or p_disputed is null or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'INVALID_COMMISSION_PAYMENT';end if;
 perform pg_catalog.pg_advisory_xact_lock(hashtext('k4k-commission:'||p_kind||':'||p_source));
 select * into c from public.k4k_affiliate_commissions where source_kind=p_kind and source_id=p_source for update;
 if found then
  if c.charge_id<>p_charge or c.customer_user_id<>p_user or c.currency<>p_currency or c.gross_minor<>p_gross or c.tax_minor<>p_tax or c.payment_at<>p_paid_at then raise exception 'COMMISSION_PAYMENT_MISMATCH';end if;
  v_refund:=greatest(c.refunded_minor,p_refund);v_disputed:=c.disputed or p_disputed;v_net:=case when v_disputed then 0 else greatest(p_gross-p_tax-v_refund,0) end;
  v_state:=c.state;
  if v_refund<>c.refunded_minor or v_disputed<>c.disputed then
   v_state:=case when c.paid_minor>0 or v_disputed or c.state='review' then 'review' when v_net=0 then 'reversed' else 'pending' end;
  end if;
  update public.k4k_affiliate_commissions set refunded_minor=v_refund,disputed=v_disputed,state=v_state,verified_at=now(),updated_at=now(),
   approved_at=case when v_state in ('approved','paid','review') then approved_at else null end,
   requested_at=case when v_state in ('approved','paid','review') then requested_at else null end
  where source_kind=p_kind and source_id=p_source returning * into c;
  return to_jsonb(c);
 end if;
 select * into r from public.k4k_app_referrals where user_id=p_user;
 if not found or r.attributed_at>p_paid_at or r.partner_user_id=p_user then return jsonb_build_object('skipped',true,'reason','NO_ELIGIBLE_REFERRAL');end if;
 select * into p from public.k4k_app_partners where user_id=r.partner_user_id and active for share;
 if not found or p.code<>r.partner_code or p.commission_bps not in (1000,2500) then return jsonb_build_object('skipped',true,'reason','PARTNER_NOT_ELIGIBLE');end if;
 v_net:=case when p_disputed then 0 else greatest(p_gross-p_tax-p_refund,0) end;
 insert into public.k4k_affiliate_commissions(source_kind,source_id,charge_id,customer_user_id,partner_user_id,partner_code,commission_bps,currency,gross_minor,tax_minor,refunded_minor,disputed,state,payment_at)
 values(p_kind,p_source,p_charge,p_user,p.user_id,p.code,p.commission_bps,p_currency,p_gross,p_tax,p_refund,p_disputed,case when p_disputed then 'review' when v_net=0 then 'reversed' else 'pending' end,p_paid_at) returning * into c;
 return to_jsonb(c);
end $$;

create function public.k4k_affiliate_review_charge(p_charge text,p_refund integer,p_disputed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_affiliate_commissions%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 select * into c from public.k4k_affiliate_commissions where charge_id=p_charge;
 if not found then return jsonb_build_object('skipped',true,'reason','NO_COMMISSION');end if;
 return public.k4k_affiliate_record_commission(c.source_kind,c.source_id,c.charge_id,c.customer_user_id,c.currency,c.gross_minor,c.tax_minor,p_refund,p_disputed,c.payment_at);
end $$;

-- Approval requires fresh verification and a 30-day review window. "Paid" only
-- records an already completed external transfer; no transfer is initiated here.
create function public.k4k_affiliate_commission_transition(p_kind text,p_source text,p_action text,p_expected_minor integer,p_reference text,p_channel text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_affiliate_commissions%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 select * into c from public.k4k_affiliate_commissions where source_kind=p_kind and source_id=p_source for update;
 if not found or p_expected_minor is null or c.commission_minor<>p_expected_minor or c.commission_minor<=0 or c.disputed or c.verified_at<now()-interval '2 minutes' then raise exception 'COMMISSION_REVIEW_REQUIRED';end if;
 if p_action='approve' then
  if c.state<>'pending' or c.payment_at>now()-interval '30 days' then raise exception 'COMMISSION_NOT_READY';end if;
  update public.k4k_affiliate_commissions set state='approved',approved_at=now(),updated_at=now() where source_kind=p_kind and source_id=p_source returning * into c;
 elsif p_action='paid' then
  if c.state<>'approved' or c.paid_minor<>0 or p_reference is null or length(trim(p_reference)) not between 4 and 120 or p_channel is null or p_channel not in ('pix','bank') or (p_channel='pix' and c.currency<>'BRL') then raise exception 'PAYOUT_RECORD_INVALID';end if;
  update public.k4k_affiliate_commissions set state='paid',paid_minor=commission_minor,payout_reference=trim(p_reference),payout_channel=p_channel,paid_at=now(),updated_at=now() where source_kind=p_kind and source_id=p_source returning * into c;
 else raise exception 'INVALID_ACTION';end if;
 return to_jsonb(c);
end $$;

create function public.k4k_affiliate_request_payout(p_partner uuid,p_kind text,p_source text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.k4k_affiliate_commissions%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 update public.k4k_affiliate_commissions set requested_at=coalesce(requested_at,now()),updated_at=now() where partner_user_id=p_partner and source_kind=p_kind and source_id=p_source and state='approved' and commission_minor>0 and not disputed returning * into c;
 if not found then raise exception 'PAYOUT_NOT_AVAILABLE';end if;
 return jsonb_build_object('requestedAt',c.requested_at);
end $$;
revoke all on function public.k4k_affiliate_record_commission(text,text,text,uuid,text,integer,integer,integer,boolean,timestamptz),public.k4k_affiliate_review_charge(text,integer,boolean),public.k4k_affiliate_commission_transition(text,text,text,integer,text,text),public.k4k_affiliate_request_payout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.k4k_affiliate_record_commission(text,text,text,uuid,text,integer,integer,integer,boolean,timestamptz),public.k4k_affiliate_review_charge(text,integer,boolean),public.k4k_affiliate_commission_transition(text,text,text,integer,text,text),public.k4k_affiliate_request_payout(uuid,text,text) to service_role;
