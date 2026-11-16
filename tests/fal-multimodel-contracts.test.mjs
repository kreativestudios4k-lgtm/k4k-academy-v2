import test from 'node:test';import assert from 'node:assert/strict';import {MULTIMODEL_CONTRACTS,validatedMultimodelRequest,conservativeMultimodelQuote,multimodelActivationStatus} from '../lib/server/fal-multimodel-contracts.mjs';
const p='A cinematic film set in a bright open studio';
test('verified official endpoint paths and exact request shapes',()=>{
 assert.equal(MULTIMODEL_CONTRACTS['seedance-25-t2v'].endpoint,'bytedance/seedance-2.5/us/text-to-video');
 assert.equal(MULTIMODEL_CONTRACTS['kling-flash-t2v'].endpoint,'kling/v4/flash/text-to-video');
 const a=validatedMultimodelRequest('kling-flash-t2v',{prompt:p,duration:10,resolution:'720p',aspect_ratio:'9:16'});
 assert.deepEqual(a.input,{prompt:p,duration:10,resolution:'720p',aspect_ratio:'9:16'});
 const s=validatedMultimodelRequest('seedance-25-t2v',{prompt:p,duration:10,resolution:'720p',aspect_ratio:'9:16'});
 assert.equal(s.input.duration,'10');assert.equal(s.input.generate_audio,true);
});
test('image endpoints conform to vendor schema without hidden extra inputs',()=>{
 const f=validatedMultimodelRequest('flux3-t2i',{prompt:p,resolution:'1k',aspect_ratio:'1:1'});
 assert.equal(f.endpoint,'blackforestlabs/flux-3/text-to-image');assert.equal(f.input.output_format,'png');
 const n=validatedMultimodelRequest('nano-banana-21-t2i',{prompt:p,resolution:'1K',aspect_ratio:'1:1'});
 assert.equal(n.endpoint,'google/nano-banana-2.1');assert.equal(n.input.num_images,1);
});
test('published rate calculations never assume unknown Seedance token count',()=>{
 const base={prompt:p,duration:10,resolution:'720p',aspect_ratio:'9:16'};
 assert.equal(conservativeMultimodelQuote('kling-flash-t2v',base,{verifiedMaxUsd:2.1}).usd,0.94);
 assert.throws(()=>conservativeMultimodelQuote('seedance-25-t2v',base,{verifiedMaxUsd:2.1}),/PROVIDER_QUOTE_REQUIRED/);
 assert.equal(conservativeMultimodelQuote('flux3-t2i',{prompt:p,resolution:'1k',aspect_ratio:'1:1'},{verifiedMaxUsd:2.1,estimatedMegapixels:1}).usd,0.048);
 assert.equal(conservativeMultimodelQuote('nano-banana-21-t2i',{prompt:p,resolution:'1K',aspect_ratio:'1:1'},{verifiedMaxUsd:2.1}).usd,1);
 assert.throws(()=>conservativeMultimodelQuote('kling-flash-t2v',base,{verifiedMaxUsd:0.1}),/PROVIDER_BUDGET_BLOCKED/);
});
test('rejects incorrect duration, unsupported resolutions, provider injected arguments and disallowed prompts',()=>{
 const valid={prompt:p,duration:10,resolution:'720p',aspect_ratio:'9:16'};
 for(const wrong of [{...valid,duration:21},{...valid,resolution:'4k'},{...valid,user_id:'someone'}, {...valid,prompt:'undress her clothes'}])
 assert.throws(()=>validatedMultimodelRequest('kling-flash-t2v',wrong));
});
test('model activation fails closed even with provider API key and preview opt in',()=>{
 const a=multimodelActivationStatus('kling-flash-t2v',{VERCEL_ENV:'preview',K4K_MULTIMODEL_PREVIEW:'true',FAL_KEY:'key'});
 assert.equal(a.previewAllowed,true);assert.equal(a.customerEnabled,false);
 assert.ok(a.blockers.includes('CREDIT_PIPELINE_PENDING'));
 assert.equal(multimodelActivationStatus('kling-flash-t2v',{VERCEL_ENV:'production',FAL_KEY:'key'}).customerEnabled,false);
});
