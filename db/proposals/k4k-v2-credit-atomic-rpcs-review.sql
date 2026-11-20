-- STAGE 4 REVIEW-ONLY SQL. NEVER EXECUTE AGAINST LIVE SUPABASE.
-- Requires db/proposals/k4k-v2-credit-wallet-schema-review.sql in same transaction.
-- ALL financial RPCs are SECURITY INVOKER, service_role-only, search_path restricted.
-- Server must first verify Stripe signature, live-mode, paid status, owner, price,
-- invoice and payment-intent with Stripe API. SQL validates immutable contract too.
-- No Black Friday discounts until independently verified and added to contract.
-- Exact LIVE price allowlist includes both current .99 and previous V2 EUR/USD
-- Price IDs for immutable receipt history; this file is NOT applied in LIVE.
-- No PUBLIC/anon/authenticated execute privilege. No production migration created.
CREATE OR REPLACE FUNCTION public.k4k_v2_grant_paid(
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
    ('price_1UdblmL7fmdMaK0kyknLHpoV','GBP',1599,420,'subscription_invoice'),
    ('price_1UdaMfL7fmdMaK0kqWMennAm','EUR',1909,420,'subscription_invoice'),
    ('price_1UdaN2L7fmdMaK0kHJO5BRFg','USD',2095,420,'subscription_invoice'),
    ('price_1UdaN4L7fmdMaK0kyZ7ri7fR','BRL',11990,420,'subscription_invoice'),
    ('price_1UdaN5L7fmdMaK0kR6bEi94p','GBP',2999,840,'subscription_invoice'),
    ('price_1UdaNAL7fmdMaK0k3i1tog2r','EUR',3580,840,'subscription_invoice'),
    ('price_1UdaNCL7fmdMaK0k760pW6Ru','USD',3930,840,'subscription_invoice'),
    ('price_1UdaNDL7fmdMaK0kGnfYnT0n','BRL',22490,840,'subscription_invoice'),
    ('price_1UdaNML7fmdMaK0k0d6JK9J7','GBP',5999,1680,'subscription_invoice'),
    ('price_1UdaNNL7fmdMaK0kYtOCZ3M3','EUR',7162,1680,'subscription_invoice'),
    ('price_1UdaNPL7fmdMaK0kWUbY9EMm','USD',7861,1680,'subscription_invoice'),
    ('price_1UdaNRL7fmdMaK0kJ8PEQMVW','BRL',44990,1680,'subscription_invoice'),
    ('price_1UdaNSL7fmdMaK0kgAea7tD5','GBP',11999,3360,'subscription_invoice'),
    ('price_1UdaNTL7fmdMaK0kwUBoqHuY','EUR',14325,3360,'subscription_invoice'),
    ('price_1UdaNVL7fmdMaK0ki3bcblsG','USD',15724,3360,'subscription_invoice'),
    ('price_1UdaNWL7fmdMaK0kXu7oPXfl','BRL',89990,3360,'subscription_invoice'),
    ('price_1UdaO5L7fmdMaK0kvyYSd3Fj','GBP',599,140,'single_video_payment'),
    ('price_1UdaOCL7fmdMaK0kfOyMORbz','EUR',715,140,'single_video_payment'),
    ('price_1UdaOEL7fmdMaK0kxjtFqgtE','USD',785,140,'single_video_payment'),
    ('price_1UdaOFL7fmdMaK0kjgrYoO9f','BRL',4490,140,'single_video_payment'),
    -- 19 Nov .99 revision: NEW purchase Price IDs. Previous V2 rows above
    -- remain independently valid for already-paid receipts and renewals.
    ('price_1UddzFL7fmdMaK0kzN2sF4mq','EUR',1899,420,'subscription_invoice'),
    ('price_1UddzcL7fmdMaK0khce6RBqF','USD',2099,420,'subscription_invoice'),
    ('price_1UddzeL7fmdMaK0k3IQHJbl1','EUR',3599,840,'subscription_invoice'),
    ('price_1UddzhL7fmdMaK0kiA3ZSb62','USD',3999,840,'subscription_invoice'),
    ('price_1UddzjL7fmdMaK0kCPzo3pQv','EUR',7199,1680,'subscription_invoice'),
    ('price_1Ude03L7fmdMaK0kuN8hI153','USD',7899,1680,'subscription_invoice'),
    ('price_1Ude05L7fmdMaK0kszKPnctk','EUR',14399,3360,'subscription_invoice'),
    ('price_1Ude07L7fmdMaK0kQlPm0v1c','USD',15799,3360,'subscription_invoice'),
    ('price_1Ude0AL7fmdMaK0kTJW2vvLv','EUR',699,140,'single_video_payment'),
    ('price_1Ude0CL7fmdMaK0klngx62PZ','USD',799,140,'single_video_payment')
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

CREATE OR REPLACE FUNCTION public.k4k_v2_reserve_generation(
 p_event text,p_user uuid,p_job uuid,p_quote_sha256 text,p_cost_micros bigint,p_credits integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $body$
DECLARE a public.k4k_v2_credit_accounts%rowtype;
        j public.k4k_v2_generation_reservations%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF p_user IS NULL OR p_job IS NULL OR p_event IS NULL OR length(p_event)<5 OR
    p_quote_sha256 IS NULL OR p_quote_sha256 !~ '^[0-9a-f]{64}$' OR
    p_cost_micros IS NULL OR p_cost_micros<=0 OR
    p_credits IS NULL OR p_credits NOT BETWEEN 1 AND 10000
  THEN RAISE EXCEPTION 'V2_JOB_INVALID';END IF;
 SELECT * INTO a FROM public.k4k_v2_credit_accounts WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'V2_ACCOUNT_MISSING';END IF;
 SELECT * INTO j FROM public.k4k_v2_generation_reservations WHERE job_id=p_job FOR UPDATE;
 IF FOUND THEN
   IF j.user_id<>p_user OR j.quote_sha256<>p_quote_sha256 OR
      j.credits<>p_credits OR j.provider_cost_micros<>p_cost_micros
   THEN RAISE EXCEPTION 'V2_JOB_REPLAY_CONFLICT'; END IF;
   RETURN jsonb_build_object('reserved',false,'state',j.state,'credits',j.credits);
 END IF;
 IF a.billing_hold OR a.reversal_debt>0 THEN RAISE EXCEPTION 'BILLING_REVIEW_REQUIRED';END IF;
 IF a.available<p_credits THEN RAISE EXCEPTION 'INSUFFICIENT_V2_CREDITS';END IF;
 UPDATE public.k4k_v2_credit_accounts
 SET available=available-p_credits,reserved=reserved+p_credits,updated_at=now()
 WHERE user_id=p_user;
 INSERT INTO public.k4k_v2_generation_reservations
 (job_id,user_id,quote_sha256,provider_cost_micros,credits)
 VALUES(p_job,p_user,p_quote_sha256,p_cost_micros,p_credits);
 INSERT INTO public.k4k_v2_credit_events
 (event_key,user_id,event_kind,generation_job_id,delta_available,delta_reserved,delta_reversal_debt,payload_sha256)
 VALUES(p_event,p_user,'reserve_generation',p_job,-p_credits,p_credits,0,p_quote_sha256);
 RETURN jsonb_build_object('reserved',true,'job',p_job,'credits',p_credits);
END
$body$;

CREATE OR REPLACE FUNCTION public.k4k_v2_finish_generation(
 p_event text,p_user uuid,p_job uuid,p_outcome text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $body$
DECLARE j public.k4k_v2_generation_reservations%rowtype;
        a public.k4k_v2_credit_accounts%rowtype;
        v_repay integer;
        v_returned integer;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF p_user IS NULL OR p_job IS NULL OR length(coalesce(p_event,''))<5 OR p_outcome NOT IN ('settled','released')
 THEN RAISE EXCEPTION 'V2_FINISH_INVALID';END IF;
 SELECT * INTO a FROM public.k4k_v2_credit_accounts
 WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'V2_ACCOUNT_MISSING';END IF;
 SELECT * INTO j FROM public.k4k_v2_generation_reservations WHERE job_id=p_job FOR UPDATE;
 IF NOT FOUND OR j.user_id<>p_user THEN RAISE EXCEPTION 'V2_JOB_NOT_FOUND';END IF;
 IF j.state=p_outcome THEN RETURN jsonb_build_object('changed',false,'state',j.state);END IF;
 IF j.state<>'reserved' THEN RAISE EXCEPTION 'V2_JOB_ALREADY_FINAL';END IF;
 -- If a refunded payment created debt while the job was reserved,
 -- returned credits must first repay that debt. Never resurrect refunded
 -- spendable credits. The billing hold remains until independent review.
 v_repay:=CASE WHEN p_outcome='released' THEN least(j.credits,a.reversal_debt) ELSE 0 END;
 v_returned:=CASE WHEN p_outcome='released' THEN j.credits-v_repay ELSE 0 END;
 UPDATE public.k4k_v2_generation_reservations
 SET state=p_outcome,settled_at=now() WHERE job_id=p_job;
 UPDATE public.k4k_v2_credit_accounts
 SET reserved=reserved-j.credits,
     available=available+v_returned,
     reversal_debt=reversal_debt-v_repay,
     updated_at=now() WHERE user_id=p_user
       AND reserved>=j.credits AND reversal_debt>=v_repay;
 IF NOT FOUND THEN RAISE EXCEPTION 'V2_LEDGER_INVARIANT';END IF;
 INSERT INTO public.k4k_v2_credit_events
 (event_key,user_id,event_kind,generation_job_id,delta_available,delta_reserved,delta_reversal_debt,payload_sha256)
 VALUES(p_event,p_user,CASE WHEN p_outcome='released' THEN 'release_generation' ELSE 'settle_generation' END,
        p_job,v_returned,-j.credits,-v_repay,j.quote_sha256);
 RETURN jsonb_build_object('changed',true,'state',p_outcome,'credits',j.credits,
   'debt_repaid',v_repay,'available_returned',v_returned);
END
$body$;

CREATE OR REPLACE FUNCTION public.k4k_v2_refund_paid(
 p_event text,p_user uuid,p_receipt text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $body$
DECLARE r public.k4k_v2_credit_receipts%rowtype;
        a public.k4k_v2_credit_accounts%rowtype;
        v_taken integer;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF p_user IS NULL OR length(coalesce(p_event,''))<5 OR p_receipt !~ '^(in|pi)_[A-Za-z0-9_]+$'
   THEN RAISE EXCEPTION 'V2_REFUND_INVALID';END IF;
 SELECT * INTO a FROM public.k4k_v2_credit_accounts WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'V2_ACCOUNT_MISSING';END IF;
 SELECT * INTO r FROM public.k4k_v2_credit_receipts WHERE receipt_key=p_receipt FOR UPDATE;
 IF NOT FOUND OR r.user_id<>p_user THEN RAISE EXCEPTION 'V2_REFUND_RECEIPT_UNKNOWN';END IF;
 IF r.status='refunded' THEN RETURN jsonb_build_object('refunded',false,'state',r.status);END IF;
 IF r.status<>'paid' THEN RAISE EXCEPTION 'V2_REFUND_REVIEW_REQUIRED';END IF;
 v_taken:=least(a.available,r.credited);
 UPDATE public.k4k_v2_credit_accounts
 SET available=available-v_taken,reversal_debt=reversal_debt+(r.credited-v_taken),
     billing_hold=true,updated_at=now() WHERE user_id=p_user;
 UPDATE public.k4k_v2_credit_receipts SET status='refunded',refund_event=p_event,
     refunded_at=now() WHERE receipt_key=p_receipt;
 INSERT INTO public.k4k_v2_credit_events
 (event_key,user_id,event_kind,payment_receipt,delta_available,delta_reserved,delta_reversal_debt,payload_sha256)
 VALUES(p_event,p_user,'refund_payment',p_receipt,-v_taken,0,r.credited-v_taken,repeat('0',64));
 RETURN jsonb_build_object('refunded',true,'recovered',v_taken,'debt_added',r.credited-v_taken);
END
$body$;

REVOKE ALL ON FUNCTION public.k4k_v2_grant_paid(text,uuid,text,text,text,bigint,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.k4k_v2_reserve_generation(text,uuid,uuid,text,bigint,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.k4k_v2_finish_generation(text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.k4k_v2_refund_paid(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.k4k_v2_grant_paid(text,uuid,text,text,text,bigint,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.k4k_v2_reserve_generation(text,uuid,uuid,text,bigint,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.k4k_v2_finish_generation(text,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.k4k_v2_refund_paid(text,uuid,text) TO service_role;

-- UNSOLVED PRE-LAUNCH BLOCKERS: true provider USD funding lock, quote signature
-- verification, gateway routing, partial refund strategy, physical refunds, customer
-- consent, tax/coupon semantics, and real end-to-end TEST purchase must be addressed.
