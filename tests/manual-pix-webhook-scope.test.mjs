import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeManualPixTestEvent} from '../lib/server/manual-pix-webhook-scope.mjs';
const event=(type,object)=>({id:'evt_fixture',livemode:false,type,data:{object}});
test('dedicated Test endpoint rejects unrelated Academy/QA events without invoking storage',async()=>{
 for(const e of [event('checkout.session.completed',{mode:'subscription',metadata:{k4k_billing_qa:'20261114'}}),event('charge.refunded',{metadata:{academy:'true'}})])assert.equal(await scopeManualPixTestEvent(e,{}),null);
 const e=event('checkout.session.completed',{mode:'payment',metadata:{kind:'k4k_manual_pix'}});
 assert.deepEqual(await scopeManualPixTestEvent(e,{}),e);
 await assert.rejects(scopeManualPixTestEvent({...e,livemode:true},{}),/MODE_MISMATCH/);
});
test('Test dispute scope resolves charge ownership and refuses Live or mismatched intents',async()=>{
 const e=event('charge.dispute.created',{object:'dispute',charge:'py_manual',payment_intent:'pi_manual'});
 const charge={id:'py_manual',livemode:false,payment_intent:'pi_manual',metadata:{kind:'k4k_manual_pix'}};
 assert.deepEqual((await scopeManualPixTestEvent(e,{stripeCharge:async()=>charge})).data.object,charge);
 assert.equal(await scopeManualPixTestEvent(e,{stripeCharge:async()=>({...charge,metadata:{}})}),null);
 await assert.rejects(scopeManualPixTestEvent(e,{stripeCharge:async()=>({...charge,livemode:true})}),/MODE_MISMATCH/);
 await assert.rejects(scopeManualPixTestEvent(e,{stripeCharge:async()=>({...charge,payment_intent:'pi_other'})}),/ORDER_INVALID/);
});
