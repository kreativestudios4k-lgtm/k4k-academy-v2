// Supabase storage for the webhook handler. Uses the service role key, which must
// only ever be read on the server. Every write is conditional on last_event_created,
// so an older Stripe event cannot overwrite a newer one.
import {createClient} from '@supabase/supabase-js';
import {assertBillingKey,billingMode} from './billing-policy.mjs';
import {launchSessionOutcome} from './soft-launch.mjs';

export function createMembershipStore({url, serviceKey, liveMode=billingMode()==='live'}) {
  const membershipTable=liveMode?'k4k_app_memberships':'memberships';
  const invoiceRpc=liveMode?'k4k_app_apply_invoice_event':'k4k_apply_invoice_event';
  const holdRpc=liveMode?'k4k_app_hold_billing_account':'k4k_hold_billing_account';
  const db = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});

  const newerOrUnset = (eventCreated) => `last_event_created.is.null,last_event_created.lte.${eventCreated}`;

  async function ensure(result) {
    if (result.error) throw new Error('DATABASE_WRITE_FAILED');
    return result.data;
  }

  return {
    async hasProcessedEvent(eventId) {
      const data = await ensure(await db.from('stripe_webhook_events').select('event_id').eq('event_id', eventId).maybeSingle());
      return Boolean(data);
    },

    async markProcessed({eventId, type}) {
      await ensure(await db.from('stripe_webhook_events').upsert({event_id: eventId, type}, {onConflict: 'event_id', ignoreDuplicates: true}));
    },

    async userIdForCustomer(stripeCustomerId) {
      const data = await ensure(await db.from(membershipTable).select('user_id').eq('stripe_customer_id', stripeCustomerId).maybeSingle());
      return data?.user_id ?? null;
    },

    async linkCustomer({userId, stripeCustomerId, plan, eventCreated}) {
      // A row is created as 'inactive' so no access is granted until a subscription event arrives.
      const existing = await ensure(await db.from(membershipTable).select('user_id').eq('user_id', userId).maybeSingle());
      if (!existing) {
        await ensure(await db.from(membershipTable).insert({
          user_id: userId, status: 'inactive', plan: plan || 'starter',
          stripe_customer_id: stripeCustomerId, last_event_created: null,
        }));
        return {handled: true};
      }
      // Linking a customer is not a subscription-state transition. A checkout event
      // can be newer than subscription.created and invoice.paid.
      await ensure(await db.from(membershipTable).update({stripe_customer_id: stripeCustomerId})
        .eq('user_id', userId).or(newerOrUnset(eventCreated)));
      return {handled: true};
    },

    async applyMembership({userId, membership, eventCreated}) {
      const data = await ensure(await db.from(membershipTable).update({
        ...membership,
        last_event_created: eventCreated,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).or(newerOrUnset(eventCreated)).select('user_id'));
      if (!data?.length) return {handled: false, reason: 'STALE_EVENT'};
      return {handled: true};
    },

    async applyInvoiceEvent({eventId,eventType,eventCreated,userId,stripeCustomerId,stripeSubscriptionId,invoiceId,status,periodEnd,credits}){
      return ensure(await db.rpc(invoiceRpc,{p_event:eventId,p_type:eventType,p_created:eventCreated,p_user:userId,p_customer:stripeCustomerId,p_subscription:stripeSubscriptionId,p_invoice:invoiceId,p_status:status,p_period_end:periodEnd?new Date(periodEnd*1000).toISOString():null,p_credits:credits}));
    },
    async checkoutSession(id){
      if(typeof id!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(id))throw Error('INVALID_SESSION');
      assertBillingKey(process.env.STRIPE_SECRET_KEY);
      const response=await fetch('https://api.stripe.com/v1/checkout/sessions/'+id+'?expand[]=line_items&expand[]=payment_intent.latest_charge',{headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('PAYMENT_VERIFICATION_UNAVAILABLE');return response.json();
    },
    async launchOutcome(session,outcome){return launchSessionOutcome(db,session,outcome);},
    async holdBilling(args){return ensure(await db.rpc(holdRpc,args));},
    async applyTopupEvent(args){return ensure(await db.rpc('k4k_apply_topup_event',args));},
    async reverseTopup(args){return ensure(await db.rpc('k4k_reverse_topup',args));},
  };
}
