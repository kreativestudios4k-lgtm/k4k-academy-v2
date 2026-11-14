// Recognize a signed, deliberately unpaid live Checkout expiry. A receipt
// proves production signature verification and database connectivity without
// opening checkout, granting credits or changing any subscription.
export function isLiveWebhookAudit(event){
 const s=event?.data?.object;
 return event?.livemode===true&&event.type==='checkout.session.expired'&&
  typeof event.id==='string'&&/^evt_[a-zA-Z0-9_]+$/.test(event.id)&&
  s?.livemode===true&&s.mode==='subscription'&&s.status==='expired'&&s.payment_status==='unpaid'&&
  typeof s.id==='string'&&/^cs_live_[a-zA-Z0-9_]+$/.test(s.id)&&
  /^k4k-webhook-audit-\d{8}-\d{2}$/.test(s.metadata?.k4k_webhook_audit||'')&&
  !s.customer&&!s.subscription&&!s.payment_intent&&!s.client_reference_id&&!s.metadata?.k4k_launch_claim;
}
