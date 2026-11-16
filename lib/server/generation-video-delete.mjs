// Delete only owner-scoped completed output, preserving credit and audit records.
export const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function deletionOutputPath(job,userId){
 if(!job||job.user_id!==userId||!UUID.test(userId)||!UUID.test(job.id)||job.status!=='completed')throw Error('VIDEO_NOT_DELETABLE');
 const path=userId+'/'+job.id+'.mp4';
 if(job.output_path!==path)throw Error('VIDEO_NOT_DELETABLE');
 return path;
}
export async function deleteGeneratedVideo({db,userId,jobId}){
 if(!UUID.test(userId??'')||!UUID.test(jobId??''))throw Error('INVALID_JOB');
 const {data:job,error:readError}=await db.from('studio_generation_jobs').select('id,user_id,status,output_path,deleted_at').eq('id',jobId).eq('user_id',userId).maybeSingle();
 if(readError)throw Error('VIDEO_DELETE_UNAVAILABLE');
 if(!job)throw Error('VIDEO_NOT_FOUND');
 const path=deletionOutputPath(job,userId);
 if(!job.deleted_at){
  const {data:claimed,error:writeError}=await db.from('studio_generation_jobs').update({deleted_at:new Date().toISOString()}).eq('id',jobId).eq('user_id',userId).eq('status','completed').is('deleted_at',null).select('id').maybeSingle();
  if(writeError)throw Error('VIDEO_DELETE_UNAVAILABLE');
  if(!claimed){
   const {data:updated,error:checkError}=await db.from('studio_generation_jobs').select('deleted_at').eq('id',jobId).eq('user_id',userId).maybeSingle();
   if(checkError||!updated?.deleted_at)throw Error('VIDEO_DELETE_UNAVAILABLE');
  }
 }
 // No original reference images/videos are removed. A failed storage cleanup
 // leaves the tombstone set and can be retried with the same job ID.
 const {error:storageError}=await db.storage.from('studio-generations').remove([path]);
 if(storageError)return {deleted:true,storageCleanupPending:true};
 return {deleted:true,storageCleanupPending:false};
}
