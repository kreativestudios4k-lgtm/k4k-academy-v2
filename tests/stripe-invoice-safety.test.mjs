import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStripeEvent} from '../lib/server/stripe-webhook-handler.mjs';

const price='price_1UZ9OgL7fmdMaK0kcN2JJFOa';
function invoice(id='in_test_1') {return {id:'evt_'+id,type:'invoice.paid',created:1700000000,data:{object:{id,customer:'cus_test',subscription:'sub_test',billing_reason:'subscription_cycle',lines:{data:[{price:{id:price},period:{end:1703000000}}]}}}};}
function store({applied=true}={}) {const seen=new Set();let grants=0;return {get grants(){return grants},async hasProcessedEvent(id){return seen.has(id)},async markProcessed({eventId}){seen.add(eventId)},async userIdForCustomer(){return 'user_test'},async applyInvoiceStatus(){return {handled:applied}},async grantCredits(){grants++;return {granted:true}}};}

test('paid subscription invoice grants once when membership update succeeds',async()=>{const s=store();const e=invoice();await handleStripeEvent(e,s);await handleStripeEvent(e,s);assert.equal(s.grants,1)});
test('stale invoice never grants credits',async()=>{const s=store({applied:false});await handleStripeEvent(invoice(),s);assert.equal(s.grants,0)});
test('non-renewal invoice never grants credits',async()=>{const s=store();const e=invoice();e.data.object.billing_reason='subscription_update';await handleStripeEvent(e,s);assert.equal(s.grants,0)});
test('unknown price fails closed and event is not marked processed',async()=>{const s=store();const e=invoice();e.data.object.lines.data[0].price.id='price_unknown';await assert.rejects(()=>handleStripeEvent(e,s),/UNKNOWN_PRICE/);assert.equal(s.grants,0);assert.equal(await s.hasProcessedEvent(e.id),false)});

test('unknown invoice price cannot mutate membership before validation',async()=>{let writes=0;const s=store();s.applyInvoiceStatus=async()=>{writes++;return {handled:true}};const e=invoice('in_unknown_price');e.data.object.lines.data[0].price.id='price_unknown';await assert.rejects(()=>handleStripeEvent(e,s),/UNKNOWN_PRICE/);assert.equal(writes,0);assert.equal(s.grants,0);assert.equal(await s.hasProcessedEvent(e.id),false)});
