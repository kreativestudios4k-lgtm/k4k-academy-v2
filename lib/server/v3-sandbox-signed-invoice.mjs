// K4K V3: strict TEST-only signed invoice recheck, no customer identifiers exposed.
// This module is pure: all Stripe reads, signature verification and DB dispatch
// happen outside it. No production tables or real-money operations.
const STRIPE_TEST_PRICE='price_1Ue2WXL7fmdMaK0kstFPcl8A';
export const V3_SIGNED_QA_TAG='k4k_v3_signed_isolated_qa_20261121';
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:null;
const id=(x,p)=>typeof x==='string'&&new RegExp('^'+p+'_[A-Za-z0-9]{8,120}$').test(x);
const integer=x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const equal=(a,b)=>typeof a==='string'&&a===b;
const sumTax=(lines,mode)=>{
 if(!Array.isArray(lines)||lines.length>12)return null;
 let sum=0;
 for(const item of lines){
  if(!obj(item)||!integer(item.amount)||item.tax_behavior!==mode)return null;
  sum+=item.amount;
 }
 return Number.isSafeInteger(sum)?sum:null;
};
export function verifyV3SignedTestInvoice(event,invoice,subscription,price){
 const e=obj(event),snap=obj(e?.data?.object),i=obj(invoice),s=obj(subscription),p=obj(price);
 if(!e||!snap||!i||!s||!p||e.type!=='invoice.paid'||
    e.livemode!==false||!id(e.id,'evt')||!id(snap.id,'in')||
    snap.id!==i.id||snap.object!=='invoice'||snap.livemode!==false||
    snap.status!=='paid'||snap.customer!==i.customer||
    snap.currency!==i.currency||snap.amount_paid!==i.amount_paid||
    i.object!=='invoice'||i.livemode!==false||i.status!=='paid'||
    i.paid!==true||i.paid_out_of_band===true||i.collection_method!=='charge_automatically'||
    !['subscription_create','subscription_cycle'].includes(i.billing_reason)||
    i.currency!=='gbp'||!integer(i.amount_paid)||i.amount_paid<=0||
    i.amount_due!==i.amount_paid||i.total!==i.amount_paid||
    i.amount_remaining!==0||i.subtotal!==1599||
    (Array.isArray(i.discounts)&&i.discounts.length>0)||
    (i.discount!==undefined&&i.discount!==null))
  return null;
 const subId=i.parent?.subscription_details?.subscription||i.subscription;
 if(!id(subId,'sub')||!id(i.customer,'cus')||!id(p.id,'price')||
    p.id!==STRIPE_TEST_PRICE||p.livemode!==false||p.active!==true||
    p.currency!=='gbp'||p.unit_amount!==1599||
    !['inclusive','exclusive'].includes(p.tax_behavior)||
    p.recurring?.interval!=='month'||p.recurring?.interval_count!==1||
    p.metadata?.product_line!=='k4k_app'||
    p.metadata?.entitlement_version!=='v3'||
    p.metadata?.credit_version!=='k4k_phase17_new_v1'||
    p.metadata?.catalog_version!=='k4k-phase25-v3-new-customer'||
    p.metadata?.environment!=='isolated_test_only'||
    p.metadata?.monthly_credits!=='420'||
    s.id!==subId||s.livemode!==false||s.status!=='active'||
    s.customer!==i.customer||s.collection_method!=='charge_automatically'||
    s.metadata?.k4k_qa!==V3_SIGNED_QA_TAG||
    s.items?.has_more!==false||!Array.isArray(s.items?.data)||
    s.items.data.length!==1||s.items.data[0]?.price?.id!==p.id||
    s.items.data[0]?.quantity!==1)
  return null;
 const lines=i.lines?.data;
 if(i.lines?.has_more!==false||!Array.isArray(lines)||lines.length!==1)return null;
 const line=lines[0],period=line?.period;
 const priceId=line?.pricing?.price_details?.price||line?.price?.id;
 if(!line||priceId!==p.id||line.quantity!==1||line.amount!==1599||
    line.proration===true||line.parent?.subscription_item_details?.proration===true||
    line.parent?.subscription_item_details?.subscription!==subId||
    line.currency!==i.currency||!integer(period?.start)||period.start===0||
    !integer(period?.end)||period.end<=period.start||
    (Array.isArray(line.discount_amounts)&&line.discount_amounts.length>0))
  return null;
 const taxBehavior=p.tax_behavior;
 const top=sumTax(i.total_taxes??i.total_tax_amounts??[],taxBehavior);
 const detail=sumTax(line.taxes??[],taxBehavior);
 if(top===null||detail===null||top!==detail)return null;
 if(i.automatic_tax?.enabled===true&&i.automatic_tax.status!=='complete')return null;
 if(top>0&&i.automatic_tax?.enabled!==true)return null;
 const gross=taxBehavior==='inclusive'?1599:1599+top;
 const net=taxBehavior==='inclusive'?1599-top:1599;
 if(net<=0||!integer(gross)||gross!==i.amount_paid||net+top!==gross)return null;
 return Object.freeze({
  p_invoice_id:i.id,p_event_id:e.id,p_customer_id:i.customer,
  p_subscription_id:subId,p_price_id:p.id,
  p_period_start:period.start,p_currency:'GBP',p_price_minor:1599,p_paid:true,
  p_net_minor:net,p_tax_minor:top,p_gross_minor:gross,
  p_tax_behavior:taxBehavior
 });
}
