export const creativeLibraryJobs=jobs=>(jobs||[]).filter(job=>job.status!=='draft');
export function creativeDownloadDestination(value,supabaseUrl){
 let url,origin;try{url=new URL(value);origin=new URL(supabaseUrl).origin}catch{throw Error('Invalid download link.')}
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||url.hash||!/^\/storage\/v1\/object\/sign\/(studio-generations|studio-customer-images)\//.test(url.pathname)||!url.searchParams.get('token')||!url.searchParams.has('download'))throw Error('Invalid download link.');
 return url.href;
}
