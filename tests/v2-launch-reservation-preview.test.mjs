import {test} from 'node:test';
import assert from 'node:assert/strict';
import {V2_LIVE_PLAN_PRICES,V2_MONTHLY_CREDITS,PRESERVED_LIVE_PLAN_PRICES} from '../lib/server/v2-live-price-policy.mjs';
import {evaluateV2LaunchReservation as quote} from '../lib/server/v2-launch-reservation-preview.mjs';

const base=Object.freeze({
 activeSeats:3,subscriptionCommittedCredits:240,pixCommittedCredits:80,
 maxSeats:20,maxCredits:1600
});
const forPlan=(plan,currency='BRL',extra={})=>
 quote({...base,plan,currency,priceId:V2_LIVE_PLAN_PRICES[plan][currency],...extra});

test('current LIVE snapshot has 320 committed credits and 1280 left',()=>{
 const creator=forPlan('creator');
 assert.equal(creator.allowed,true);
 assert.equal(creator.reservedTotal,320);
 assert.equal(creator.remainingCredits,440);
 assert.equal(creator.credits,840);
});

test('funded launch cap rejects V2 Pro and Studio, and specifies minimum commitment',()=>{
 const pro=forPlan('pro');
 const studio=forPlan('studio');
 assert.equal(pro.allowed,false);assert.equal(pro.reason,'LAUNCH_CREDIT_CAPACITY');
 assert.equal(pro.minimumRequiredCredits,2000);
 assert.equal(studio.allowed,false);assert.equal(studio.reason,'LAUNCH_CREDIT_CAPACITY');
 assert.equal(studio.minimumRequiredCredits,3680);
});

test('all old LIVE price IDs fail closed as new V2 reservations',()=>{
 for(const [plan,prices] of Object.entries(PRESERVED_LIVE_PLAN_PRICES))
  for(const [currency,priceId] of Object.entries(prices)){
   const result=quote({...base,priceId,currency,plan});
   assert.equal(result.allowed,false);
   assert.ok(['PRICE_NOT_IN_V2_CATALOGUE','SHARED_LEGACY_PRICE'].includes(result.reason));
  }
});

test('starter GBP overlap cannot be reserved as 420-credit V2 while old 80-credit contract exists',()=>{
 const starter=forPlan('starter','GBP');
 assert.equal(starter.allowed,false);
 assert.equal(starter.reason,'SHARED_LEGACY_PRICE');
 assert.equal(forPlan('starter','BRL').credits,V2_MONTHLY_CREDITS.starter);
});

test('plan and currency spoofing are rejected before funding calculation',()=>{
 const priceId=V2_LIVE_PLAN_PRICES.creator.BRL;
 assert.equal(quote({...base,priceId,plan:'creator',currency:'USD'}).reason,'PRICE_NOT_IN_V2_CATALOGUE');
 assert.equal(quote({...base,priceId,plan:'studio',currency:'BRL'}).reason,'PRICE_NOT_IN_V2_CATALOGUE');
 assert.equal(quote({...base,priceId:'price_unknown',plan:'creator',currency:'BRL'}).reason,'PRICE_NOT_IN_V2_CATALOGUE');
});

test('retrying the matching claim never reserves again, but mismatched claims are blocked',()=>{
 const original=forPlan('creator');
 const repeated=forPlan('creator','BRL',{existingClaim:{priceId:V2_LIVE_PLAN_PRICES.creator.BRL,plan:'creator',currency:'BRL',credits:840}});
 assert.equal(repeated.allowed,true);
 assert.equal(repeated.reused,true);
 assert.equal(repeated.reservedTotal,320);
 assert.equal(repeated.remainingCredits,1280);
 assert.equal(original.afterReservationCredits,1160);
 const mismatch=forPlan('creator','BRL',{existingClaim:{priceId:V2_LIVE_PLAN_PRICES.creator.BRL,plan:'creator',currency:'BRL',credits:160}});
 assert.equal(mismatch.reason,'EXISTING_CLAIM_CREDIT_MISMATCH');
});

test('seat cap and malformed funding limits fail closed',()=>{
 assert.equal(forPlan('creator','EUR',{activeSeats:20}).reason,'LAUNCH_SOLD_OUT');
 assert.equal(forPlan('creator','EUR',{maxCredits:100000}).reason,'LAUNCH_CONFIG_INVALID');
 assert.equal(forPlan('creator','EUR',{pixCommittedCredits:-80}).reason,'LAUNCH_CONFIG_INVALID');
 assert.equal(forPlan('creator','EUR',{maxSeats:0}).reason,'LAUNCH_CONFIG_INVALID');
});

test('capacity includes both live manual Pix and paid subscription commitments',()=>{
 const reserved=forPlan('creator','BRL',{subscriptionCommittedCredits:240,pixCommittedCredits:600});
 assert.equal(reserved.allowed,false);
 assert.equal(reserved.reservedTotal,840);
 assert.equal(reserved.reason,'LAUNCH_CREDIT_CAPACITY');
});
