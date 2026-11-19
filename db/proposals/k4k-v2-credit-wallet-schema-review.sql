-- REVIEW-ONLY SCHEMA PROPOSAL: DO NOT RUN AGAINST PRODUCTION.
-- Deliberately stored in db/proposals, NOT supabase/migrations.
-- Only a future independently approved migration may create these tables.
-- Stage 3 isolates the V2 denomination; legacy k4k_live_credit_accounts,
-- k4k_live_credit_grants, k4k_launch_paid_claims and generation tables are untouched.
--
-- DESIGN: amount changes MUST go through a future reviewed service_role-only
-- transactional RPC, using SELECT ... FOR UPDATE on account and receipt/job rows.
-- THIS FILE DOES NOT AUTHORIZE CREDITS OR IMPLEMENT THAT RPC.
-- All checkout/webhook flags MUST stay off.

create table public.k4k_v2_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete restrict,
  credit_version text not null default 'v2' check (credit_version = 'v2'),
  available integer not null default 0 check (available >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  reversal_debt integer not null default 0 check (reversal_debt >= 0),
  billing_hold boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.k4k_v2_credit_accounts is
  'DRAFT ONLY. New denomination separate from legacy K4K LIVE credits. Not a live grant source.';

create table public.k4k_v2_credit_receipts (
  receipt_key text primary key check (receipt_key ~ '^(in|pi)_[A-Za-z0-9_]+$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  source_kind text not null check (source_kind in ('subscription_invoice','single_video_payment')),
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('GBP','EUR','USD','BRL')),
  credit_version text not null default 'v2' check (credit_version = 'v2'),
  credited integer not null check (credited > 0 and credited <= 10000),
  status text not null default 'paid' check (status in ('paid','refunded','disputed')),
  first_paid_event text not null,
  paid_at timestamptz not null default now(),
  refund_event text,
  refunded_at timestamptz,
  constraint receipt_refund_coherent check
    ((status = 'paid' and refunded_at is null and refund_event is null) or
     (status in ('refunded','disputed'))),
  constraint receipt_kind_matches_source check
    ((source_kind='subscription_invoice' and receipt_key like 'in_%') or
     (source_kind='single_video_payment' and receipt_key like 'pi_%'))
);
create index k4k_v2_receipts_owner_idx on public.k4k_v2_credit_receipts(user_id, paid_at desc);
comment on table public.k4k_v2_credit_receipts is
  'DRAFT ONLY. Receipt key is authoritative paid invoice or payment intent; duplicate source IDs cannot grant twice.';

create table public.k4k_v2_generation_reservations (
  job_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  credit_version text not null default 'v2' check (credit_version='v2'),
  quote_sha256 text not null check (quote_sha256 ~ '^[0-9a-f]{64}$'),
  provider_cost_micros bigint not null check (provider_cost_micros > 0),
  credits integer not null check (credits > 0 and credits <= 10000),
  state text not null default 'reserved' check (state in ('reserved','settled','released')),
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint v2_reservation_final_state_coherent check
    ((state='reserved' and settled_at is null) or
     (state in ('settled','released') and settled_at is not null))
);
create index k4k_v2_reservations_owner_idx on public.k4k_v2_generation_reservations(user_id, reserved_at desc);
comment on table public.k4k_v2_generation_reservations is
  'DRAFT ONLY. Quote hash must be verified by server; each job can reserve, settle, or release exactly once.';

create table public.k4k_v2_credit_events (
  event_key text primary key check (length(event_key) between 5 and 160),
  user_id uuid not null references auth.users(id) on delete restrict,
  event_kind text not null check (event_kind in
    ('grant_paid','reserve_generation','settle_generation','release_generation','refund_payment')),
  payment_receipt text references public.k4k_v2_credit_receipts(receipt_key) on delete restrict,
  generation_job_id uuid references public.k4k_v2_generation_reservations(job_id) on delete restrict,
  delta_available bigint not null,
  delta_reserved bigint not null,
  delta_reversal_debt bigint not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  constraint v2_event_reference_coherent check (
    (event_kind in ('grant_paid','refund_payment') and payment_receipt is not null and generation_job_id is null)
    or
    (event_kind in ('reserve_generation','settle_generation','release_generation') and generation_job_id is not null and payment_receipt is null)
  )
);
create index k4k_v2_credit_events_owner_idx on public.k4k_v2_credit_events(user_id, created_at desc);
comment on table public.k4k_v2_credit_events is
  'DRAFT ONLY. Append-only audit log, keyed by stable idempotency source and payload digest.';

-- All four tables are in the publicly exposed schema, so RLS is mandatory.
-- NO browser role may read or write V2 ledger data directly at this stage.
alter table public.k4k_v2_credit_accounts enable row level security;
alter table public.k4k_v2_credit_receipts enable row level security;
alter table public.k4k_v2_generation_reservations enable row level security;
alter table public.k4k_v2_credit_events enable row level security;

revoke all on table public.k4k_v2_credit_accounts from public, anon, authenticated;
revoke all on table public.k4k_v2_credit_receipts from public, anon, authenticated;
revoke all on table public.k4k_v2_generation_reservations from public, anon, authenticated;
revoke all on table public.k4k_v2_credit_events from public, anon, authenticated;
grant select, insert, update on public.k4k_v2_credit_accounts to service_role;
grant select, insert, update on public.k4k_v2_credit_receipts to service_role;
grant select, insert, update on public.k4k_v2_generation_reservations to service_role;
grant select, insert on public.k4k_v2_credit_events to service_role;

-- NEXT PHASE (NOT IMPLEMENTED OR APPROVED):
-- Atomic service_role-only RPC (SECURITY INVOKER, search_path=''):
-- 1. Verify signed Stripe event/paid invoice or payment intent using server Stripe key,
--    then atomically lock account and apply grant with receipt + ledger idempotency;
-- 2. Deduct reserve from V2 available, increase V2 reserved, insert job ledger;
-- 3. On verified provider settlement or failure, release/settle once;
-- 4. On refund/dispute, claw back available first, record debt if already spent,
--    set billing_hold, never touch legacy wallet.
-- All RPCs must be reviewed/tested for concurrency, race with webhook retries,
-- RLS, customer ownership, anti-replay and provider quote limits first.
