import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creativeCustomerQuote,creativeCustomerRelease,CUSTOMER_CREATIVE_MODELS} from '../lib/server/creative-customer-policy.mjs';
const route=readFileSync(new URL('../app/api/creative/customer/route.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../app/k4k-app/CustomerCreativeGeneration.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261117140000_customer_creative_models_images.sql',import.meta.url),'utf8');
const base={VERCEL_ENV:'production',K4K_CREATIVE_CUSTOMER_ENABLED:'true',K4K_CREATIVE_CUSTOMER_PRICE_APPROVED:'true',K4K_ENABLE_PRODUCTION_GENERATION:'true',K4K_PROVIDER_USE_APPROVED:'true',K4K_LIVE_CREDIT_ISOLATION_READY:'true',K4K_CREATIVE_OWNER_PILOT_ONLY:'true',K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_CREATIVE_CUSTOMER_MODELS:'kling4_0,nano_banana_2,flux_3_image,seedance_2_5',K4K_GENERATION_MAX_USD:'2.10'};
test('new customer models are default denied, independent from owner-only QA and Motion',()=>{
 for(const id of Object.keys(CUSTOMER_CREATIVE_MODELS).filter(id=>id!=='seedance_2_5'&&id!=='kling4_hf')){
  assert.equal(creativeCustomerRelease({},id,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),false);
  assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_CUSTOMER_ENABLED:'false'},id,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),false);
  assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_CUSTOMER_PRICE_APPROVED:'false'},id,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),false);
  assert.equal(creativeCustomerRelease({...base,VERCEL_ENV:'preview'},id,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),false);
  assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_CUSTOMER_MODELS:''},id,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),false);
  assert.equal(creativeCustomerRelease(base,id,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),true);
 }
 assert.equal(creativeCustomerRelease(base,'seedance_2_5','0ef1af08-4df8-4858-967b-eac1a16f9f2c'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'true',K4K_SEEDANCE_OWNER_PILOT_APPROVED:'true'},'seedance_2_5','0ef1af08-4df8-4858-967b-eac1a16f9f2c'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_SEEDANCE_OWNER_PILOT_APPROVED:'true'},'seedance_2_5','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'true',K4K_SEEDANCE_OWNER_PILOT_APPROVED:'true'},'seedance_2_5','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_LIVE_CREDIT_ISOLATION_READY:'',K4K_CREATIVE_OWNER_PILOT_ONLY:'true',K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED:'true'},'kling4_0','0ef1af08-4df8-4858-967b-eac1a16f9f2c'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_LIVE_CREDIT_ISOLATION_READY:'',K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED:'true',K4K_CREATIVE_OWNER_PILOT_ONLY:'false'},'kling4_0','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease(base,'kling4_0','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false'},'kling4_0','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true'},'kling4_0','11111111-1111-4111-8111-111111111111'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true'},'nano_banana_2','11111111-1111-4111-8111-111111111111'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true'},'flux_3_image','11111111-1111-4111-8111-111111111111'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_SEEDANCE_OWNER_PILOT_APPROVED:'true'},'seedance_2_5','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_SEEDANCE_PUBLIC_ENABLED:'true'},'seedance_2_5','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_SEEDANCE_PUBLIC_ENABLED:'true',K4K_SEEDANCE_PUBLIC_PRICE_APPROVED:'true'},'seedance_2_5','11111111-1111-4111-8111-111111111111'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_SEEDANCE_PUBLIC_ENABLED:'true',K4K_SEEDANCE_PUBLIC_PRICE_APPROVED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'false'},'seedance_2_5','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_SEEDANCE_OWNER_PILOT_APPROVED:'true'},'seedance_2_5','0ef1af08-4df8-4858-967b-eac1a16f9f2c'),true);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_CREATIVE_CUSTOMER_MODELS:'seedance_2_5'},'kling4_0','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease({...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'false',K4K_CREATIVE_PUBLIC_LEDGER_APPROVED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'false'},'kling4_0','11111111-1111-4111-8111-111111111111'),false);
 assert.throws(()=>creativeCustomerQuote('seedance_2_5',base,'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),/CREATIVE_MODEL_NOT_LIVE/);
});
test('per-model quote worst-case reservations are bounded and pricing must be approved',()=>{
 assert.equal(creativeCustomerQuote('kling4_0',base,'0ef1af08-4df8-4858-967b-eac1a16f9f2c').quoteUsdMicros,1200000);
 assert.equal(creativeCustomerQuote('nano_banana_2',base,'0ef1af08-4df8-4858-967b-eac1a16f9f2c').quoteUsdMicros,1500000);
 assert.equal(creativeCustomerQuote('flux_3_image',base,'0ef1af08-4df8-4858-967b-eac1a16f9f2c').quoteUsdMicros,300000);
 const seedance=creativeCustomerQuote('seedance_2_5',{...base,K4K_CREATIVE_OWNER_PILOT_ONLY:'true',K4K_SEEDANCE_OWNER_PILOT_APPROVED:'true'},'0ef1af08-4df8-4858-967b-eac1a16f9f2c');
 assert.equal(seedance.quoteUsdMicros,2000000);
 assert.equal(seedance.providerBilling,'variable-tokens-public-beta');
 assert.deepEqual(seedance.input('Test cinematic motion','9:16'),{prompt:'Test cinematic motion',aspect_ratio:'9:16',duration:'5',resolution:'480p',generate_audio:false,draft:false});
 assert.throws(()=>creativeCustomerQuote('nano_banana_2',{...base,K4K_GENERATION_MAX_USD:'0.5'},'0ef1af08-4df8-4858-967b-eac1a16f9f2c'),/PROVIDER_BUDGET_BLOCKED/);
});
test('customer route authenticates and verifies origin; wallet changes are exclusively transactional RPC',()=>{
 for(const value of ['K4K_CREATIVE_QUOTE_SECRET','auth.getUser(token)','email_confirmed_at',"req.headers.get('origin')","createMultimodelLedger","k4k_multimodel_claim_dispatch","k4k_multimodel_record_provider_request","k4k_multimodel_refund_confirmed_provider_failure","k4k_multimodel_jobs","QUOTE_SIGNING_UNAVAILABLE","SUBMISSION_UNCERTAIN_DO_NOT_RETRY","boundedCreativeDownload"])assert.ok(route.includes(value),value);
 assert.doesNotMatch(route,/k4k_live_credit_accounts'\)\.update/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY.*NEXT_PUBLIC_/);
});
test('owner-scoped completed jobs use private signed downloads and image-specific bucket',()=>{
 assert.match(route,/createMultimodelPrivateDelivery/);
 assert.match(route,/\.eq\('user_id',userId\)/);
 assert.match(route,/createSignedUrl|createMultimodelPrivateDelivery/);
 assert.match(route,/provider_request_id/);
 assert.match(migration,/studio-customer-images/);
 assert.match(migration,/false,array\['image\/png','image\/jpeg'\]/);
});
test('UI shows signed quote, explicit customer credit confirmation and refuses reference assets not used by model',()=>{
 for(const value of ['Generate','Confirm & Generate','referenceCount>0','action:\x27quote\x27','action:\x27submit\x27','action:\x27status\x27','action:\x27download\x27'])assert.ok(client.includes(value),value);
});

test('public Seedance has an independent kill switch, atomic UTC daily rate limit and authenticated FAILED refund',()=>{
 const daily=readFileSync(new URL('../supabase/migrations/20261117170000_seedance_public_daily_limit.sql',import.meta.url),'utf8');
 assert.match(daily,/create unique index if not exists k4k_seedance_daily_paid_once/);
 assert.match(daily,/date_trunc\('day',created_at at time zone 'UTC'\)/);
 assert.match(daily,/model='seedance-25-t2v'/);
 assert.match(daily,/status in \('queued','processing','completed','failed'\)/);
 assert.match(route,/SEEDANCE_DAILY_LIMIT/);
 assert.match(route,/info.status==='FAILED'/);
 assert.match(route,/await refund\(db,userId,job\)/);
 assert.match(route,/model.providerBilling==='variable-tokens-public-beta'/);
 assert.match(client,/Seedance 2.5 · Live text-to-video/);
 assert.match(client,/one submitted generation per account per UTC day/);
});
