-- SANDBOX-ONLY checkout ownership bindings. Execute only in disposable PGlite
-- or an independently provisioned test Supabase project, NEVER the live project.
-- Rows must be written by the server immediately after Stripe TEST Checkout
-- session creation; no browser-supplied owner or Stripe metadata alone is trusted.
create table public.k4k_v2_checkout_bindings (
 session_key text primary key check(session_key ~ '^cs_[A-Za-z0-9_]+$'),
 user_id uuid not null references auth.users(id) on delete restrict,
 kind text not null check (kind in ('subscription','single_video')),
 status text not null default 'active' check(status in ('active','canceled','expired')),
 price_id text not null check(price_id ~ '^price_[A-Za-z0-9]+$'),
 stripe_customer_id text,
 stripe_subscription_id text,
 stripe_session_id text not null unique,
 created_at timestamptz not null default now(),
 constraint binding_has_verified_route check (
   (kind='subscription' and stripe_customer_id like 'cus_%'
    and stripe_subscription_id like 'sub_%')
   or (kind='single_video' and stripe_subscription_id is null)
 )
);
create index k4k_v2_checkout_customer_idx on
 public.k4k_v2_checkout_bindings(stripe_customer_id,stripe_subscription_id,kind);
create unique index k4k_v2_checkout_subscription_once on
 public.k4k_v2_checkout_bindings(stripe_subscription_id)
 where stripe_subscription_id is not null and status='active';
alter table public.k4k_v2_checkout_bindings enable row level security;
revoke all on public.k4k_v2_checkout_bindings from PUBLIC,anon,authenticated;
grant select,insert,update on public.k4k_v2_checkout_bindings to service_role;
