import test from 'node:test';
import assert from 'node:assert/strict';
import {billingMode,assertBillingKey,assertTaxReady} from '../lib/server/billing-policy.mjs';
import {livePrices} from '../lib/server/live-price-config.mjs';
import {generationUserAllowed} from '../lib/server/generation-policy.mjs';
test('preview can never accept a live payment key, even with a live flag',()=>{const env={VERCEL_ENV:'preview',K4K_LIVE_PAYMENTS_ENABLED:'true'};assert.equal(billingMode(env),'test');assert.throws(()=>assertBillingKey('sk_live_mock',env));assert.equal(assertBillingKey('sk_test_mock',env),'test')});
test('production defaults off and requires its own live credentials and price maps',()=>{assert.throws(()=>assertBillingKey('sk_live_mock',{VERCEL_ENV:'production'}));const env={VERCEL_ENV:'production',K4K_LIVE_PAYMENTS_ENABLED:'true'};assert.throws(()=>assertBillingKey('sk_test_mock',env));assert.throws(()=>livePrices('plans',env),/NOT_CONFIGURED/)});
test('tax readiness cannot be inferred from a payment key or registration claim',()=>{assert.throws(()=>assertTaxReady({STRIPE_SECRET_KEY:'sk_test_mock'}),/TAX_SETUP_REQUIRED/)});
test('production generation remains off without explicit production AND provider-use approval',()=>{const env={VERCEL_ENV:'production',HIGGSFIELD_GENJUTSU_ENABLED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_ENABLE_PRODUCTION_GENERATION:'true'};assert.equal(generationUserAllowed('user',env),false);env.K4K_PROVIDER_USE_APPROVED='true';assert.equal(generationUserAllowed('user',env),true)});
