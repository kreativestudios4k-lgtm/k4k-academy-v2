// Supabase storage for the webhook handler. Uses the service role key, which must
// only ever be read on the server. Every write is conditional on last_event_created,
// so an older Stripe event cannot overwrite a newer one.
import {createClient} from '@supabase/supabase-js';

export function createMembershipStore({url, serviceKey}) {
  const db = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});

  const newerOrUnset = (eventCreated) => `last_event_created.is.null,last_event_created.lt.${eventCreated}`;
  const notNewerOrUnset = (eventCreated) => `last_event_created.is.null,last_event_created.lte.${eventCreated}`;

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
      const data = await ensure(await db.from('memberships').select('user_id').eq('stripe_customer_id', stripeCustomerId).maybeSingle());
      return data?.user_id ?? null;
    },

    async linkCustomer({userId, stripeCustomerId, plan, eventCreated}) {
      // A row is created as 'incomplete' so no access is granted until a subscription event arrives.
      const existing = await ensure(await db.from('memberships').select('user_id').eq('user_id', userId).maybeSingle());
      if (!existing) {
        await ensure(await db.from('memberships').insert({
          user_id: userId, status: 'incomplete', plan: plan || 'starter',
          stripe_customer_id: stripeCustomerId, last_event_created: eventCreated,
        }));
        return {handled: true};
      }
      await ensure(await db.from('memberships').update({stripe_customer_id: stripeCustomerId, last_event_created: eventCreated})
        .eq('user_id', userId).or(newerOrUnset(eventCreated)));
      return {handled: true};
    },

    async applyMembership({userId, membership, eventCreated}) {
      const data = await ensure(await db.from('memberships').update({
        ...membership,
        last_event_created: eventCreated,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId).or(newerOrUnset(eventCreated)).select('user_id'));
      if (!data?.length) return {handled: false, reason: 'STALE_EVENT'};
      return {handled: true};
    },

    // Idempotent per invoice: the database function grants only once for each invoice ID.
    async grantCredits({userId, invoiceId, credits}) {
      const data = await ensure(await db.rpc('k4k_grant_subscription_credits', {
        p_user: userId, p_invoice: invoiceId, p_credits: credits,
      }));
      return {granted: Boolean(data?.granted), balance: data?.balance ?? null};
    },

    async applyInvoiceStatus({userId, stripeSubscriptionId, status, periodEnd, eventCreated}) {
      // Stripe does not guarantee delivery order. An invoice can arrive after
      // checkout.session.completed but before customer.subscription.created.
      // Do not acknowledge that invoice as stale: ask Stripe to retry until the
      // matching subscription ID has been linked to this user's membership.
      const current = await ensure(await db.from('memberships')
        .select('stripe_subscription_id,last_event_created')
        .eq('user_id', userId).maybeSingle());
      if (!current) return {handled: false, reason: 'SUBSCRIPTION_NOT_LINKED'};
      if (current.stripe_subscription_id !== stripeSubscriptionId) {
        if (Number.isFinite(current.last_event_created) && Number.isFinite(eventCreated) && current.last_event_created > eventCreated) {
          return {handled: false, reason: 'STALE_EVENT'};
        }
        return {handled: false, reason: 'SUBSCRIPTION_NOT_LINKED'};
      }

      const patch = {status, last_event_created: eventCreated, updated_at: new Date().toISOString()};
      if (periodEnd) patch.current_period_end = new Date(periodEnd * 1000).toISOString();
      const data = await ensure(await db.from('memberships').update(patch)
        .eq('user_id', userId).eq('stripe_subscription_id', stripeSubscriptionId)
        // Stripe event timestamps have one-second precision; equal-second events
        // must not cause a legitimate paid invoice to be dropped.
        .or(notNewerOrUnset(eventCreated)).select('user_id'));
      if (!data?.length) return {handled: false, reason: 'STALE_EVENT'};
      return {handled: true};
    },
  };
}
