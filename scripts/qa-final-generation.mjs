// One authorized real fal job, exact QA user, deterministic job ID. Never submit
// a second request on rebuild, failure, timeout, or uncertain provider response.
import {createClient} from '@supabase/supabase-js';
import {gunzipSync} from 'node:zlib';
import {createGenerationSubmitService} from '../lib/server/generation-submit-service.mjs';
import {prepareGenerationInput} from '../lib/server/generation-route-context.mjs';
import {createGenerationProvider,generationSigningSecret} from '../lib/server/generation-provider.mjs';
import {generationCredits,draftFingerprint,quoteSigner} from '../lib/server/generation-quote.mjs';
import {reconcileGenerationJob} from '../lib/server/generation-reconcile-service.mjs';
import {mp4DurationSeconds} from '../lib/server/mp4-duration.mjs';
const env=process.env;
if(env.VERCEL_ENV!=='preview'||env.K4K_BILLING_QA_ONLY!=='true'||env.K4K_QA_FINAL_GENERATION!=='true')process.exit(0);
const userId='a1e90744-a600-4823-88ae-e81c25609fd3',jobId='51d8731a-e3cc-4a33-a3b0-0d4b2305fa71',requestKey='ecb4c003-c6e5-4ade-8ae3-d1f3a1ccaf97',imagePath=userId+'/ced4abf6-e51b-4428-a6a8-b25194e0513d.png',videoPath=userId+'/84a428ba-9296-4d37-afae-21ec1fd97c59.mp4';
if(env.K4K_QA_USER_ID!==userId||env.K4K_LIVE_PAYMENTS_ENABLED==='true'||env.K4K_ENABLE_PRODUCTION_GENERATION==='true'||!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.FAL_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('QA_UNSAFE_OR_MISSING_CREDENTIALS');
const policy={...env,K4K_WAITLIST_ONLY:'false',K4K_ENABLE_TEST_GENERATION:'true',K4K_GENERATION_TEST_USERS:userId,K4K_FAL_WAN_ENABLED:'true',K4K_FAL_RATE_CARD_APPROVED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true',K4K_PROVIDER_USD_PER_CREDIT:'0.10',K4K_GENERATION_MAX_USD:'2.10',K4K_GENERATION_BUDGET_GUARD_ENABLED:'true',K4K_PROVIDER_DAILY_BUDGET_USD:'280',K4K_PROVIDER_TOTAL_BUDGET_USD:'280',K4K_MAX_ACTIVE_JOBS_PER_USER:'1'};
const options={auth:{persistSession:false,autoRefreshToken:false}};
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,options);
const owner=await db.auth.admin.getUserById(userId);
if(owner.error||owner.data.user?.email!=='k4k-launch-qa-20261113@example.com'||owner.data.user?.app_metadata?.k4k_billing_qa!==true)throw Error('QA_USER_MISMATCH');
const readJob=async()=>{const {data,error}=await db.from('studio_generation_jobs').select('*').eq('id',jobId).eq('user_id',userId).maybeSingle();if(error)throw Error('QA_JOB_READ');return data};
const balance=async()=>{const {data,error}=await db.from('studio_credit_accounts').select('balance,billing_hold').eq('user_id',userId).single();if(error||data.billing_hold)throw Error('QA_CREDIT_ACCOUNT');return data.balance};
const asset=async (path,bucket,encoded,type)=>{const bytes=gunzipSync(Buffer.from(encoded,'base64'));const {error}=await db.storage.from(bucket).upload(path,bytes,{contentType:type,upsert:false});if(error&&String(error.statusCode)!=='409'&&!/already exists/i.test(error.message))throw Error('QA_MEDIA_UPLOAD');return bytes};
let job=await readJob();
if(!job){
 if(await balance()!==80)throw Error('QA_STARTING_BALANCE_MISMATCH');
 const mp4=await asset(videoPath,'studio-videos','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','video/mp4');
 if(mp4DurationSeconds(new Uint8Array(mp4))!==7)throw Error('QA_REFERENCE_DURATION_MISMATCH');
 await asset(imagePath,'studio-references','H4sIAAAAAAAC/+sM8HPn5ZLiYmBg4PX0cAliYGDMYGBgauBgAorYVZR+YGBge+bp4hhScevtrYO9Sw0EHBx/czcVsKgxPHdck+KsF1PHpeDwYNmrPe2l2b9u9qhNvyV0QNBemaGFWYDPwYLhIZABpcB8HMIPGeDCAnxECBNlKJIwUYYiCQ+coTQPlUEZ1DtOJrAsmTKt9M7//ueZxhv7Ty81C57QOXmJi4UAt6CjxZdHilxKMh5tNQoyVQsVONjz/dpqONgnKcr/YDa4+qH+WLezkY3th0cKP5a+ffnwaGPq5y8fHjmYzuF+uCHWr91f9CTH6fRucfZVD/ccatQtymo5/M/C+lBisQ/Dww3GzxL4DjXmGvI+PDBvRmcBA0f76qspAny7E+2eKcvc4AoWArqvYOIs0UOJwj48QAcfftq5k5O97pevP9DZh1sz2zjYFWTWefkEgb1zmGPPurPCIMbXjpVcQJmGggeuuds4wCyGQ439BcJiyOHwQGX/B/N0gmGsvKHyFs/BOa3IgXjjsP4f3whYWNa0JG87xAiypyJwthaQ1f5a8LMI2JQDr2+pCAJZMVPTOkBu4L78pYXZ/u+zNiDn4ScTw5bDaglhIL16QUDf5rT+VJApO5wCMrRg66zOggR/H2eLDbrPGgpuSAo7WOT0bQaGi/xyMb6ciZ/bpnnnLrvQnSqryqzP92ZqFgf7ttM7a1Y92Oxq9OFRgas1a5zMlz9fJvDo8+UsyKoofPBSUZKjvcaD7ZCjP+tF7ocOdirMDwME9jpYVGgpJSnKeHT6KMgcuPqHUQISXGD/QCkwH4cwBztcGMggLEyUoUjCRBmKLDxghtI8VDjaBYenNwVuyId/efw0b8VxR2DFx+Dp6ueyzimhCQCFnDCYHwcAAA==','image/png');
 const {error}=await db.from('studio_generation_jobs').insert({id:jobId,user_id:userId,template_id:'custom',provider:'fal',model:'lite',status:'draft',reference_paths:[imagePath],reference_video_path:videoPath,prompt:'A single bright lime-green circular shape replaces the square in the reference video. The circle remains centered against the dark green background. Smooth subtle cinematic lighting, fixed camera, vertical composition, no text.'});
 if(error)throw Error('QA_DRAFT_INSERT');job=await readJob();
}
if(job.provider!=='fal'||job.model!=='lite'||job.reference_video_path!==videoPath||job.reference_paths?.[0]!==imagePath)throw Error('QA_JOB_MISMATCH');
const provider=createGenerationProvider(job,policy);
if(job.status==='draft'){
 const prep=await prepareGenerationInput(db,job,'720p');
 const estimate=await provider.estimate(job.model,prep.input,{sourceSeconds:prep.sourceSeconds,referenceSeconds:prep.referenceSeconds});
 if(prep.sourceSeconds!==7||estimate.duration!==7||estimate.usd!==0.98||estimate.usd*2>2.10)throw Error('QA_COST_OR_DURATION_MISMATCH');
 const credits=generationCredits(estimate.usd,policy);if(credits!==10||await balance()!==80)throw Error('QA_CREDIT_MISMATCH');
 const token=quoteSigner(generationSigningSecret(policy,'fal')).issue({provider:'fal',userId,jobId,resolution:'720p',usd:estimate.usd,credits,fingerprint:draftFingerprint(job,'720p')});
 console.log('QA_PREPARED '+JSON.stringify({jobId,sourceSeconds:prep.sourceSeconds,outputSeconds:estimate.duration,configuredUsd:estimate.usd,conservativeUsd:estimate.usd*2,credits,balance:80}));
 const submit=createGenerationSubmitService({database:db,provider,prepare:(draft,resolution)=>prepareGenerationInput(db,draft,resolution),env:policy});
 try{const result=await submit({userId,job,quoteToken:token,requestKey});console.log('QA_SUBMITTED '+JSON.stringify(result))}catch(error){console.log('QA_SUBMIT_UNCERTAIN '+String(error.message).slice(0,100));throw error}
 job=await readJob();
}
console.log('QA_JOB '+JSON.stringify({id:job.id,status:job.status,providerJobId:job.provider_job_id,creditsReserved:job.credits_reserved,balance:await balance()}));
if(job.status==='queued'&&!job.provider_job_id)throw Error('QA_UNCERTAIN_NO_RETRY');
if(!['queued','processing','completed'].includes(job.status))throw Error('QA_TERMINAL_NO_RETRY');
for(let n=0;n<36&&['queued','processing'].includes(job.status);n++){
 if(n)await new Promise(resolve=>setTimeout(resolve,5000));
 const outcome=await reconcileGenerationJob({database:db,job,provider});
 console.log('QA_STATUS '+JSON.stringify(outcome));job=await readJob();
}
if(job.status!=='completed'){console.log('QA_PENDING '+JSON.stringify({id:job.id,status:job.status,providerJobId:job.provider_job_id}));process.exit(0)}
const endBalance=await balance();if(endBalance!==70||job.output_path!==userId+'/'+jobId+'.mp4')throw Error('QA_FINAL_LEDGER_MISMATCH');
const {data:output,error:outputError}=await db.storage.from('studio-generations').download(job.output_path);if(outputError||!output)throw Error('QA_OUTPUT_DOWNLOAD');
const outputBytes=new Uint8Array(await output.arrayBuffer());
const duration=mp4DurationSeconds(outputBytes);
if(duration<=0||duration>15.5)throw Error('QA_OUTPUT_DURATION');
console.log('QA_OUTPUT '+JSON.stringify({jobId,providerJobId:job.provider_job_id,bytes:outputBytes.length,duration,creditsUsed:10,balance:endBalance}));
const link=await db.auth.admin.generateLink({type:'magiclink',email:owner.data.user.email});
if(link.error||!link.data.properties?.hashed_token)throw Error('QA_AUTH_LINK');
const auth=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const login=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'});
if(login.error||login.data.user?.id!==userId||!login.data.session?.access_token)throw Error('QA_AUTH_FAILED');
const bearer='Bearer '+login.data.session.access_token,base='https://kreativestudios4k.com';
const library=await fetch(base+'/api/generation/jobs',{headers:{Authorization:bearer},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
if(!library.ok)throw Error('QA_LIBRARY_HTTP_'+library.status);
const history=await library.json();
if(!JSON.stringify(history).includes(jobId))throw Error('QA_LIBRARY_NOT_FOUND');
const mobileUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const download=await fetch(base+'/api/generation/jobs/download?jobId='+jobId+'&download=1',{headers:{Authorization:bearer,'User-Agent':mobileUA},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
if(!download.ok)throw Error('QA_DOWNLOAD_HTTP_'+download.status);
const signed=await download.json();if(!signed.url?.startsWith('https://')||signed.expiresIn>120||!signed.fileName?.endsWith('.mp4'))throw Error('QA_DOWNLOAD_URL_INVALID');
const file=await fetch(signed.url,{headers:{'User-Agent':mobileUA},redirect:'error',signal:AbortSignal.timeout(30000)});
const bytes=new Uint8Array(await file.arrayBuffer()),disposition=file.headers.get('content-disposition')||'';
if(!file.ok||!disposition.toLowerCase().includes('attachment')||bytes.length!==outputBytes.length||mp4DurationSeconds(bytes)!==duration)throw Error('QA_MOBILE_DOWNLOAD_FAILED');
const unauth=await fetch(base+'/api/generation/jobs/download?jobId='+jobId+'&download=1',{redirect:'error',signal:AbortSignal.timeout(15000)});if(unauth.status!==401)throw Error('QA_UNAUTH_DOWNLOAD');
console.log('QA_DOWNLOAD_PASS '+JSON.stringify({libraryHttp:library.status,downloadHttp:download.status,fileHttp:file.status,attachment:true,mobileUserAgent:true,bytes:bytes.length,expiresIn:signed.expiresIn,unauthHttp:unauth.status}));
