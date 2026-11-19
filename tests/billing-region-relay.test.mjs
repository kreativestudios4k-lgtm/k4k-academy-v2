import test from 'node:test';
import assert from 'node:assert/strict';
import {billingCountrySignature,verifiedBillingCountry} from '../lib/server/billing-region-relay.mjs';
const secret='k4k-test-only-region-relay-secret-1234567890XYZ';
const token='test-access-token-non-production';
const body='{"plan":"starter","currency":"BRL"}';
const timestamp='1795080000';
const expected='ef9f6bafd9404f1ab4f81a7e1f8b686f22bd03c85722600e9eb5fbff4b8da550';
function h(overrides={}){
  return new Headers({
    'x-k4k-region-version':'1',
    'x-k4k-region-country':'BR',
    'x-k4k-region-timestamp':timestamp,
    'x-k4k-region-signature':expected,
    ...overrides
  });
}
const now=1795080000*1000;
test('golden HMAC vector shared with V2',()=>{
 assert.equal(billingCountrySignature({country:'BR',body,token,timestamp,secret}),expected);
 assert.equal(verifiedBillingCountry(h(),{body,token,secret,now}),'BR');
});
test('the original directly accessed app keeps Vercel native region',()=>{
 assert.equal(verifiedBillingCountry(new Headers(),{body,token,secret,now}),null);
});
test('reject forged region, altered body, different bearer, replay and missing fields',()=>{
 for(const [headers,params] of [
  [h({'x-k4k-region-country':'GB'}),{}],
  [h(),{body:body+' '}],
  [h(),{token:'different-token'}],
  [h(),{now:now+91*1000}],
  [h({'x-k4k-region-timestamp':'not-a-timestamp'}),{}],
  [h({'x-k4k-region-signature':'bad'}),{}],
  [h({'x-k4k-region-version':'2'}),{}],
  [h({'x-k4k-region-signature':''}),{}],
 ]){
  assert.throws(()=>verifiedBillingCountry(headers,{body,token,secret,now,...params}),/COUNTRY_RELAY_INVALID/);
 }
});
test('missing production secret fails closed if headers imply a relay',()=>{
 assert.throws(()=>verifiedBillingCountry(h(),{body,token,secret:'',now}),/COUNTRY_RELAY_SETUP_REQUIRED/);
});
