import test from 'node:test';
import assert from 'node:assert/strict';
import {launchInvoiceCredits,LAUNCH_FREE_VIDEO} from '../lib/k4k-launch-offer.mjs';
test('launch credits are opt-in and only apply to initial and renewal invoices',()=>{
 assert.equal(launchInvoiceCredits('starter','subscription_create',{}),null);
 const env={K4K_LAUNCH_CREDIT_OFFER:'true'};
 assert.equal(launchInvoiceCredits('starter','subscription_create',env),225);
 assert.equal(launchInvoiceCredits('studio','subscription_cycle',env),1150);
 assert.equal(launchInvoiceCredits('pro','subscription_update',env),null);
 assert.equal(LAUNCH_FREE_VIDEO.maxClaims*LAUNCH_FREE_VIDEO.estimatedUsd,LAUNCH_FREE_VIDEO.budgetUsd);
});
