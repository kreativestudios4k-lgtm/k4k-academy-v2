-- Isolated K4K V2 Stripe TEST only; never apply to live customer database.
-- An expired Checkout subscription has no Stripe subscription ID because
-- Checkout never completed. Preserve the strict requirement for active/canceled.
alter table public.k4k_v2_checkout_bindings
  drop constraint binding_has_verified_route;
alter table public.k4k_v2_checkout_bindings
  add constraint binding_has_verified_route check (
    (kind='subscription' and stripe_customer_id like 'cus_%'
      and ((status in ('pending','expired') and stripe_subscription_id is null)
           or (status in ('active','canceled') and stripe_subscription_id like 'sub_%')))
    or (kind='single_video' and stripe_subscription_id is null)
  );
