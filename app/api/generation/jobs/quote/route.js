import {generationEnvironmentAllowed,generationUserAllowed,generationProviderEnabled,generationAccountBlocker} from '../../../../../lib/server/generation-policy.mjs';
import {generationContext,prepareGenerationInput,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {createGenerationProvider,generationProviderName,generationSigningSecret} from '../../../../../lib/server/generation-provider.mjs';
import {generationCredits,draftFingerprint,quoteSigner} from '../../../../../lib/server/generation-quote.mjs';
import {generationBudgetPolicy} from '../../../../../lib/server/generation-submit-service.mjs';
import {earlyFreeQuoteAllowed,EARLY_FREE_MAX_SECONDS,EARLY_FREE_MAX_USD} from '../../../../../lib/server/early-free-generation.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{
  const {user,body,job,database}=await generationContext(request);
  if(job.status!=='draft')throw Error('JOB_NOT_DRAFT');
  const providerName=generationProviderName(job);
  const resolution=body.resolution??'720p';
  const {input,sourceSeconds,referenceSeconds}=await prepareGenerationInput(database,job,resolution);
  const estimate=await createGenerationProvider(job).estimate(job.model,input,{sourceSeconds,referenceSeconds});
  const {usd}=estimate;
  let credits=null,blocker=null,quoteToken=null;
  const production=process.env.VERCEL_ENV==='production';
  let entitlement=null;
  if(production&&user.email_confirmed_at&&sourceSeconds>=2&&sourceSeconds<=EARLY_FREE_MAX_SECONDS&&usd<=EARLY_FREE_MAX_USD){
   const {data,error}=await database.from('k4k_early_free_entitlements').select('status,attempts').eq('user_id',user.id).maybeSingle();
   if(error)throw Error('UNAVAILABLE');entitlement=data;
  }
  const freeGeneration=earlyFreeQuoteAllowed({production,verifiedEmail:!!user.email_confirmed_at,sourceSeconds,usd,entitlement});
  try{
   credits=generationCredits(usd);
   quoteToken=quoteSigner(generationSigningSecret(process.env,providerName)).issue({provider:providerName,userId:user.id,jobId:job.id,resolution,usd,credits,freeGeneration,fingerprint:draftFingerprint(job,resolution)});
  }catch(error){blocker=error.message==='CREDIT_PRICING_NOT_APPROVED'?error.message:'CREDIT_PRICING_NOT_CONFIGURED'}
  const generationEnabled=generationEnvironmentAllowed()&&generationProviderEnabled(process.env,providerName);
  const testAuthorized=generationUserAllowed(user.id,process.env,providerName);
  const budget=Number(process.env.K4K_GENERATION_MAX_USD);
  const budgetApproved=Number.isFinite(budget)&&budget>0&&budget<=5&&usd<=budget;
  const {data:account,error:accountError}=await database.from(process.env.VERCEL_ENV==='production'?'k4k_live_credit_accounts':'studio_credit_accounts').select('balance,billing_hold').eq('user_id',user.id).maybeSingle();
  if(accountError)throw Error('UNAVAILABLE');
  const creditBalance=account?.balance??0;
  const accountBlocker=generationAccountBlocker({balance:freeGeneration?Math.max(creditBalance,credits??0):creditBalance,billingHold:account?.billing_hold,credits});
  let capacityBlocker=null;
  if(!blocker&&generationEnabled&&testAuthorized&&budgetApproved&&!accountBlocker){try{const b=generationBudgetPolicy(process.env,providerName,usd);const {data,error}=await database.rpc('k4k_generation_quote_capacity',{p_user:user.id,p_quote_micros:b.quoteMicros,p_daily_budget_micros:b.dailyBudgetMicros,p_total_budget_micros:b.totalBudgetMicros,p_max_active:b.maxActive,p_free:freeGeneration});if(error)throw Error('GENERATION_UNAVAILABLE');capacityBlocker=data??null;}catch(e){capacityBlocker=e.message==='GENERATION_BUDGET_GUARD_REQUIRED'?'GENERATION_BUDGET_GUARD_REQUIRED':'GENERATION_UNAVAILABLE';}}
  return Response.json({jobId:job.id,tier:job.model,resolution,provider:providerName,providerAuthenticated:estimate.providerAuthenticated??true,providerQuoteVerified:estimate.providerQuoteVerified,providerRateCardVerified:estimate.providerRateCardVerified,pricingMode:estimate.pricingMode,estimatedProviderUsd:usd,customerCredits:credits,chargedCredits:freeGeneration?0:credits,freeGeneration,creditBalance,quoteToken,expiresInSeconds:quoteToken?300:null,generationEnabled:generationEnabled&&testAuthorized&&budgetApproved&&!!quoteToken&&!accountBlocker&&!capacityBlocker,blocker:blocker||capacityBlocker||(!generationEnabled?'GENERATION_DISABLED':!testAuthorized?'TEST_GENERATION_NOT_AUTHORIZED':!budgetApproved?'PROVIDER_BUDGET_BLOCKED':accountBlocker),creditsReserved:0},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
