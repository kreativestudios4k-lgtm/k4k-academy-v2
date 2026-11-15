import test from 'node:test';
import assert from 'node:assert/strict';
import {manualPixCheckoutState} from '../lib/manual-pix-checkout-state.mjs';
import {manualPixAvailability} from '../lib/server/manual-pix-policy.mjs';
import {planDestination,planRegistration,studioDestination} from '../lib/customer-routes.mjs';
const user='11111111-1111-4111-8111-111111111111';
const env={VERCEL_ENV:'production',K4K_MANUAL_PIX_ENABLED:'true',K4K_MANUAL_PIX_SCHEMA_READY:'true',K4K_MANUAL_PIX_LIVE_TEST_ONLY:'true',K4K_MANUAL_PIX_LIVE_TEST_USER_ID:user};
test('authoritative checkout region wins over a stale/failing secondary region response',()=>{
 const result=manualPixCheckoutState({billing:{currency:'BRL',manualPixReady:true},regionCurrency:'GBP',requestedPix:true});
 assert.deepEqual(result,{currency:'BRL',manualPix:true,pixBlocked:false});
 assert.equal(manualPixCheckoutState({billing:{currency:'USD',manualPixReady:false},regionCurrency:'BRL',requestedPix:true}).pixBlocked,true);
});
test('an explicit Pix link cannot silently open a recurring card checkout when Pix is unavailable',()=>{
 for(const billing of [null,{manualPixReady:false,currency:'BRL'},{manualPixReady:true,currency:'USD'}])assert.equal(manualPixCheckoutState({billing,regionCurrency:'BRL',requestedPix:true}).pixBlocked,true);
 assert.equal(manualPixCheckoutState({billing:{manualPixReady:false},regionCurrency:'BRL',requestedPix:false}).pixBlocked,false);
});
test('Pix availability distinguishes missing login, wrong account, region and closed checkout',()=>{
 const ready={userId:user,currency:'BRL',checkoutReady:true};
 assert.equal(manualPixAvailability(ready,env).manualPixReady,true);
 assert.equal(manualPixAvailability({...ready,userId:null},env).manualPixReason,'SIGN_IN_REQUIRED');
 assert.equal(manualPixAvailability({...ready,userId:'other'},env).manualPixReason,'ACCOUNT_NOT_AUTHORIZED');
 assert.equal(manualPixAvailability({...ready,currency:'USD'},env).manualPixReason,'BRAZIL_REQUIRED');
 assert.equal(manualPixAvailability({...ready,checkoutReady:false},env).manualPixReason,'CHECKOUT_UNAVAILABLE');
});
test('Pix intent and a valid plan survive login redirects without accepting injected destinations',()=>{
 const dest=planDestination('starter',{manualPix:true});
 assert.equal(dest,'/k4k-app/credits?plan=starter&payment=pix');
 assert.equal(studioDestination(dest),dest);
 assert.equal(planRegistration('starter',{manualPix:true}),'/k4k-app/register?plan=starter&payment=pix');
 assert.equal(studioDestination(planDestination(null,{manualPix:true})),'/k4k-app/credits?payment=pix');
 for(const bad of [dest+'&next=https://evil.test',dest+'#evil','/k4k-app/credits?plan=__proto__&payment=pix'])assert.equal(studioDestination(bad),'/k4k-app/creator');
});
