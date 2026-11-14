// PIX Automático is offered only on the trusted BRL live subscription path.
import {PLAN_PRICES} from '../k4k-plan-prices.mjs';

export const BRAZIL_PIX_STRIPE_VERSION='2026-09-30.endive';

// Stripe's PIX Automático mandate defaults to a 400 BRL ceiling with
// amount_type=maximum, and a charge above the authorised ceiling is refused by
// the customer's bank. Pro (R$449.99) and Studio (R$899.99) both cost more than
// that before IOF, so on the default every charge on those plans would fail.
// The ceiling is the plan price plus headroom for the 3.5% IOF the customer
// pays and for later price changes, rounded up to whole reais.
export const PIX_MANDATE_HEADROOM=1.2;
export function pixMandateAmount(plan){
 const price=PLAN_PRICES[plan]?.BRL;
 if(!Number.isInteger(price)||price<=0)return null;
 return Math.ceil(price*PIX_MANDATE_HEADROOM/100)*100;
}

// With PIX the first payment is not taken at checkout: the mandate start date
// defaults to three days ahead, so saying "charged now" would be untrue. Card
// is still offered in the same session, so this covers both.
export const BRAZIL_PIX_SUBMIT_MESSAGE='Pagamento com cartão é cobrado agora. Com Pix, você autoriza a assinatura no app do seu banco e a primeira cobrança ocorre na data agendada, cerca de três dias depois. Os créditos entram assim que o pagamento for confirmado. Durante o lançamento, as renovações seguintes ficam retidas até haver capacidade de geração financiada, e novos créditos mensais só entram quando uma renovação é paga. Fale com o suporte para cancelar ou tirar dúvidas de cobrança.';
export function brazilPixEnabled(currency,env=process.env){
 return env.VERCEL_ENV==='production'&&env.K4K_BRAZIL_PIX_ENABLED==='true'&&currency==='BRL';
}
export function configureBrazilPixCheckout(form,currency,plan,env=process.env){
 if(!brazilPixEnabled(currency,env))return false;
 // New Stripe API uses a compatibility-filtered allowed list, not the removed
 // payment_method_types request field. Keep both PIX and credit/debit cards.
 form.set('allowed_payment_method_types[0]','pix');
 form.set('allowed_payment_method_types[1]','card');
 form.set('allowed_payment_method_types[2]','link');
 form.set('locale','pt-BR');
 // Authorise the real plan amount. Without this the mandate falls back to
 // Stripe's 400 BRL default and Pro and Studio charges are refused.
 const amount=pixMandateAmount(plan);
 if(amount===null)throw Error('LAUNCH_CONFIG_INVALID');
 form.set('payment_method_options[pix][mandate_options][amount]',String(amount));
 form.set('payment_method_options[pix][mandate_options][amount_type]','maximum');
 form.set('payment_method_options[pix][mandate_options][currency]','brl');
 form.set('payment_method_options[pix][mandate_options][payment_schedule]','monthly');
 form.set('payment_method_options[pix][mandate_options][reference]','K4K APP');
 // Outside the US, Stripe Tax resolves a location from country, state and
 // postal code, so demanding a street address only cost us the sale. Other
 // markets keep full precision, which US sales tax does need.
 form.set('automatic_tax[address_collection_precision]','minimal');
 return true;
}
export function brazilPixHeaders(form){
 return form.get('allowed_payment_method_types[0]')==='pix'?{'Stripe-Version':BRAZIL_PIX_STRIPE_VERSION}:{};
}
export function checkoutSupportsPix(session){return Array.isArray(session?.payment_method_types)&&session.payment_method_types.includes('pix');}
export function replaceableCardOnlyCheckout(session){
 return session?.livemode===true&&session?.mode==='subscription'&&session?.currency==='brl'&&session?.status==='open'&&session?.payment_status==='unpaid'&&!session.customer&&!session.subscription&&!session.payment_intent&&!checkoutSupportsPix(session);
}
