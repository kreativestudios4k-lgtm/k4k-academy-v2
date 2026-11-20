-- Isolated K4K V2 Stripe TEST only. NEVER run against production Academy/K4K APP.
-- Keep subscription billing collection separate from prepaid credit ownership.
-- Existing RLS: only service_role may read/write checkout bindings.
alter table public.k4k_v2_checkout_bindings
  add column if not exists billing_state text not null default 'current';
alter table public.k4k_v2_checkout_bindings
  add column if not exists billing_invoice_id text;
alter table public.k4k_v2_checkout_bindings
  add column if not exists billing_updated_at timestamptz;
alter table public.k4k_v2_checkout_bindings
  add constraint k4k_v2_test_billing_state_valid
  check (billing_state in ('current','past_due'));
alter table public.k4k_v2_checkout_bindings
  add constraint k4k_v2_test_billing_invoice_valid
  check (billing_invoice_id is null or billing_invoice_id ~ '^in_[A-Za-z0-9_]+$');
alter table public.k4k_v2_checkout_bindings
  add constraint k4k_v2_test_billing_subscription_only
  check (kind='subscription' or (billing_state='current' and billing_invoice_id is null));
