import test from 'node:test';
import assert from 'node:assert/strict';
import {stripeCheckoutDestination} from '../lib/stripe-checkout-destination.mjs';
test('allows Stripe-hosted Checkout including its session fragment',()=>{
 const url='https://checkout.stripe.com/c/pay/cs_test_example#session';
 assert.equal(stripeCheckoutDestination(url),url);
});
test('rejects external, insecure, credential-bearing and malformed destinations',()=>{
 for(const url of [null,{},'/checkout','javascript:alert(1)','http://checkout.stripe.com/c/pay/test','https://checkout.stripe.com.evil.example/test','https://checkout.stripe.com@evil.example/test','https://user:pass@checkout.stripe.com/test','https://checkout.stripe.com:444/test'])assert.throws(()=>stripeCheckoutDestination(url));
});
