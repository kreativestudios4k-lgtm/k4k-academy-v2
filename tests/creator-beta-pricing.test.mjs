import test from 'node:test';
import assert from 'node:assert/strict';
import {FOUNDING_CREATOR_LIMIT,CREATOR_PLANS,quoteCreatorMonth} from '../lib/server/creator-beta-pricing.mjs';

test('beta cohort is capped at 25',()=>assert.equal(FOUNDING_CREATOR_LIMIT,25));
test('50 percent introductory pricing uses integer pence and correct rounding',()=>{
 const expected={starter:[400,799],creator:[750,1499],pro:[1500,2999],studio:[3000,5999]};
 for(const plan of CREATOR_PLANS){
  assert.equal(quoteCreatorMonth(plan.id,1).amountPence,expected[plan.id][0]);
  assert.equal(quoteCreatorMonth(plan.id,3).amountPence,expected[plan.id][0]);
  assert.equal(quoteCreatorMonth(plan.id,4).amountPence,expected[plan.id][1]);
  assert.equal(quoteCreatorMonth(plan.id,4).discounted,false);
 }
});
test('invalid plans and months are rejected',()=>{
 assert.throws(()=>quoteCreatorMonth('unknown',1));
 assert.throws(()=>quoteCreatorMonth('starter',0));
 assert.throws(()=>quoteCreatorMonth('starter',1.5));
});
