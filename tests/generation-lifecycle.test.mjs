import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationLifecycle} from '../lib/server/generation-lifecycle.mjs';
const input={userId:'user',jobId:'job',requestKey:'key',tier:'lite',input:{}};
test('lifecycle disabled by default, no credit or provider activity',async()=>{
 let calls=0;const lifecycle=createGenerationLifecycle({ledger:{reserve:()=>calls++},provider:{submit:()=>calls++},priceCredits:()=>10});
 await assert.rejects(lifecycle.run(input),/GENERATION_DISABLED/);
 assert.equal(calls,0);
});
test('unapproved credit price prevents reservation and submission',async()=>{
 let calls=0;const lifecycle=createGenerationLifecycle({enabled:true,providerEnabled:true,ledger:{reserve:()=>calls++,finish:()=>calls++},provider:{submit:()=>calls++}});
 await assert.rejects(lifecycle.run(input),/CREDIT_PRICING_UNAVAILABLE/);
 assert.equal(calls,0);
});
test('existing reservation never submits another paid provider request',async()=>{
 let submitted=0;const lifecycle=createGenerationLifecycle({enabled:true,providerEnabled:true,priceCredits:()=>3,ledger:{reserve:async()=>({status:'reserved'}),finish:async()=>{}},provider:{submit:async()=>{submitted++}}});
 await assert.rejects(lifecycle.run(input),/RESERVATION_NOT_NEW/);
 assert.equal(submitted,0);
});
test('new reservation submission failure triggers exactly one refund attempt',async()=>{
 let refunds=0;const lifecycle=createGenerationLifecycle({enabled:true,providerEnabled:true,priceCredits:()=>3,ledger:{reserve:async()=>({newlyReserved:true}),finish:async()=>{refunds++}},provider:{submit:async()=>{throw Error('mock failure')}}});
 await assert.rejects(lifecycle.run(input),/GENERATION_SUBMISSION_FAILED/);
 assert.equal(refunds,1);
});
