import {sendWelcome} from '../../../lib/server/welcome-email.mjs';
import {studioDestination} from '../../../lib/customer-routes.mjs';
import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';

export async function GET(request){
 const {searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 const isPasswordRecovery=searchParams.get('flow')==='password-recovery';
 const target=new URL(isPasswordRecovery?'/update-password':studioDestination(searchParams.get('next')),origin);
 const affiliate=target.pathname==='/affiliates';
 const failure=new URL(isPasswordRecovery?'/reset-password?error=expired':affiliate?'/affiliates?error=affiliate-verification':'/login?error=oauth',origin);
 if(!isPasswordRecovery&&!affiliate)failure.searchParams.set('next',target.pathname+target.search);
 if(!code)return NextResponse.redirect(failure);
 let response=NextResponse.redirect(target);
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(cookies){cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options))}
  }
 });
 const {data,error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(failure);
 try{if(!affiliate)await sendWelcome(data.user)}catch{console.error('K4K welcome delivery failed')}
 return response;
}
