// Server-only multi-model draft and signed quote contract.
// Not connected to customer dispatch. A quote is not approval to generate.
import {createHash} from 'node:crypto';
import {validatedMultimodelRequest,MULTIMODEL_CONTRACTS} from './fal-multimodel-contracts.mjs';
import {generationCredits,quoteSigner} from './generation-quote.mjs';

const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const allowed=new Set(['id','user_id','model','status','input','provider']);
function assertDraft(job,userId){
 if(!uuid.test(userId??'')||!job||typeof job!=='object'||Array.isArray(job))throw Error('INVALID_JOB');
 if(Object.keys(job).some(key=>!allowed.has(key)))throw Error('INVALID_MULTIMODEL_DRAFT');
 if(!uuid.test(job.id??'')||job.user_id!==userId||job.status!=='draft'||job.provider!=='fal')throw Error('INVALID_MULTIMODEL_DRAFT');
 if(!Object.hasOwn(MULTIMODEL_CONTRACTS,job.model))throw Error('MODEL_NOT_CONFIGURED');
 const validated=validatedMultimodelRequest(job.model,job.input);
 return {validated};
}
export function multimodelDraftFingerprint(job,userId){
 const {validated}=assertDraft(job,userId);
 // Fingerprint only the normalized, validated model inputs, never a caller-provided hash.
 return createHash('sha256').update(JSON.stringify([
  'k4k-multimodel-draft-v1',job.id,userId,job.model,validated.endpoint,validated.kind,validated.input
 ])).digest('hex');
}
export function prepareMultimodelQuote({job,userId,serverQuote,env=process.env,now=Date.now()}={}){
 const {validated}=assertDraft(job,userId);
 // No browser-supplied costs and no unchecked rate cards: the calling server
 // must obtain and independently verify the quoted provider amount.
 if(env.VERCEL_ENV!=='preview'||env.K4K_MULTIMODEL_PREVIEW!=='true')throw Error('MULTIMODEL_PREVIEW_DISABLED');
 if(env.K4K_MULTIMODEL_RATE_CARD_VERIFIED!=='true')throw Error('RATE_CARD_PENDING');
 if(serverQuote?.source!=='server-verified'||serverQuote.model!==job.model||serverQuote.endpoint!==validated.endpoint)throw Error('PROVIDER_QUOTE_REQUIRED');
 const usd=serverQuote.usd;
 const maxUsd=Number(env.K4K_GENERATION_MAX_USD);
 if(!Number.isFinite(usd)||usd<=0||usd>5||!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>5||usd>maxUsd)throw Error('PROVIDER_BUDGET_BLOCKED');
 const credits=generationCredits(usd,env);
 const fingerprint=multimodelDraftFingerprint(job,userId);
 const signingSecret=env.K4K_GENERATION_QUOTE_SECRET;
 if(typeof signingSecret!=='string'||signingSecret.length<32)throw Error('QUOTE_SIGNING_UNAVAILABLE');
 const token=quoteSigner(signingSecret).issue({type:'multimodel-preview-v1',userId,jobId:job.id,model:job.model,endpoint:validated.endpoint,kind:validated.kind,usd,credits,fingerprint},now);
 return Object.freeze({jobId:job.id,model:job.model,kind:validated.kind,usd,credits,quoteToken:token,expiresInSeconds:300,dispatchEnabled:false});
}
export function verifyMultimodelQuote({job,userId,token,env=process.env,now=Date.now()}={}){
 const {validated}=assertDraft(job,userId);
 const secret=env.K4K_GENERATION_QUOTE_SECRET;
 if(typeof secret!=='string'||secret.length<32)throw Error('QUOTE_SIGNING_UNAVAILABLE');
 const q=quoteSigner(secret).verify(token,now);
 if(q.type!=='multimodel-preview-v1'||q.userId!==userId||q.jobId!==job.id||q.model!==job.model||q.endpoint!==validated.endpoint||q.kind!==validated.kind||q.fingerprint!==multimodelDraftFingerprint(job,userId))throw Error('QUOTE_CHANGED');
 if(!Number.isFinite(q.usd)||q.usd<=0||q.usd>Number(env.K4K_GENERATION_MAX_USD)||generationCredits(q.usd,env)!==q.credits)throw Error('QUOTE_CHANGED');
 return Object.freeze({model:q.model,usd:q.usd,credits:q.credits,kind:q.kind,dispatchEnabled:false});
}
