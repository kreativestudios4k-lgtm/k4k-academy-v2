-- Additive, disabled-by-default referral tracking for K4K APP.
-- No partner is enrolled, no existing account is attributed, and no payout is
-- created by this migration. Run only after k4k-app-service-separation.sql.
create table if not exists public.k4k_app_partners(
 user_id uuid primary key references auth.users(id) on delete restrict,
 code text unique not null check(code ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
 display_name text not null check(length(display_name) between 1 and 100),
 commission_bps integer not null default 1000 check(commission_bps between 0 and 5000),
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.k4k_app_referrals(
 user_id uuid primary key references auth.users(id) on delete restrict,
 partner_user_id uuid not null references public.k4k_app_partners(user_id) on delete restrict,
 partner_code text not null,
 attributed_at timestamptz not null default now(),
 check(user_id<>partner_user_id)
);
create index if not exists k4k_app_referrals_partner_idx on public.k4k_app_referrals(partner_user_id);
alter table public.k4k_app_partners enable row level security;
alter table public.k4k_app_referrals enable row level security;
revoke all on public.k4k_app_partners,public.k4k_app_referrals from public,anon,authenticated;
grant select,insert,update on public.k4k_app_partners to service_role;
grant select,insert on public.k4k_app_referrals to service_role;

create or replace function public.k4k_app_record_referral(p_user uuid,p_code text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.k4k_app_partners%rowtype; a public.k4k_app_referrals%rowtype;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 if p_user is null then raise exception 'INVALID_USER';end if;
 -- Serialize attribution with live seat admission; a link clicked after a
 -- checkout is reserved or paid cannot retrospectively earn a commission.
 perform pg_catalog.pg_advisory_xact_lock(724312,1042027);
 select * into a from public.k4k_app_referrals where user_id=p_user;
 if found then return jsonb_build_object('attributed',true,'code',a.partner_code);end if;
 if p_code is null or p_code !~ '^[a-z0-9][a-z0-9-]{2,39}$' then return jsonb_build_object('attributed',false,'reason','NO_REFERRAL');end if;
 if exists(select 1 from public.k4k_launch_paid_claims where user_id=p_user and state in ('reserved','paid')) or exists(select 1 from public.k4k_app_memberships where user_id=p_user and stripe_subscription_id is not null) then return jsonb_build_object('attributed',false,'reason','EXISTING_CHECKOUT');end if;
 select * into p from public.k4k_app_partners where code=p_code and active for share;
 if not found then return jsonb_build_object('attributed',false,'reason','INVALID_PARTNER');end if;
 if p.user_id=p_user then return jsonb_build_object('attributed',false,'reason','SELF_REFERRAL');end if;
 insert into public.k4k_app_referrals(user_id,partner_user_id,partner_code) values(p_user,p.user_id,p.code);
 return jsonb_build_object('attributed',true,'code',p.code);
end $$;

create or replace function public.k4k_app_partner_stats(p_partner uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.k4k_app_partners%rowtype; referred bigint; paid bigint; active_count bigint;
begin
 if current_user<>'service_role' or coalesce(auth.role(),'')<>'service_role' then raise exception 'FORBIDDEN';end if;
 select * into p from public.k4k_app_partners where user_id=p_partner and active;
 if not found then return jsonb_build_object('active',false);end if;
 select count(*) into referred from public.k4k_app_referrals where partner_user_id=p_partner;
 select count(*) into paid from public.k4k_app_referrals r where r.partner_user_id=p_partner and exists(select 1 from public.k4k_launch_paid_claims c where c.user_id=r.user_id and c.state='paid');
 select count(*) into active_count from public.k4k_app_referrals r join public.k4k_app_memberships m on m.user_id=r.user_id where r.partner_user_id=p_partner and m.status in ('active','trialing') and m.current_period_end>now();
 return jsonb_build_object('active',true,'code',p.code,'displayName',p.display_name,'commissionBps',p.commission_bps,'referred',referred,'paid',paid,'activeSubscriptions',active_count);
end $$;
revoke all on function public.k4k_app_record_referral(uuid,text),public.k4k_app_partner_stats(uuid) from public,anon,authenticated;
grant execute on function public.k4k_app_record_referral(uuid,text),public.k4k_app_partner_stats(uuid) to service_role;
