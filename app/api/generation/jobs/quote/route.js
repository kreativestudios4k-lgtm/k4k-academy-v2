import {generationContext,prepareGenerationInput,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {createHiggsfieldRest} from '../../../../../lib/server/higgsfield-rest.mjs';
import {generationCredits,draftFingerprint,quoteSigner} from '../../../../../lib/server/generation-quote.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{
  const {user,body,job,database}=await generationContext(request);
  if(job.status!=='draft')throw Error('JOB_NOT_DRAFT');
  const resolution=body.resolution??'720p';
  const input=await prepareGenerationInput(database,job,resolution);
  const {usd}=await createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS}).estimate(job.model,input);
  let credits=null,blocker=null,quoteToken=null;
  try{
   credits=generationCredits(usd);
   quoteToken=quoteSigner(process.env.HF_CREDENTIALS).issue({userId:user.id,jobId:job.id,resolution,usd,credits,fingerprint:draftFingerprint(job,resolution)});
  }catch(error){blocker=error.message==='CREDIT_PRICING_NOT_APPROVED'?error.message:'CREDIT_PRICING_NOT_CONFIGURED'}
  const generationEnabled=process.env.VERCEL_ENV==='preview'&&process.env.K4K_ENABLE_TEST_GENERATION==='true'&&process.env.HIGGSFIELD_GENJUTSU_ENABLED==='true';
  const testAuthorized=(process.env.K4K_GENERATION_TEST_USERS||'').split(',').map(value=>value.trim()).includes(user.id);
  const budget=Number(process.env.K4K_GENERATION_MAX_USD);
  const budgetApproved=Number.isFinite(budget)&&budget>0&&budget<=5&&usd<=budget;
  return Response.json({jobId:job.id,tier:job.model,resolution,providerAuthenticated:true,providerQuoteVerified:true,estimatedProviderUsd:usd,customerCredits:credits,quoteToken,expiresInSeconds:quoteToken?300:null,generationEnabled:generationEnabled&&testAuthorized&&budgetApproved&&!!quoteToken,blocker:blocker||(!generationEnabled?'GENERATION_DISABLED':!testAuthorized?'TEST_GENERATION_NOT_AUTHORIZED':!budgetApproved?'PROVIDER_BUDGET_BLOCKED':null),creditsReserved:0},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
