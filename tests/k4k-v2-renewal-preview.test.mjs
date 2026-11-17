import test from 'node:test';
import assert from 'node:assert/strict';
import {validateV2PaidInvoice} from '../lib/server/k4k-v2-qa-invoice.mjs';
import {K4K_V2_PLANS} from '../lib/k4k-plan-v2.mjs';

const uid='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const customer='cus_VdsfcbnbMQ4y8v';
const subscription='sub_1UcauJL7fmdMaK0kx1yO6r4h';
const checkout={
 id:'cs_test_a0g22y5uwZlIn7PqiKLqt2ABYy8dlw7H7r29IjOpsq49HyGlVEFBeaTixu',
 livemode:false,status:'complete',payment_status:'paid',mode:'subscription',
 customer,subscription,client_reference_id:uid,
 metadata:{plan_key:'starter',k4k_catalog_version:'creator_2026_v2'}
};
function renewal(id,override={}){
 return {id,livemode:false,status:'paid',currency:'gbp',customer,amount_paid:1599,amount_due:1599,
 billing_reason:'subscription_cycle',
 parent:{subscription_details:{subscription,metadata:{k4k_catalog_version:'creator_2026_v2'}}},
 lines:{data:[{pricing:{price_details:{price:K4K_V2_PLANS.starter.priceId}}}]},...override};
}
test('paid monthly renewal verifies unchanged Starter price, same owner and same subscription',()=>{
 const x=validateV2PaidInvoice(renewal('in_renewal_simulated_A12345'),[checkout],uid);
 assert.deepEqual({credits:x.credits,price:x.p_price,user:x.p_user,subscription:x.p_subscription,amount:x.p_amount_minor},
 {credits:400,price:K4K_V2_PLANS.starter.priceId,user:uid,subscription,amount:1599});
});
test('a second paid invoice can pass, but must carry a different valid invoice ID',()=>{
 const one=validateV2PaidInvoice(renewal('in_renewal_simulated_A12345'),[checkout],uid);
 const two=validateV2PaidInvoice(renewal('in_renewal_simulated_B12345'),[checkout],uid);
 assert.notEqual(one.p_invoice,two.p_invoice);
 assert.equal(one.credits,400);assert.equal(two.credits,400);
});
test('nonpaid renewals or changed price/amount are rejected before any DB mutation',()=>{
 const base=renewal('in_renewal_simulated_A12345');
 for(const changed of [
 {status:'open'},{status:'void'},{amount_paid:0},{amount_due:1700},{currency:'usd'},{livemode:true},
 {billing_reason:'manual'},{customer:'cus_other123'}
 ]){
  assert.throws(()=>validateV2PaidInvoice({...base,...changed},[checkout],uid));
 }
});
test('renewal without original owner Checkout cannot grant any credits',()=>{
 const i=renewal('in_renewal_simulated_A12345');
 for(const sessions of [[],[{...checkout,client_reference_id:'wrong-owner'}],[{...checkout,subscription:'sub_wrong123'}]]){
  assert.throws(()=>validateV2PaidInvoice(i,sessions,uid),/V2_OWNER_CHECKOUT_UNVERIFIED/);
 }
});
test('renewal validator is side-effect free; invoice replay protection is DB unique invoice key',()=>{
 const i=renewal('in_renewal_simulated_A12345');
 const before=structuredClone(i);
 validateV2PaidInvoice(i,[checkout],uid);validateV2PaidInvoice(i,[checkout],uid);
 assert.deepEqual(i,before);
});
