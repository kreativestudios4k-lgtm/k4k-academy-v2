-- SANDBOX-ONLY protected grant RPC, generated from reviewed atomic proposal.
-- NOTE: whitelists ONLY TEST-mode price IDs; execute exclusively in isolated
-- PostgreSQL fixture or independently provisioned Supabase TEST project.
-- Not a production migration. No LIVE Stripe price ID will pass this grant.
CREATE OR REPLACE FUNCTION public.k4k_v2_grant_paid_test(
 p_event text,p_user uuid,p_receipt text,p_source_kind text,
 p_stripe_price text,p_amount_minor bigint,p_currency text,p_credits integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $body$
DECLARE v_receipt public.k4k_v2_credit_receipts%rowtype;
        v_owner public.k4k_v2_credit_accounts%rowtype;
        v_verified boolean;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF p_user IS NULL OR p_event IS NULL OR length(p_event)<5 OR
    p_source_kind NOT IN ('subscription_invoice','single_video_payment') OR
    p_receipt !~ '^(in|pi)_[A-Za-z0-9_]+$' OR
    p_stripe_price !~ '^price_[A-Za-z0-9]+$' OR p_credits IS NULL OR p_credits<1
    THEN RAISE EXCEPTION 'V2_RECEIPT_INVALID';END IF;
 IF (p_source_kind='subscription_invoice' AND p_receipt NOT LIKE 'in_%')
   OR (p_source_kind='single_video_payment' AND p_receipt NOT LIKE 'pi_%')
    THEN RAISE EXCEPTION 'V2_RECEIPT_INVALID';END IF;
 SELECT EXISTS(SELECT 1 FROM (VALUES
 ('price_1UdcNHL7fmdMaK0kLEIj5I1W','GBP',1599,420,'subscription_invoice'),
 ('price_1UdcNUL7fmdMaK0kHJd1aMUZ','BRL',22490,840,'subscription_invoice'),
 ('price_1UdcNeL7fmdMaK0kied8fy2S','GBP',599,140,'single_video_payment')
 ) AS catalog(price_id,currency,amount_minor,credits,kind)
 WHERE catalog.price_id=p_stripe_price AND catalog.currency=p_currency
   AND catalog.amount_minor=p_amount_minor AND catalog.credits=p_credits
   AND catalog.kind=p_source_kind) INTO v_verified;
 IF NOT v_verified THEN RAISE EXCEPTION 'V2_PRICE_ENTITLEMENT_MISMATCH';END IF;
 INSERT INTO public.k4k_v2_credit_accounts(user_id) VALUES(p_user)
   ON CONFLICT (user_id) DO NOTHING;
 SELECT * INTO v_owner FROM public.k4k_v2_credit_accounts WHERE user_id=p_user FOR UPDATE;
 SELECT * INTO v_receipt FROM public.k4k_v2_credit_receipts WHERE receipt_key=p_receipt FOR UPDATE;
 IF FOUND THEN
   IF v_receipt.user_id<>p_user OR v_receipt.stripe_price_id<>p_stripe_price OR
      v_receipt.credited<>p_credits OR v_receipt.amount_minor<>p_amount_minor OR
      v_receipt.currency<>p_currency OR v_receipt.source_kind<>p_source_kind
     THEN RAISE EXCEPTION 'V2_RECEIPT_REPLAY_CONFLICT';END IF;
   RETURN jsonb_build_object('credited',false,'receipt',p_receipt,'state',v_receipt.status);
 END IF;
 INSERT INTO public.k4k_v2_credit_receipts
 (receipt_key,user_id,source_kind,stripe_price_id,amount_minor,currency,credited,first_paid_event)
 VALUES(p_receipt,p_user,p_source_kind,p_stripe_price,p_amount_minor,p_currency,p_credits,p_event);
 UPDATE public.k4k_v2_credit_accounts
 SET available=available+p_credits-least(reversal_debt,p_credits),
     reversal_debt=greatest(0,reversal_debt-p_credits),updated_at=now()
 WHERE user_id=p_user;
 INSERT INTO public.k4k_v2_credit_events
 (event_key,user_id,event_kind,payment_receipt,delta_available,delta_reserved,delta_reversal_debt,payload_sha256)
 VALUES(p_event,p_user,'grant_paid',p_receipt,p_credits-least(v_owner.reversal_debt,p_credits),
        0,-least(v_owner.reversal_debt,p_credits),repeat('0',64));
 RETURN jsonb_build_object('credited',true,'receipt',p_receipt,'credits',p_credits,'version','v2');
END
$body$;


REVOKE ALL ON FUNCTION public.k4k_v2_grant_paid_test(text,uuid,text,text,text,bigint,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.k4k_v2_grant_paid_test(text,uuid,text,text,text,bigint,text,integer)
 TO service_role;
