// A separate K4K endpoint receives account-wide Stripe events. Do not mutate
// legacy Academy memberships or consume their event receipts.
import {livePrices} from './live-price-config.mjs';
import {invoiceLinePriceId} from './stripe-invoice-shape.mjs';
const marked=metadata=>typeof metadata?.k4k_launch_claim==='string'&&metadata.k4k_launch_claim.length>0;
export function isK4KLiveEvent(event,env=process.env){
 const o=event?.data?.object;
 if(event?.livemode!==true)return true;
 if(!o)return false;
 const type=event.type;
 if(type.startsWith('checkout.session.'))return o.mode==='subscription'?marked(o.metadata):o.metadata?.kind==='k4k_credit_pack';
 const prices=livePrices('plans',env);
 const approved=new Set(Object.values(prices||{}).flatMap(p=>Object.values(p)));
 if(type.startsWith('customer.subscription.'))return marked(o.metadata)||o.items?.data?.some(item=>approved.has(item.price?.id))===true;
 if(type==='invoice.paid'||type==='invoice.payment_failed'){
  if(marked(o.parent?.subscription_details?.metadata)||marked(o.subscription_details?.metadata))return true;
  return o.lines?.data?.some(line=>approved.has(invoiceLinePriceId(line)))===true;
 }
 // Charge/dispute events require provider-side attribution; no blanket hold
 // against a customer who might also have a legacy Academy purchase.
 if(type==='charge.refunded'||type==='charge.dispute.created')return o.metadata?.kind==='k4k_credit_pack'||marked(o.metadata);
 return false;
}
