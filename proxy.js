import {retiredCustomerDestination,planRegistration} from './lib/customer-routes.mjs';
import {createServerClient} from '@supabase/ssr';import {NextResponse} from 'next/server';
const euro=new Set(['AT','BE','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES']);
function market(country){if(country==='BR')return 'BRL';if(country==='GB')return 'GBP';if(euro.has(country))return 'EUR';return 'USD'}
export async function proxy(request){
 // The Academy AI Mentor and voice services have been discontinued.
 // Refuse every legacy API route before authentication or paid gateway calls.
 const path=request.nextUrl.pathname;
 const retired=retiredCustomerDestination(path);
 if(retired){const u=request.nextUrl.clone();u.pathname=retired;u.search='';return NextResponse.redirect(u)}
 if(path==='/api/mentor'||path.startsWith('/api/mentor/')||path==='/api/realtime'||path.startsWith('/api/realtime/'))return NextResponse.json({error:'This Academy feature has been discontinued.'},{status:410});
 const h=new Headers(request.headers);const country=h.get('x-vercel-ip-country')||'US';h.set('x-k4k-country',country);h.set('x-k4k-currency',market(country));
 let response=NextResponse.next({request:{headers:h}});
 const planPath=path==='/k4k-app/credits';
 const protectedPath=path.startsWith('/academy')||path.startsWith('/prompts')||path.startsWith('/mentor')||path.startsWith('/api/mentor')||path.startsWith('/api/realtime');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key){if(protectedPath||planPath)return new NextResponse('Protected content temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store'}});return response;}
 const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(cs){cs.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request:{headers:h}});cs.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
 const{data}=await supabase.auth.getClaims();const user=data?.claims;
 if(planPath&&(!user||user.is_anonymous)){
  const destination=new URL(planRegistration(request.nextUrl.searchParams.get('plan')),request.url);
  const redirect=NextResponse.redirect(destination);
  response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
  redirect.headers.set('Cache-Control','no-store');
  return redirect;
 }
 if(protectedPath&&!user){if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Authentication required'},{status:401});const u=request.nextUrl.clone();u.pathname='/login';u.search='';u.searchParams.set('next','/academy');return NextResponse.redirect(u)}
 if(protectedPath&&user){
  const uid=user.sub;
  const [{data:admin},{data:membership}]=await Promise.all([
   supabase.from('k4k_admins').select('user_id').eq('user_id',uid).maybeSingle(),
   supabase.from('memberships').select('status,current_period_end').eq('user_id',uid).maybeSingle()
  ]);
  // Authenticated users must have an active paid membership (or be an admin).
  // Both email OTP and Google authentication are supported.
  const isPaid=membership&&['active','trialing'].includes(membership.status)&&(!membership.current_period_end||new Date(membership.current_period_end).getTime()>Date.now());
  if(!admin&&!isPaid){if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Active membership required'},{status:403});const u=request.nextUrl.clone();u.pathname='/membership-required';return NextResponse.redirect(u)}
 }
 return response
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']}