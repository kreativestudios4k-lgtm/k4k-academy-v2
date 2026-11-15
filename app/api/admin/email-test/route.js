import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function POST(request){
 const origin=request.headers.get('origin');
 if(origin!=='https://kreativestudios4k.com')return new Response(null,{status:403});
 const jar=await cookies();
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>jar.getAll(),setAll:()=>{}}});
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user?.email_confirmed_at||user.email?.toLowerCase()!=='hello@kreativestudios4k.com')return new Response(null,{status:403});
 if(!process.env.RESEND_API_KEY||!process.env.K4K_EMAIL_FROM)return Response.json({error:'Email configuration missing'},{status:503});
 const html='<html><body style="background:#101010;color:white;font-family:Arial;padding:32px"><h1 style="color:#c6ff00">K4K APP</h1><h2>Welcome to the Creator Era.</h2><p>Create incredible AI videos and discover viral templates.</p><p style="color:#c6ff00">Preview: your first 5-second Lite video, free.</p><p>This is a test email. No credits or promotional entitlement have been activated.</p><a style="background:#c6ff00;color:#101010;padding:12px" href="https://kreativestudios4k.com">Start creating</a></body></html>';
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'k4k-owner-welcome-test-2026-11-15'},body:JSON.stringify({from:process.env.K4K_EMAIL_FROM,to:['hello@kreativestudios4k.com'],subject:'Welcome to K4K APP — Test Email',html}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)return Response.json({error:'Resend rejected test',status:r.status},{status:502});
 const data=await r.json();return Response.json({accepted:true,id:data.id});
}
