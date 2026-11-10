import {generationEnvironmentAllowed} from '../../../../lib/server/generation-policy.mjs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import catalogue from '../../../k4k-app/template-catalogue.json';
import {mp4DurationSeconds} from '../../../../lib/server/mp4-duration.mjs';
export const runtime='nodejs';
export const maxDuration=60;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 if(!generationEnvironmentAllowed())return json({error:'PREVIEW_ONLY'},403);
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:'UNAUTHENTICATED'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const {data:{user}={},error}=await createClient(url,key,options).auth.getUser(token);
  if(error||!user||user.is_anonymous)return json({error:'UNAUTHENTICATED'},401);
  const {templateId}=await request.json();
  const preset=catalogue.trending.find(item=>item.id===templateId);
  if(!preset)return json({error:'INVALID_TEMPLATE'},400);
  // Browser supplies only a catalogue ID, never a fetch URL or storage owner.
  const source=new URL(preset.videoUrl);
  if(source.protocol!=='https:'||source.hostname!=='d2ol7oe51mr4n9.cloudfront.net')throw Error('TEMPLATE_UNAVAILABLE');
  const response=await fetch(source.href,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok||!response.body)throw Error('TEMPLATE_UNAVAILABLE');
  const reader=response.body.getReader();const chunks=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>50*1024*1024)throw Error('TEMPLATE_TOO_LARGE');chunks.push(value)}}catch(error){await reader.cancel().catch(()=>{});throw error}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const durationSeconds=mp4DurationSeconds(bytes);
  if(durationSeconds<4||durationSeconds>30)throw Error('TEMPLATE_DURATION_INVALID');
  const database=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
  const videoPath=user.id+'/'+randomUUID()+'.mp4';
  const result=await database.storage.from('studio-videos').upload(videoPath,bytes,{contentType:'video/mp4',upsert:false});
  if(result.error)throw Error('TEMPLATE_SAVE_FAILED');
  return json({videoPath,durationSeconds,templateId:preset.id});
 }catch(error){return json({error:['TEMPLATE_TOO_LARGE','TEMPLATE_DURATION_INVALID'].includes(error.message)?error.message:'TEMPLATE_SAVE_UNAVAILABLE'},503)}
}
