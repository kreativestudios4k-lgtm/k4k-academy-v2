import test from 'node:test';
import assert from 'node:assert/strict';
import {launchInvoiceCredits,LAUNCH_FREE_VIDEO,LAUNCH_MONTHLY_CREDITS,LAUNCH_FIRST_MONTH_CREDITS} from '../lib/k4k-launch-offer.mjs';
test('launch credits are opt-in and only apply to initial and renewal invoices',()=>{
 assert.equal(launchInvoiceCredits('starter','subscription_create',{}),null);
 const env={K4K_LAUNCH_CREDIT_OFFER:'true'};
 assert.equal(launchInvoiceCredits('starter','subscription_create',env),100);
 assert.equal(launchInvoiceCredits('studio','subscription_cycle',env),1000);
 assert.equal(launchInvoiceCredits('pro','subscription_update',env),null);
 assert.equal(LAUNCH_FREE_VIDEO.maxClaims*LAUNCH_FREE_VIDEO.estimatedUsd,LAUNCH_FREE_VIDEO.budgetUsd);
});

test('approved launch tiers have exactly 50 percent first-month bonus',()=>{
 assert.deepEqual(LAUNCH_MONTHLY_CREDITS,{starter:100,creator:220,pro:480,studio:1000});
 assert.deepEqual(LAUNCH_FIRST_MONTH_CREDITS,{starter:150,creator:330,pro:720,studio:1500});
 for(const plan of Object.keys(LAUNCH_MONTHLY_CREDITS))assert.equal(LAUNCH_FIRST_MONTH_CREDITS[plan],LAUNCH_MONTHLY_CREDITS[plan]*1.5);
});
