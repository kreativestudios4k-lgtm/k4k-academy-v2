import {createClient} from '@supabase/supabase-js';
export async function sendWelcome(user){
 if(!user?.email_confirmed_at||!user.email||Date.parse(user.created_at)<Date.parse('2026-11-15T17:00:00Z')||!process.env.RESEND_API_KEY||!process.env.K4K_EMAIL_FROM||process.env.VERCEL_ENV!=='production')return;
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:insertError}=await db.from('k4k_welcome_delivery').upsert({user_id:user.id},{onConflict:'user_id',ignoreDuplicates:true});
 if(insertError)throw new Error('Welcome ledger unavailable');
 const {data:row,error}=await db.from('k4k_welcome_delivery').select('sent_at,created_at').eq('user_id',user.id).single();
 if(error)throw new Error('Welcome ledger read failed');
 if(row.sent_at||Date.now()-Date.parse(row.created_at)>23*3600000)return;
 const html='<html><body style="background:#101010;color:white;font-family:Arial;padding:32px"><h1 style="color:#c6ff00">K4K APP</h1><h2>Welcome to the Creator Era.</h2><p>Your account is ready. Discover viral templates and create incredible AI videos.</p><p><a style="background:#c6ff00;color:#101010;padding:12px" href="https://kreativestudios4k.com/k4k-app/creator">Start creating</a></p><p>Kreative Studios 4K</p></body></html>';
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'k4k-welcome-'+user.id},body:JSON.stringify({from:process.env.K4K_EMAIL_FROM,to:[user.email],subject:'Welcome to K4K APP',html}),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw new Error('Welcome delivery rejected');
 const result=await r.json();
 const {error:updateError}=await db.from('k4k_welcome_delivery').update({sent_at:new Date().toISOString(),provider_id:result.id}).eq('user_id',user.id);
 if(updateError)throw new Error('Welcome ledger update failed');
}
