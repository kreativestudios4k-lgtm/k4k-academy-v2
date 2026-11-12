import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';

export async function GET(request){
 const {searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 // Only the dedicated recovery flow may enter the password editor.
 // All regular email/Google sign-ins continue to the membership gate.
 const isPasswordRecovery=searchParams.get('flow')==='password-recovery';
 const next=searchParams.get('next');
 // Explicit allowlist for public K4K registration and post-login destinations.
 // Arbitrary redirects and Academy entitlement bypasses are not permitted.
 const K4K_PUBLIC_DESTINATIONS=new Set([
  '/k4k-app/account',
  '/k4k-app/credits',
  '/k4k-app/creator',
  '/k4k-app/videos',
  '/pricing',
 ]);
 const safeNext=K4K_PUBLIC_DESTINATIONS.has(next)?next:null;
 const target=new URL(isPasswordRecovery?'/update-password':(safeNext||'/membership-required'),origin);
 if(!code)return NextResponse.redirect(new URL(isPasswordRecovery?'/reset-password?error=expired':'/login?error=oauth',origin));
 let response=NextResponse.redirect(target);
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(cookies){cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options))}
  }
 });
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL(isPasswordRecovery?'/reset-password?error=expired':'/login?error=oauth',origin));
 return response;
}
