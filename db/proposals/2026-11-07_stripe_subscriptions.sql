-- PROPOSAL ONLY. Do not apply until approved. Additive: no data is changed or removed.
-- Reviewed against the live memberships columns on 7 Nov 2026.

alter table public.memberships
  add column if not exists stripe_price_id text,
  add column if not exists currency text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists last_event_created bigint;

create index if not exists memberships_stripe_customer_id_idx
  on public.memberships (stripe_customer_id);

-- Records each webhook event once, so Stripe retries are ignored.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- Only the service role (server) reads or writes this table. No policies means no client access.
alter table public.stripe_webhook_events enable row level security;
