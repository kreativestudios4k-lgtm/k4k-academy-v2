-- TEST-only webhook -> V3 atomic ledger RPC bridge.
-- This migration must ONLY be applied to Supabase project yhbhrkyihiyyfzqogyri.
-- Public schema is the exposed Data API; EXECUTE restricted to service_role.
-- Caller identity is checked in SQL; underlying ledger is SECURITY INVOKER.
BEGIN;
DO $guard$
BEGIN
 IF to_regnamespace('k4k_test_phase42') IS NULL
    OR to_regnamespace('k4k_test_phase35') IS NULL
    OR to_regnamespace('k4k_test_phase23') IS NULL
 THEN RAISE EXCEPTION 'K4K_TEST_PROJECT_ISOLATION_NOT_CONFIRMED'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.k4k_v3_test_phase43_grant_signed_invoice(
 p_invoice_id text,p_event_id text,p_customer_id text,p_subscription_id text,
 p_price_id text,p_period_start bigint,p_currency text,p_price_minor bigint,
 p_paid boolean,p_net_minor bigint,p_tax_minor bigint,p_gross_minor bigint,
 p_tax_behavior text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $body$
BEGIN
 IF current_user<>'service_role'
    OR p_price_id<>'price_1Ue2WXL7fmdMaK0kstFPcl8A'
    OR p_currency<>'GBP' OR p_price_minor<>1599
 THEN RAISE EXCEPTION 'K4K_V3_TEST_SIGNED_QA_SERVICE_ONLY'; END IF;
 RETURN k4k_test_phase42.k4k_v3_grant_verified_paid_invoice_financial_v2(
  p_invoice_id,p_event_id,p_customer_id,p_subscription_id,p_price_id,
  p_period_start,p_currency,p_price_minor,p_paid,p_net_minor,
  p_tax_minor,p_gross_minor,p_tax_behavior);
END $body$;
REVOKE ALL ON FUNCTION public.k4k_v3_test_phase43_grant_signed_invoice(
 text,text,text,text,text,bigint,text,bigint,boolean,bigint,bigint,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.k4k_v3_test_phase43_grant_signed_invoice(
 text,text,text,text,text,bigint,text,bigint,boolean,bigint,bigint,bigint,text)
 TO service_role;
COMMIT;
