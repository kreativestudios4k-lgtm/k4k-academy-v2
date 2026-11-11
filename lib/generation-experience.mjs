import {falMotionEstimate,FAL_MOTION_TIERS} from './k4k-motion-tiers.mjs';
import {canConfirmGeneration} from './generation-feedback.mjs';
export function motionCreditPreview(model,seconds){
 const resolution=FAL_MOTION_TIERS[model]?.resolution;
 const estimate=falMotionEstimate(model,{resolution,sourceSeconds:seconds});
 return {model,resolution,sourceSeconds:seconds,outputSeconds:estimate.duration,credits:Math.ceil(Math.round(estimate.usd*1e6)/100000)};
}
// The user approved the visible cost. A higher server price always needs
// another confirmation, and a local preview can never authorize dispatch alone.
export function maySubmitDisplayedQuote(quote,displayedCredits,now=Date.now()){
 return Number.isSafeInteger(displayedCredits)&&displayedCredits>0&&canConfirmGeneration(quote,now)&&quote.customerCredits<=displayedCredits;
}
export function libraryJobsWithActive(jobs,activeJobId,optimisticJob=null){
 const rows=[...jobs];
 if(optimisticJob?.id===activeJobId&&!rows.some(job=>job.id===activeJobId))rows.unshift(optimisticJob);
 return rows.sort((a,b)=>((b.id===activeJobId?1:0)-(a.id===activeJobId?1:0))||String(b.created_at??'').localeCompare(String(a.created_at??'')));
}
