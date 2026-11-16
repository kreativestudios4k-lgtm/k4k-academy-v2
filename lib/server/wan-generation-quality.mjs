// Safe WAN reliability mode: improves reference clarity, never disables moderation.
export function wanQualitySettings(env=process.env){
 const pilot=env.VERCEL_ENV==='preview'&&env.K4K_WAN_QUALITY_PILOT==='true';
 return {enable_prompt_expansion:true,enable_thinking:pilot,enable_safety_checker:true};
}
export function referenceRejectionHoldCount(rows){
 if(!Array.isArray(rows))throw Error('GENERATION_HISTORY_UNAVAILABLE');
 return rows.filter(row=>row?.status==='failed'&&row?.error_message==='CONTENT_POLICY_BLOCKED').length;
}
// Avoid sending a third paid submission for the same user's rejected template in 24h.
// The user may try a different template immediately; these rules don't inspect media.
export async function generationRejectionHold(database,job,{now=Date.now()}={}){
 if(!job?.template_id||job.template_id==='creator-upload-preview')return null;
 const {data,error}=await database.from('studio_generation_jobs')
 .select('status,error_message').eq('user_id',job.user_id)
 .eq('template_id',job.template_id).gte('created_at',new Date(now-86400000).toISOString())
 .eq('status','failed').eq('error_message','CONTENT_POLICY_BLOCKED').limit(2);
 if(error)throw Error('GENERATION_HISTORY_UNAVAILABLE');
 return referenceRejectionHoldCount(data)>=2?'REPEATED_PROVIDER_REJECTION':null;
}
