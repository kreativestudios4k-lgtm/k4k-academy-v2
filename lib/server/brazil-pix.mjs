import {manualPixUserAllowed} from './manual-pix-policy.mjs';
// PIX Automático is offered only on the trusted BRL live subscription path.
export const BRAZIL_PIX_STRIPE_VERSION='2026-09-30.endive';
export function brazilPixEnabled(currency,env=process.env){
 return env.VERCEL_ENV==='production'&&env.K4K_BRAZIL_PIX_ENABLED==='true'&&currency==='BRL';
}
export function configureBrazilPixCheckout(form,currency,env=process.env){
 if(currency==='BRL'&&manualPixUserAllowed(form.get('client_reference_id'),env)){
  form.set('allowed_payment_method_types[0]','card');form.set('allowed_payment_method_types[1]','link');return false;
 }
 if(!brazilPixEnabled(currency,env))return false;
 // New Stripe API uses a compatibility-filtered allowed list, not the removed
 // payment_method_types request field. Keep both PIX and credit/debit cards.
 form.set('allowed_payment_method_types[0]','pix');
 form.set('allowed_payment_method_types[1]','card');
 form.set('allowed_payment_method_types[2]','link');
 form.set('locale','pt-BR');
 return true;
}
export function brazilPixHeaders(form){
 return form.get('allowed_payment_method_types[0]')==='pix'?{'Stripe-Version':BRAZIL_PIX_STRIPE_VERSION}:{};
}
export function checkoutSupportsPix(session){return Array.isArray(session?.payment_method_types)&&session.payment_method_types.includes('pix');}
export function replaceableCardOnlyCheckout(session){
 return session?.livemode===true&&session?.mode==='subscription'&&session?.currency==='brl'&&session?.status==='open'&&session?.payment_status==='unpaid'&&!session.customer&&!session.subscription&&!session.payment_intent&&!checkoutSupportsPix(session);
}
