-- Monthly ledger foundation; no payment execution.
create table public.k4k_partner_earnings (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.k4k_app_partners(user_id),
 kind text not null check(kind in ('referral','video')),
 source_key text not null,
 currency text not null check(currency in ('BRL','GBP','USD','EUR')),
 amount_minor bigint not null check(amount_minor>=0),
 earned_at timestamptz not null,
 period_month date not null check(extract(day from period_month)=1),
 status text not null default 'pending' check(status in ('pending','approved','paid','void')),
 unique(kind,source_key)
);
create table public.k4k_partner_payouts (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.k4k_app_partners(user_id),
 period_month date not null check(extract(day from period_month)=1),
 currency text not null check(currency in ('BRL','GBP','USD','EUR')),
 amount_minor bigint not null check(amount_minor>0),
 due_date date generated always as ((period_month + interval '1 month 9 days')::date) stored,
 status text not null default 'pending' check(status in ('pending','paid')),
 paid_at timestamptz,
 payment_reference text,
 unique(partner_id,period_month,currency),
 check(status<>'paid' or (paid_at is not null and payment_reference is not null))
);
alter table public.k4k_partner_earnings enable row level security;
alter table public.k4k_partner_payouts enable row level security;
revoke all on public.k4k_partner_earnings,public.k4k_partner_payouts from public,anon,authenticated;
grant select,insert,update on public.k4k_partner_earnings,public.k4k_partner_payouts to service_role;
