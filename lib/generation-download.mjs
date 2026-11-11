// Download destinations are fresh signed objects from this application's
// private Storage bucket. Do not navigate to arbitrary JSON-provided URLs.
export function generationDownloadDestination(value,supabaseUrl){
 let url,origin;try{url=new URL(value);origin=new URL(supabaseUrl).origin}catch{throw Error('DOWNLOAD_LINK_INVALID')}
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||url.hash||!url.pathname.startsWith('/storage/v1/object/sign/studio-generations/')||!url.searchParams.get('token')||!url.searchParams.has('download'))throw Error('DOWNLOAD_LINK_INVALID');
 return url.href;
}
