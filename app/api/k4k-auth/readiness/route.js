import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export const runtime='nodejs';

// Read-only deployment check. It exposes no keys, account records or tokens.
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview')return new NextResponse(null,{status:404});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const configured=Boolean(url&&key);
 if(!configured)return NextResponse.json({configured:false,reachable:false},{status:503});
 try{
  const response=await fetch(new URL('/auth/v1/settings',url),{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)return NextResponse.json({configured:true,reachable:false,authStatus:response.status},{status:503});
  const settings=await response.json();
  return NextResponse.json({
   configured:true,reachable:true,
   emailEnabled:typeof settings.external?.email==='boolean'?settings.external.email:null,
   googleEnabled:typeof settings.external?.google==='boolean'?settings.external.google:null,
   signupEnabled:typeof settings.disable_signup==='boolean'?!settings.disable_signup:null,
   emailConfirmationRequired:typeof settings.mailer_autoconfirm==='boolean'?!settings.mailer_autoconfirm:null
  },{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({configured:true,reachable:false},{status:503})}
}
