import {ownedMediaPath,validateReferenceList} from './generation-media.mjs';
import {mp4DurationSeconds} from './mp4-duration.mjs';
const LIMITS={image:10*1024*1024,video:50*1024*1024};
function validSignature(bytes,kind,path){
 if(kind==='video')return bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp';
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes.length>=8&&bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]);
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 const extension=path.split('.').pop().toLowerCase();
 return extension==='jpg'||extension==='jpeg'?jpeg:extension==='png'?png:extension==='webp'?webp:false;
}
export async function verifyStudioMedia({client,userId,referencePaths,videoPath}){
 const images=validateReferenceList(userId,referencePaths);
 const video=ownedMediaPath(userId,videoPath,'video');
 let durationSeconds=null;
 for(const item of [...images,video]){
  const kind=item.bucket==='studio-videos'?'video':'image';
  // Download the private object through the service-role client, never a client URL.
  const {data,error}=await client.storage.from(item.bucket).download(item.path);
  if(error||!data)throw new Error('MEDIA_NOT_FOUND');
  if(data.size<12||data.size>LIMITS[kind])throw new Error('MEDIA_SIZE_INVALID');
  const bytes=new Uint8Array(await data.slice(0,16).arrayBuffer());
  if(!validSignature(bytes,kind,item.path))throw new Error('MEDIA_SIGNATURE_INVALID');
  if(kind==='video')durationSeconds=mp4DurationSeconds(new Uint8Array(await data.arrayBuffer()));
 }
 return {images:images.length,videoVerified:true,durationVerified:true,durationSeconds};
}
