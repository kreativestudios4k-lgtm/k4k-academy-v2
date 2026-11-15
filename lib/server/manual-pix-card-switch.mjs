import {verifyLaunchSession} from './soft-launch.mjs';

// A customer explicitly choosing Pix may replace only a demonstrably unused
// subscription checkout. Stripe must confirm expiry before capacity is released.
export async function prepareManualPixCardSwitch({claim,userId,readSession,expireSession,releaseClaim}){
 if(!claim)return;
 if(claim.user_id!==userId||claim.state!=='reserved'||!claim.stripe_session_id)throw Error('EXISTING_SUBSCRIPTION_OR_CHECKOUT');
 let session=verifyLaunchSession(await readSession(claim.stripe_session_id),claim);
 if(session.payment_status!=='unpaid'||session.subscription||session.payment_intent||session.setup_intent)throw Error('EXISTING_SUBSCRIPTION_OR_CHECKOUT');
 if(session.status==='open'){
  // A Customer record is also created when billing details are entered; it
  // does not establish a payment or subscription. Ownership is verified above.
  session=verifyLaunchSession(await expireSession(session.id),claim);
 }
 if(session.status!=='expired'||session.payment_status!=='unpaid'||session.subscription||session.payment_intent||session.setup_intent)throw Error('EXISTING_SUBSCRIPTION_OR_CHECKOUT');
 await releaseClaim(claim,session);
}
