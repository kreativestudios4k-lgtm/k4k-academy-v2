// Authorization gate for customer video downloads.
// The caller must obtain the job from a trusted database using the authenticated
// session user and sign the returned private storage key with a server-side client.
// Never accept a storage key or remote URL from a browser request.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_KEY=/^[a-zA-Z0-9_-]{8,100}\.mp4$/;
export function authorizeVideoDownload({authenticatedUserId,requestedJobId,job}) {
 if(!UUID.test(authenticatedUserId)||!UUID.test(requestedJobId)) throw new Error('Invalid request');
 if(!job || job.id!==requestedJobId || job.user_id!==authenticatedUserId) throw new Error('Not found');
 if(job.status!=='completed') throw new Error('Video is not ready');
 const key=job.output_storage_path;
 if(typeof key!=='string'||key.length>250||key.includes('%')||key.includes('\\')) throw new Error('Invalid output reference');
 const parts=key.split('/');
 if(parts.length!==3||parts[0]!==authenticatedUserId||parts[1]!==requestedJobId||!SAFE_KEY.test(parts[2])) throw new Error('Invalid output reference');
 return Object.freeze({bucket:'k4k-generation-outputs',path:key});
}
