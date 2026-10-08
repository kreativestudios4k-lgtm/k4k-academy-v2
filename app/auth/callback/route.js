import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';

export async function GET(request){
 const {searchParams,origin}=new URL(request.url);
 const code=searchParams.get('code');
 const target=new URL('/membership-required',origin);
 if(!code)return NextResponse.redirect(new URL('/login?error=oauth',origin));
 let response=NextResponse.redirect(target);
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(cookies){cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options))}
  }
 });
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL('/login?error=oauth',origin));
 return response;
}
