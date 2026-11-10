import {generationEnvironmentAllowed,generationUserAllowed} from '../../../../../lib/server/generation-policy.mjs';
import {generationContext,prepareGenerationInput,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {createHiggsfieldRest} from '../../../../../lib/server/higgsfield-rest.mjs';
import {generationCredits,draftFingerprint,quoteSigner} from '../../../../../lib/server/generation-quote.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{
  const {user,body,job,database}=await generationContext(request);
  if(job.status!=='draft')throw Error('JOB_NOT_DRAFT');
  const resolution=body.resolution??'720p';
  const {input,sourceSeconds,referenceSeconds}=await prepareGenerationInput(database,job,resolution);
  const estimate=await createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS}).estimate(job.model,input,{sourceSeconds,referenceSeconds});
  const {usd}=estimate;
  let credits=null,blocker=null,quoteToken=null;
  try{
   credits=generationCredits(usd);
   quoteToken=quoteSigner(process.env.HF_CREDENTIALS).issue({userId:user.id,jobId:job.id,resolution,usd,credits,fingerprint:draftFingerprint(job,resolution)});
  }catch(error){blocker=error.message==='CREDIT_PRICING_NOT_APPROVED'?error.message:'CREDIT_PRICING_NOT_CONFIGURED'}
  const generationEnabled=generationEnvironmentAllowed()&&process.env.HIGGSFIELD_GENJUTSU_ENABLED==='true';
  const testAuthorized=generationUserAllowed(user.id);
  const budget=Number(process.env.K4K_GENERATION_MAX_USD);
  const budgetApproved=Number.isFinite(budget)&&budget>0&&budget<=5&&usd<=budget;
  return Response.json({jobId:job.id,tier:job.model,resolution,providerAuthenticated:true,providerQuoteVerified:estimate.providerQuoteVerified,providerRateCardVerified:estimate.providerRateCardVerified,pricingMode:estimate.pricingMode,estimatedProviderUsd:usd,customerCredits:credits,quoteToken,expiresInSeconds:quoteToken?300:null,generationEnabled:generationEnabled&&testAuthorized&&budgetApproved&&!!quoteToken,blocker:blocker||(!generationEnabled?'GENERATION_DISABLED':!testAuthorized?'TEST_GENERATION_NOT_AUTHORIZED':!budgetApproved?'PROVIDER_BUDGET_BLOCKED':null),creditsReserved:0},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
