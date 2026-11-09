import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currencyForCountry,localeForCountry} from '../lib/k4k-market.mjs';
import {PLAN_PRICES} from '../lib/k4k-plan-prices.mjs';
import {resolvePrice} from '../lib/server/stripe-billing.mjs';
test('Brazil, UK, Spain, Portugal, USA and unknown region resolve safely',()=>{
 for(const [country,currency] of [['BR','BRL'],['GB','GBP'],['ES','EUR'],['PT','EUR'],['US','USD'],['ZZ','GBP'],['','GBP']])assert.equal(currencyForCountry(country),currency);
 assert.equal(localeForCountry('BR'),'pt');assert.equal(localeForCountry('ES'),'es');
});
test('every region price maps to an approved test checkout price ID',()=>{
 for(const country of ['BR','GB','ES','PT','US','ZZ'])for(const plan of Object.keys(PLAN_PRICES)){
  const currency=currencyForCountry(country);
  assert.equal(resolvePrice(plan,currency),PLAN_PRICES[plan].stripePriceIds[currency]);
 }
});
test('pricing UI uses canonical prices and passes the selected displayed currency',()=>{
 const source=readFileSync(new URL('../app/k4k-app/credits/page.js',import.meta.url),'utf8');
 assert.match(source,/PLAN_PRICES\[plan\.key\]\[currency\]/);
 assert.match(source,/body:JSON\.stringify\(\{plan:selected,currency\}\)/);
 assert.doesNotMatch(source,/currency:brazil\?'BRL':'GBP'/);
});
