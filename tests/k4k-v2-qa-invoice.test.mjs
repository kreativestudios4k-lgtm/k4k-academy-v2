import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateV2PaidInvoice} from '../lib/server/k4k-v2-qa-invoice.mjs';
import {K4K_V2_PLANS} from '../lib/k4k-plan-v2.mjs';
const owner='0ef1af08-4df8-4858-967b-eac1a16f9f2c',customer='cus_VdsfcbnbMQ4y8v',subscription='sub_1UcauJL7fmdMaK0kx1yO6r4h';
const invoice={id:'in_1UcauHL7fmdMaK0kwVwHfYEA',livemode:false,status:'paid',currency:'gbp',customer,billing_reason:'subscription_create',amount_due:1599,amount_paid:1599,
 parent:{subscription_details:{subscription,metadata:{k4k_catalog_version:'creator_2026_v2'}}},
 lines:{data:[{pricing:{price_details:{price:K4K_V2_PLANS.starter.priceId}}}]}};
const session={id:'cs_test_abcdef123',livemode:false,status:'complete',payment_status:'paid',mode:'subscription',customer,subscription,client_reference_id:owner,metadata:{plan_key:'starter',k4k_catalog_version:'creator_2026_v2'}};
test('verified paid v2 Starter invoice can create only isolated QA entitlement',()=>{
 const x=validateV2PaidInvoice(invoice,[session],owner);
 assert.equal(x.credits,400);assert.equal(x.p_invoice,invoice.id);assert.equal(x.p_user,owner);
 assert.equal(x.p_price,K4K_V2_PLANS.starter.priceId);
});
for(const [label,change] of [
 ['unpaid invoice',x=>x.invoice.status='open'],
 ['live invoice',x=>x.invoice.livemode=true],
 ['wrong amount',x=>x.invoice.amount_paid=1499],
 ['incorrect price',x=>x.invoice.lines.data[0].pricing.price_details.price='price_legacy'],
 ['wrong customer',x=>x.session.customer='cus_other123'],
 ['wrong owner',x=>x.session.client_reference_id='not-owner'],
 ['unsigned or unrelated checkout',x=>x.session.metadata.k4k_catalog_version='other'],
 ['unpaid checkout',x=>x.session.payment_status='unpaid'],
 ['unsupported billing reason',x=>x.invoice.billing_reason='subscription_update'],
 ['unrelated invoice',x=>x.invoice.parent.subscription_details.metadata.k4k_catalog_version='other']
]){
 test('rejects '+label,()=>{
  const x={invoice:structuredClone(invoice),session:structuredClone(session)};change(x);
  assert.throws(()=>validateV2PaidInvoice(x.invoice,[x.session],owner));
 });
}
test('QA webhook and reconciliation never reuse legacy credit RPC',()=>{
 const webhook=readFileSync(new URL('../app/api/plans-v2/webhook/route.js',import.meta.url),'utf8');
 const handler=readFileSync(new URL('../lib/server/k4k-v2-qa-invoice.mjs',import.meta.url),'utf8');
 assert.match(webhook,/verifyStripeSignature/);
 assert.match(webhook,/STRIPE_V2_QA_WEBHOOK_SECRET/);
 assert.match(handler,/k4k_v2_qa_apply_paid_invoice/);
 assert.match(handler,/getUser|STRIPE_SECRET_KEY/);
 assert.doesNotMatch(webhook+handler,/k4k_apply_invoice_event|studio_credit_accounts|k4k_app_apply_invoice_event/);
});
