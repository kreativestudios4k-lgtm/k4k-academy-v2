import {createServerClient} from '@supabase/ssr';import {NextResponse} from 'next/server';
const euro=new Set(['AT','BE','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES']);
function market(country){if(country==='BR')return 'BRL';if(country==='GB')return 'GBP';if(euro.has(country))return 'EUR';return 'USD'}
export async function proxy(request){
 const h=new Headers(request.headers);const country=h.get('x-vercel-ip-country')||'US';h.set('x-k4k-country',country);h.set('x-k4k-currency',market(country));
 let response=NextResponse.next({request:{headers:h}});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return response;
 const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(cs){cs.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request:{headers:h}});cs.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
 const{data}=await supabase.auth.getClaims();const user=data?.claims;const protectedPath=request.nextUrl.pathname.startsWith('/academy')||request.nextUrl.pathname.startsWith('/prompts')||request.nextUrl.pathname.startsWith('/mentor')||request.nextUrl.pathname.startsWith('/api/mentor')||request.nextUrl.pathname.startsWith('/api/realtime');
 if(protectedPath&&!user){if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Authentication required'},{status:401});const u=request.nextUrl.clone();u.pathname='/login';return NextResponse.redirect(u)}
 if(protectedPath&&user){
  const uid=user.sub;
  const [{data:admin},{data:membership}]=await Promise.all([
   supabase.from('k4k_admins').select('user_id').eq('user_id',uid).maybeSingle(),
   supabase.from('memberships').select('status,current_period_end').eq('user_id',uid).maybeSingle()
  ]);
  // Access is granted only for an authenticated account with an active paid membership.\n  // Email OTP and Google both verify control of the payment email; membership is\n  // linked by the claim-academy-membership function after authentication.\n  const isPaid=membership&&['active','trialing'].includes(membership.status)&&(!membership.current_period_end||new Date(membership.current_period_end).getTime()>Date.now());
  if(!admin&&!isPaid){if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Active membership required'},{status:403});const u=request.nextUrl.clone();u.pathname='/membership-required';return NextResponse.redirect(u)}
 }
 return response
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']}