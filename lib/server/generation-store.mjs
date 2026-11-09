// Server-only adapter to transactional, service-role-only generation RPCs.
// Reservation is hard-disabled until trusted pricing and provider lifecycle pass tests.
export function createGenerationStore(client,{enabled=false}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const rpc=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error||!data)throw Error('GENERATION_STORE_UNAVAILABLE');return data;};
 return Object.freeze({
  reserve:async(userId,jobId,requestKey,credits)=>{
   if(!enabled)throw Error('GENERATION_DISABLED');
   return rpc('k4k_generation_reserve_draft',{p_user:userId,p_job:jobId,p_key:requestKey,p_credits:credits,p_enabled:true});
  },
  finish:async(userId,jobId,outcome,outputPath=null)=>{
   if(!enabled)throw Error('GENERATION_DISABLED');
   if(!['completed','failed'].includes(outcome))throw Error('INVALID_OUTCOME');
   return rpc('k4k_generation_finish',{p_user:userId,p_job:jobId,p_outcome:outcome,p_output_path:outputPath});
  },
  read:async(userId,jobId)=>{
   const {data,error}=await client.from('studio_generation_jobs').select('id,user_id,status,model,reference_paths,reference_video_path,output_path,credits_reserved').eq('id',jobId).eq('user_id',userId).maybeSingle();
   if(error)throw Error('GENERATION_STORE_UNAVAILABLE');
   return data;
  }
 });
}
