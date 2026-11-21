import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyV3SignedTestInvoice,V3_SIGNED_QA_TAG}
 from '../lib/server/v3-sandbox-signed-invoice.mjs';
const PRICE='price_1Ue2WXL7fmdMaK0kstFPcl8A';
const SUB='sub_V3IsolatedSyntheticQA2026';
const CUS='cus_V3IsolatedSyntheticQA2026';
const INV='in_V3IsolatedSyntheticQA2026';
const EVT='evt_V3IsolatedSyntheticQA2026';
const data=(mode='exclusive',tax=0)=>{
 const gross=mode==='inclusive'?1599:1599+tax;
 const invoice={
  object:'invoice',id:INV,livemode:false,paid:true,status:'paid',
  paid_out_of_band:false,collection_method:'charge_automatically',
  billing_reason:'subscription_create',customer:CUS,currency:'gbp',
  parent:{subscription_details:{subscription:SUB}},
  subtotal:1599,total:gross,amount_paid:gross,amount_due:gross,
  amount_remaining:0,discounts:[],automatic_tax:{
   enabled:tax>0,status:tax>0?'complete':null},
  total_taxes:tax>0?[{amount:tax,tax_behavior:mode}]:[],
  lines:{has_more:false,data:[{
   quantity:1,amount:1599,currency:'gbp',
   pricing:{price_details:{price:PRICE}},
   parent:{subscription_item_details:{subscription:SUB,proration:false}},
   period:{start:1795272753,end:1797864753},
   taxes:tax>0?[{amount:tax,tax_behavior:mode}]:[],
   discount_amounts:[]
  }]}
 };
 const event={id:EVT,type:'invoice.paid',livemode:false,data:{
  object:{object:'invoice',id:INV,livemode:false,status:'paid',
   customer:CUS,currency:'gbp',amount_paid:gross}}};
 const subscription={id:SUB,customer:CUS,livemode:false,
  status:'active',collection_method:'charge_automatically',
  metadata:{k4k_qa:V3_SIGNED_QA_TAG},
  items:{has_more:false,data:[{price:{id:PRICE},quantity:1}]}};
 const price={id:PRICE,active:true,livemode:false,currency:'gbp',
  unit_amount:1599,tax_behavior:mode,
  recurring:{interval:'month',interval_count:1},
  metadata:{product_line:'k4k_app',entitlement_version:'v3',
   credit_version:'k4k_phase17_new_v1',
   catalog_version:'k4k-phase25-v3-new-customer',
   environment:'isolated_test_only',monthly_credits:'420'}};
 return {event,invoice,subscription,price};
};
test('isolated V3 TEST Stripe receipt produces correct zero-tax RPC proof',()=>{
 const x=data();
 const result=verifyV3SignedTestInvoice(x.event,x.invoice,x.subscription,x.price);
 assert.ok(result);
 assert.deepEqual(result,{
  p_invoice_id:INV,p_event_id:EVT,p_customer_id:CUS,
  p_subscription_id:SUB,p_price_id:PRICE,p_period_start:1795272753,
  p_currency:'GBP',p_price_minor:1599,p_paid:true,
  p_net_minor:1599,p_tax_minor:0,p_gross_minor:1599,
  p_tax_behavior:'exclusive'
 });
 assert.ok(Object.isFrozen(result));
});
test('inclusive and exclusive VAT yield distinct valid finance proofs',()=>{
 const a=data('inclusive',267),b=data('exclusive',320);
 assert.deepEqual([
  verifyV3SignedTestInvoice(a.event,a.invoice,a.subscription,a.price)?.p_net_minor,
  verifyV3SignedTestInvoice(b.event,b.invoice,b.subscription,b.price)?.p_gross_minor
 ],[1332,1919]);
});
test('LIVE event, changed invoice, wrong subscription, tax evidence and old app price fail',()=>{
 const changes=[
  x=>x.event.livemode=true,
  x=>x.event.data.object.amount_paid+=1,
  x=>x.invoice.paid=false,
  x=>x.invoice.total+=1,
  x=>x.subscription.status='canceled',
  x=>x.subscription.metadata.k4k_qa='outside_qa',
  x=>x.price.metadata.entitlement_version='v2',
  x=>x.price.metadata.environment='production',
  x=>x.price.id='price_WRONG9999999',
  x=>x.invoice.lines.has_more=true,
  x=>x.invoice.lines.data[0].quantity=2,
  x=>x.invoice.lines.data[0].discount_amounts.push({amount:1}),
  x=>x.price.recurring.interval='year',
  x=>x.invoice.parent.subscription_details.subscription='sub_FAKE999999999',
  x=>x.invoice.status='open',
  x=>x.invoice.paid_out_of_band=true
 ];
 for(const mutate of changes){
  const x=data();mutate(x);
  assert.equal(verifyV3SignedTestInvoice(x.event,x.invoice,x.subscription,x.price),null);
 }
});
test('tax behavior and total tax and line tax must match',()=>{
 const changes=[
  x=>x.invoice.total_taxes[0].amount+=1,
  x=>x.invoice.lines.data[0].taxes[0].amount+=1,
  x=>x.price.tax_behavior='exclusive',
  x=>x.invoice.automatic_tax.status='requires_location_inputs',
  x=>x.invoice.total-=1
 ];
 for(const mutate of changes){
  const x=data('inclusive',267);mutate(x);
  assert.equal(verifyV3SignedTestInvoice(x.event,x.invoice,x.subscription,x.price),null);
 }
});
test('new endpoint is isolated, signed, service only and never accesses LIVE Stripe',()=>{
 const s=readFileSync('app/api/v3/sandbox/webhook/route.js','utf8');
 assert.match(s,/process.env.VERCEL_ENV!=='preview'/);
 assert.match(s,/process.env.K4K_V3_TEST_WEBHOOK_ENABLED!=='true'/);
 assert.match(s,/verifyStripeSignature/);
 assert.match(s,/sk_test_/);
 assert.match(s,/k4k_v3_test_phase43_grant_signed_invoice/);
 assert.match(s,/https:\/\/yhbhrkyihiyyfzqogyri.supabase.co/);
 assert.doesNotMatch(s,/sk_live_|VERCEL_ENV==='production'|api.higgsfield/);
 const sql=readFileSync('db/test-only/k4k-v3-phase43-signed-webhook-rpc.sql','utf8');
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION/);
 assert.match(sql,/TO service_role/);
 assert.match(sql,/k4k_test_phase42/);
});
