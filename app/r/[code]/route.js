import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {REFERRAL_COOKIE,validReferralCode,referralsEnabled} from '../../../lib/server/referral-tracking.mjs';
import {isMatheusCode,exclusivePartner} from '../../../lib/server/matheus-partner.mjs';
export const runtime='nodejs';
export async function GET(request,{params}){
 const {code}=await params;
 const destination=new URL('/k4k-app/register',request.url);
 const response=NextResponse.redirect(destination);
 response.headers.set('Cache-Control','no-store');
 if(!referralsEnabled()||!isMatheusCode(code))return response;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return response;
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{if(!await exclusivePartner(db))return response}catch{return response}
 if(!isMatheusCode(request.cookies?.get(REFERRAL_COOKIE)?.value))response.cookies.set(REFERRAL_COOKIE,code,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*24*60*60});
 return response;
}
