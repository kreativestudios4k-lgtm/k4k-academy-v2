import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL('../app/api/higgsfield/customer-preview-estimate/route.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/higgsfield-preview/page.js',import.meta.url),'utf8');
test('customer quote preview requires authenticated owner and exact preview environment',()=>{
 for(const marker of ["VERCEL_ENV!=='preview'","auth.auth.getUser(token)","higgsfieldUserAllowed(user,process.env)","request.headers.get('origin')","genjutsuEstimate"])assert.ok(api.includes(marker),marker);
 assert.match(api,/sourceSeconds:body.seconds/);
 assert.match(api,/imageCount<1\|\|body.imageCount>8/);
});
test('customer preview is estimate only with no signed quote, media upload, credits or dispatch',()=>{
 for(const marker of ["signedQuote:false","creditsReserved:false","providerDispatched:false","generationEnabled:false","verifiedVideoDuration:false"])assert.ok(api.includes(marker),marker);
 assert.doesNotMatch(api,/service.role|SUPABASE_SERVICE_ROLE_KEY|hf\.submit|\.upload\(|k4k_multimodel_reserve_live|customer_disptach/i);
 assert.match(page,/<CustomerGeneration/);
 assert.match(page,/Files remain on this device/);
 assert.match(page,/khm-credit-summary/);
 assert.match(page,/priceFor=quality/);
 assert.doesNotMatch(page,/Calculate estimated cost/);
 assert.doesNotMatch(page,/onClick=\{.*generate|customer-credit-authorization/);
});
test('preview never accepts billing input or trusts a user-provided price',()=>{
 assert.match(api,/Object\.keys\(body\)\.some\(k=>!\['seconds','resolution','imageCount'\]\.includes\(k\)\)/);
 assert.match(api,/published_estimate_not_verified_invoice/);
 assert.match(api,/SERVER_MEDIA_VERIFICATION_AND_APPROVED_RATE_CARD/);
});
