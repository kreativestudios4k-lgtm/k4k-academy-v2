import test from 'node:test';
import assert from 'node:assert/strict';
import {higgsfieldPublicEnabled,higgsfieldFlowEnabled,higgsfieldDispatchEnabled,higgsfieldUserAllowed,higgsfieldCustomerEnv} from '../lib/server/higgsfield-release-policy.mjs';
import {higgsfieldCustomerCredential} from '../lib/server/higgsfield-platform-api.mjs';
import {createHiggsfieldCustomerHttp} from '../lib/server/higgsfield-customer-http.mjs';
export const live={VERCEL_ENV:'production',K4K_HIGGSFIELD_CUSTOMERS_ENABLED:'true',K4K_ENABLE_PRODUCTION_GENERATION:'true',K4K_PROVIDER_USE_APPROVED:'true',K4K_LIVE_CREDIT_ISOLATION_READY:'true',K4K_HIGGSFIELD_DISPATCH_ENABLED:'true'};
test('production requires explicit release gates; previews cannot authorize public generation',()=>{
 assert.equal(higgsfieldPublicEnabled(live),true);
 for(const key of ['K4K_HIGGSFIELD_CUSTOMERS_ENABLED','K4K_ENABLE_PRODUCTION_GENERATION','K4K_PROVIDER_USE_APPROVED','K4K_LIVE_CREDIT_ISOLATION_READY'])assert.equal(higgsfieldPublicEnabled({...live,[key]:'false'}),false);
 assert.equal(higgsfieldPublicEnabled({...live,K4K_WAITLIST_ONLY:'true'}),false);
 assert.equal(higgsfieldPublicEnabled({...live,VERCEL_ENV:'preview'}),false);
 assert.equal(higgsfieldUserAllowed({id:'other-account'},live),true);
 assert.equal(higgsfieldUserAllowed({id:'other-account',is_anonymous:true},live),false);
 assert.equal(higgsfieldUserAllowed({id:'other-account'},{VERCEL_ENV:'preview'}),false);
 assert.equal(higgsfieldDispatchEnabled({...live,K4K_HIGGSFIELD_DISPATCH_ENABLED:'false'}),false);
 assert.equal(higgsfieldFlowEnabled({...live,K4K_HIGGSFIELD_DISPATCH_ENABLED:'false'}),true);
});
test('production uses its own opaque key and dedicated quote secret',()=>{
 assert.equal(higgsfieldCustomerCredential({...live,HF_API_KEY:'production-secret',K4K_HIGGSFIELD_API_PILOT:'preview-secret'}),'production-secret');
 assert.equal(higgsfieldCustomerCredential({...live,K4K_HIGGSFIELD_API_PILOT:'preview-secret'}),null);
 assert.equal(higgsfieldCustomerEnv({...live,K4K_GENERATION_QUOTE_SECRET:'legacy',K4K_HIGGSFIELD_QUOTE_SECRET:'dedicated'}).K4K_GENERATION_QUOTE_SECRET,'dedicated');
});
test('live API scopes every action to verified account and rejects anonymous and foreign origin',async()=>{
 const req=(origin='https://kreativestudios4k.com')=>new Request('https://kreativestudios4k.com/api/higgsfield/customer-jobs',{method:'POST',headers:{origin,authorization:'Bearer token'},body:JSON.stringify({action:'list'})});
 let owner;const handler=createHiggsfieldCustomerHttp({env:live,authenticate:async()=>({id:'customer-b'}),createService:()=>({list:async id=>{owner=id;return [];}})});
 assert.equal((await handler(req())).status,200);assert.equal(owner,'customer-b');
 assert.equal((await handler(req('https://evil.example'))).status,403);
 const anonymous=createHiggsfieldCustomerHttp({env:live,authenticate:async()=>({id:'anon',is_anonymous:true}),createService:()=>{throw Error('must not run')}});
 assert.equal((await anonymous(req())).status,401);
});
import {createHiggsfieldCustomerService} from '../lib/server/higgsfield-customer-service.mjs';
test('production quote checks balance, hold and quote throttle before provider media transfer',async()=>{
 const user='11111111-1111-4111-8111-111111111111';
 const env={...live,K4K_HIGGSFIELD_RATE_CARD_APPROVED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_GENERATION_QUOTE_SECRET:'x'.repeat(40),K4K_GENERATION_MAX_USD:'2.1',K4K_PROVIDER_USD_PER_CREDIT:'0.1'};
 const body={jobId:'22222222-2222-4222-8222-222222222222',prompt:'Replace left person',resolution:'480p',videoPath:user+'/source.mp4',referencePaths:[user+'/image.png']};
 for(const [balance,hold,count,expected] of [[0,false,0,/INSUFFICIENT_CREDITS/],[20,true,0,/BILLING_REVIEW_REQUIRED/],[20,false,5,/TOO_MANY_QUOTES/],[7,false,0,/INSUFFICIENT_CREDITS/]]){
  let transferred=false;
  const service=createHiggsfieldCustomerService({env,store:{getCreditAccount:async()=>({balance,billing_hold:hold}),recentDraftCount:async()=>count,getOwnedJob:async()=>null},transfer:async({beforeTransfer})=>{await beforeTransfer(5);transferred=true;}});
  await assert.rejects(service.prepare(user,body),expected);assert.equal(transferred,false);
 }
});
