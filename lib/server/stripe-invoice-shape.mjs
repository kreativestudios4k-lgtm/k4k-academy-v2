// Accept both pre-Basil and current Stripe invoice payloads without guessing IDs.
const idOf=value=>typeof value==='string'?value:typeof value?.id==='string'?value.id:null;
function compatibleId(legacy,current){
 const a=idOf(legacy),b=idOf(current);
 if(a&&b&&a!==b)throw Error('CONFLICTING_INVOICE_FIELDS');
 return b||a;
}
export function invoiceSubscriptionId(invoice){return compatibleId(invoice?.subscription,invoice?.parent?.subscription_details?.subscription)}
export function invoiceLinePriceId(line){return compatibleId(line?.price,line?.pricing?.price_details?.price)}
