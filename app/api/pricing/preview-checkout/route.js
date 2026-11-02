import {NextResponse} from 'next/server';
import {createClient} from '../../../../lib/supabase/server';
import {getPlan} from '../../../../lib/k4k-app-pricing.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const disabled=()=>NextResponse.json({error:'Preview checkout is disabled.'},{status:503,headers:{'Cache-Control':'no-store'}});
export async function POST(request){
 // Intentional hard gates: never run Stripe Checkout on production or with a live secret.
 if(process.env.VERCEL_ENV!=='preview'||process.env.K4K_STRIPE_PREVIEW_ENABLED!=='true')return disabled();
 const key=process.env.K4K_STRIPE_TEST_SECRET_KEY;
 const base=process.env.K4K_PRICING_PREVIEW_URL;
 if(!key?.startsWith('sk_test_')||!base)return disabled();
 let baseUrl;
 try{baseUrl=new URL(base);if(baseUrl.protocol!=='https:'||baseUrl.username||baseUrl.password||baseUrl.search||baseUrl.hash) return disabled();}
 catch{return disabled();}
 // Browser requests can only originate from the configured preview.
 if(request.headers.get('origin')!==baseUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:'Sign in required'},{status:401});
 // Explicit test cohort only. Do not migrate/charge existing subscribers.
 if(user.app_metadata?.k4k_pricing_tester!==true)return NextResponse.json({error:'Not available for this account'},{status:403});
 let body;
 try{body=await request.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
 const plan=getPlan(body?.planId);
 if(!plan)return NextResponse.json({error:'Unknown plan'},{status:400});
 const priceId=process.env['K4K_STRIPE_TEST_PRICE_'+plan.id.toUpperCase()];
 if(!priceId?.startsWith('price_'))return disabled();
 const form=new URLSearchParams({
  mode:'subscription','line_items[0][price]':priceId,'line_items[0][quantity]':'1',
  client_reference_id:user.id,
  'metadata[k4k_plan]':plan.id,
  'subscription_data[metadata][k4k_plan]':plan.id,
  success_url:baseUrl.origin+'/pricing?preview_checkout=success',
  cancel_url:baseUrl.origin+'/pricing?preview_checkout=cancel'
 });
 let response;
 try{response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'},body:form.toString(),cache:'no-store'});}
 catch{return NextResponse.json({error:'Test checkout unavailable'},{status:502});}
 if(!response.ok)return NextResponse.json({error:'Test checkout unavailable'},{status:502});
 const session=await response.json();
 if(typeof session.url!=='string'||!session.url.startsWith('https://checkout.stripe.com/'))return NextResponse.json({error:'Invalid checkout response'},{status:502});
 return NextResponse.json({url:session.url,mode:'test'},{headers:{'Cache-Control':'no-store'}});
}
