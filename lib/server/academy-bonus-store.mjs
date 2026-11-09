// Server-only one-time Academy migration bonus operations.
// Use only after verifying the authenticated user and the owned generation job.
// These calls never invoke a paid AI provider or change subscription billing.
export function createAcademyBonusStore(client){
 if(typeof window!=='undefined')throw new Error('Server only');
 async function call(name,userId,jobId){
  if(!userId||!jobId)throw new Error('Missing owned job');
  const {data,error}=await client.rpc(name,{p_user:userId,p_job:jobId});
  if(error)throw new Error('Bonus operation unavailable');
  return data;
 }
 return Object.freeze({
  reserve:(userId,jobId)=>call('k4k_bonus_reserve',userId,jobId),
  settle:(userId,jobId)=>call('k4k_bonus_settle',userId,jobId),
 });
}
