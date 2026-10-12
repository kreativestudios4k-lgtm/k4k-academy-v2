import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';

export async function GET(request){
 const {searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 // Only the dedicated recovery flow may enter the password editor.
 // All regular email/Google sign-ins continue to the membership gate.
 const isPasswordRecovery=searchParams.get('flow')==='password-recovery';
 const target=new URL(isPasswordRecovery?'/update-password':'/membership-required',origin);
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
