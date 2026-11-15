create table if not exists public.k4k_affiliate_applications (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, full_name text not null, country text not null check (country ~ '^[A-Z]{2}$'),
 language text not null, instagram text not null, status text not null default 'pending_review' check (status in ('pending_review','approved','rejected')),
 created_at timestamptz not null default now(), confirmation_sent_at timestamptz, confirmation_provider_id text, team_notified_at timestamptz
);
alter table public.k4k_affiliate_applications enable row level security;
revoke all on public.k4k_affiliate_applications from anon, authenticated;
grant select,insert,update on public.k4k_affiliate_applications to service_role;
