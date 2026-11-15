import {PLAN_PRICES} from '../k4k-plan-prices.mjs';
// PIX Automático is offered only on the trusted BRL live subscription path.
export const BRAZIL_PIX_STRIPE_VERSION='2026-09-30.endive';
export function brazilPixEnabled(currency,env=process.env){
 return env.VERCEL_ENV==='production'&&env.K4K_BRAZIL_PIX_ENABLED==='true'&&currency==='BRL';
}
export function configureBrazilPixCheckout(form,currency,env=process.env){
 if(!brazilPixEnabled(currency,env))return false;
 const plan=form.get('metadata[plan_key]');
 const amount=Object.hasOwn(PLAN_PRICES,plan)?PLAN_PRICES[plan].BRL:null;
 if(form.get('mode')!=='subscription'||!Number.isSafeInteger(amount)||amount<1)throw Error('PIX_PLAN_NOT_CONFIGURED');
 // Stripe defaults to R$400: explicitly cover the approved monthly amount,
 // including Pro and Studio, without authorizing arbitrary future increases.
 const mandate='payment_method_options[pix][mandate_options]';
 form.set(mandate+'[amount]',String(amount));
 form.set(mandate+'[amount_type]','maximum');
 form.set(mandate+'[currency]','brl');
 form.set(mandate+'[payment_schedule]','monthly');
 // Preserve Stripe's default: the bank discloses cross-border IOF separately.
 form.set(mandate+'[amount_includes_iof]','never');
 form.set(mandate+'[reference]','K4K APP '+plan);

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
