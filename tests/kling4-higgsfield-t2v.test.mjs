import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CUSTOMER_CREATIVE_MODELS,creativeCustomerQuote,creativeCustomerRelease} from '../lib/server/creative-customer-policy.mjs';
import {CREATION_MODELS} from '../lib/creation-studio-catalog.mjs';
import {creativeModelReadiness} from '../lib/creative-provider-readiness.mjs';
const owner='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const env={
 VERCEL_ENV:'preview',K4K_CREATIVE_OWNER_PILOT_ONLY:'true',K4K_CREATIVE_OWNER_LEDGER_QA_ISOLATED:'true',
 K4K_CREATIVE_CUSTOMER_ENABLED:'true',K4K_CREATIVE_CUSTOMER_PRICE_APPROVED:'true',
 K4K_ENABLE_PRODUCTION_GENERATION:'true',K4K_PROVIDER_USE_APPROVED:'true',
 K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_CREATIVE_CUSTOMER_MODELS:'kling4_hf',
 K4K_KLING_HIGGSFIELD_PREVIEW_ENABLED:'true',K4K_KLING_HIGGSFIELD_RATE_APPROVED:'true',
 K4K_GENERATION_MAX_USD:'5'
};
test('new Higgsfield model has separate identity and is default-closed',()=>{
 const m=CUSTOMER_CREATIVE_MODELS.kling4_hf;
 assert.equal(m.provider,'higgsfield');
 assert.equal(m.endpoint,'kling-video/v4.0/text-to-video');
 assert.equal(m.dbModel,'kling-4-hf-t2v');
 assert.deepEqual(m.input('Cinematic sunset','21:9',{duration:12,resolution:'1080p'}),{
  prompt:'Cinematic sunset',aspect_ratio:'21:9',duration:12,resolution:'1080p'});
 assert.equal(creativeCustomerRelease({},'kling4_hf',owner),false);
 assert.equal(creativeCustomerRelease({...env,K4K_KLING_HIGGSFIELD_RATE_APPROVED:'false'},'kling4_hf',owner),false);
 assert.equal(creativeCustomerRelease({...env,K4K_KLING_HIGGSFIELD_PREVIEW_ENABLED:'false'},'kling4_hf',owner),false);
 assert.equal(creativeCustomerRelease(env,'kling4_hf','11111111-1111-4111-8111-111111111111'),false);
 assert.equal(creativeCustomerRelease(env,'kling4_hf',owner),true);
});
test('exact official rate card, hard duration constraints, and $5 cap',()=>{
 assert.equal(creativeCustomerQuote('kling4_hf',env,owner,{duration:3,resolution:'720p'}).quoteUsdMicros,377100);
 assert.equal(creativeCustomerQuote('kling4_hf',env,owner,{duration:30,resolution:'720p'}).quoteUsdMicros,3771000);
 assert.equal(creativeCustomerQuote('kling4_hf',env,owner,{duration:26,resolution:'1080p'}).quoteUsdMicros,4885400);
 assert.throws(()=>creativeCustomerQuote('kling4_hf',env,owner,{duration:27,resolution:'1080p'}),/PROVIDER_BUDGET_BLOCKED/);
 for(const input of [{duration:2,resolution:'720p'},{duration:31,resolution:'720p'},{duration:4.5,resolution:'720p'},{duration:5,resolution:'480p'}]){
  assert.throws(()=>creativeCustomerQuote('kling4_hf',env,owner,input),/INVALID_INPUT/);
 }
});
test('UI and generation workflow route are wired without modifying existing fal Kling',()=>{
 const m=CREATION_MODELS.find(x=>x.id==='kling4_hf');
 assert.equal(m.refs,0);
 assert.deepEqual(m.resolution,['720p','1080p']);
 assert.ok(m.aspect.includes('21:9'));
 assert.equal(creativeModelReadiness('kling4_hf','Text to video').provider,'higgsfield');
 assert.equal(CUSTOMER_CREATIVE_MODELS.kling4_0.endpoint,'kling/v4/text-to-video');
 const route=readFileSync(new URL('../app/api/creative/customer/route.js',import.meta.url),'utf8');
 assert.match(route,/createHiggsfieldPlatformApi/);
 assert.match(route,/createHiggsfieldVerifiedOutputRetriever/);
 assert.match(route,/k4k_multimodel_claim_dispatch/);
 assert.match(route,/job\.normalized_input\.duration/);
 const ui=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');
 assert.match(ui,/selectedLive&&model.id!=='kling4_hf'/);
 const migration=readFileSync(new URL('../supabase/migrations/20261118010000_kling4_higgsfield_text_to_video.sql',import.meta.url),'utf8');
 assert.match(migration,/kling-4-hf-t2v/);
});
