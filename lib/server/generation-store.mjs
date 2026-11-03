// Inject a server-only service-role client; never a user/browser client.
export function createGenerationStore(client) {
 if (typeof window !== 'undefined') throw new Error('Server only');
 async function rpc(name,params) {
  const {data,error}=await client.rpc(name,params);
  if(error || !data) throw new Error(`Generation store operation failed: ${name}`);
  return data;
 }
 return {
  reserve:(user,key,input,credits)=>rpc('k4k_generation_reserve',{p_user:user,p_key:key,p_input:input,p_credits:credits}),
  submitting:(user,job)=>rpc('k4k_generation_submitting',{p_user:user,p_job:job}),
  attach:(user,job,id,url)=>rpc('k4k_generation_attach',{p_user:user,p_job:job,p_provider_id:id,p_status_url:url}),
  read:(user,job)=>rpc('k4k_generation_read',{p_user:user,p_job:job}),
  settle:(user,job,id,status,url)=>rpc('k4k_generation_settle',{p_user:user,p_job:job,p_provider_id:id,p_status:status,p_output_url:url})
 };
}
