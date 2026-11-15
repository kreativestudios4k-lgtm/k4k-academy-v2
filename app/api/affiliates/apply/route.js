import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {countries,languages,messages,normalizeInstagram} from '../../../../lib/affiliate-locales.mjs';
export const runtime='nodejs';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function verifiedUser(request){const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll:()=>{}}});const {data,error}=await client.auth.getUser();return error?null:data.user}
function service(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
async function deliver({to,subject,text,key}){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:process.env.K4K_EMAIL_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Email delivery rejected');const data=await r.json();if(!data.id)throw Error('Missing delivery ID');return data.id}
export async function GET(request){try{const user=await verifiedUser(request);if(!user?.email_confirmed_at||!user.email)return respond({signedIn:false});const {data,error}=await service().from('k4k_affiliate_applications').select('status,confirmation_sent_at').eq('user_id',user.id).maybeSingle();if(error)return respond({error:'Could not load application status.'},503);return respond({signedIn:true,email:user.email,application:data?{status:data.status,confirmationSent:!!data.confirmation_sent_at}:null})}catch{return respond({error:'Application service unavailable.'},503)}}
export async function POST(request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Invalid request origin.'},403);
  const user=await verifiedUser(request);if(!user?.email_confirmed_at||!user.email)return respond({error:'Sign in with a verified email to apply.'},401);
  if(process.env.VERCEL_ENV!=='production'||!process.env.RESEND_API_KEY||!process.env.K4K_EMAIL_FROM)return respond({error:'Applications are temporarily unavailable in this environment.'},503);
  if(Number(request.headers.get('content-length')||0)>8192)return respond({error:'Application is too large.'},413);
  const raw=await request.text();if(raw.length>8192)return respond({error:'Application is too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return respond({error:'Invalid application.'},400)}
  const db=service();let {data:row,error}=await db.from('k4k_affiliate_applications').select('*').eq('user_id',user.id).maybeSingle();if(error)throw Error('Application lookup failed');
  if(!row){const name=typeof body?.name==='string'?body.name.trim():'';const country=body?.country;const language=body?.language;const instagram=normalizeInstagram(body?.instagram);if(name.length<2||name.length>100||!countries.includes(country)||!Object.hasOwn(languages,language)||!instagram)return respond({error:'Enter your name, country, preferred language and a valid Instagram profile.'},400);
   const {error:insertError}=await db.from('k4k_affiliate_applications').upsert({user_id:user.id,email:user.email,full_name:name,country,language,instagram},{onConflict:'user_id',ignoreDuplicates:true});if(insertError)throw Error('Application save failed');
   const saved=await db.from('k4k_affiliate_applications').select('*').eq('user_id',user.id).single();if(saved.error)throw Error('Application read failed');row=saved.data;
  }
  if(row.status!=='pending_review')return respond({received:true,status:row.status,confirmationSent:!!row.confirmation_sent_at});
  let confirmationSent=!!row.confirmation_sent_at;
  // Resend's idempotency window is 24 hours. Do not resend automatically after it expires.
  const retryWindow=Date.now()-Date.parse(row.created_at)<23*3600000;
  if(!confirmationSent&&retryWindow){try{const [subject,text]=messages[row.language]||messages.en;const id=await deliver({to:row.email,subject,text:text+'\n\nK4K APP | KreativeStudios4K',key:'k4k-affiliate-confirm-'+user.id});const {error:saveError}=await db.from('k4k_affiliate_applications').update({confirmation_sent_at:new Date().toISOString(),confirmation_provider_id:id}).eq('user_id',user.id);if(saveError)throw Error('Confirmation ledger failed');confirmationSent=true}catch{console.error('K4K affiliate confirmation delivery failed')}}
  if(!row.team_notified_at&&retryWindow){try{await deliver({to:'hello@kreativestudios4k.com',subject:'New K4K creator application',text:['New creator application — pending review','Name: '+row.full_name,'Email: '+row.email,'Country: '+row.country,'Language: '+row.language,'Instagram: '+row.instagram].join('\n'),key:'k4k-affiliate-team-'+user.id});const {error:saveError}=await db.from('k4k_affiliate_applications').update({team_notified_at:new Date().toISOString()}).eq('user_id',user.id);if(saveError)throw Error('Team notification ledger failed')}catch{console.error('K4K affiliate team notification failed')}}
  return respond({received:true,status:row.status,confirmationSent});
 }catch{console.error('K4K affiliate application failed');return respond({error:'Could not submit your application. Please try again.'},503)}
}
