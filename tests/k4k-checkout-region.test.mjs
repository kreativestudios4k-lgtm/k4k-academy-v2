import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currencyForCountry} from '../lib/k4k-market.mjs';
import {resolvePrice} from '../lib/server/stripe-billing.mjs';
const route=readFileSync(new URL('../app/api/billing/checkout/route.js',import.meta.url),'utf8');
test('server derives checkout currency from edge country rather than trusting request body',()=>{
 assert.match(route,/currencyForCountry\(request\.headers\.get\('x-vercel-ip-country'\)\)/);
 assert.match(route,/body\?\.currency !== expectedCurrency/);
 assert.match(route,/resolvePrice\(body\?\.plan, expectedCurrency\)/);
 assert.match(route,/currency: expectedCurrency/);
 assert.match(route,/CURRENCY_REGION_MISMATCH/);
});
test('each supported market maps to a configured Stripe test price',()=>{
 for(const [country,currency] of [['GB','GBP'],['BR','BRL'],['ES','EUR'],['US','USD']]){
  assert.equal(currencyForCountry(country),currency);
  assert.match(resolvePrice('creator',currency),/^price_/);
 }
});
test('checkout remains test-mode-only',()=>{
 assert.match(route,/assertTestModeKey\(secret\)/);
 assert.match(route,/assertBillingKey/);
});
