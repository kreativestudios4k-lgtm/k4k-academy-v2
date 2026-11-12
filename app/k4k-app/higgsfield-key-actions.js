'use server';
import {cookies} from 'next/headers';
import {createClient} from '../../lib/supabase/server';
import {HIGGSFIELD_API_KEY_COOKIE,encodeHiggsfieldUserKey,isValidCopiedHiggsfieldKey,decodeHiggsfieldUserKey} from '../../lib/server/higgsfield-user-key.mjs';

async function currentUser(){
 try{
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  return !error&&user&&!user.is_anonymous?user:null;
 }catch{return null}
}
export async function getHiggsfieldKeyStatus(){
 const user=await currentUser();
 if(!user)return {authenticated:false,saved:false};
 const jar=await cookies();
 const saved=Boolean(decodeHiggsfieldUserKey(jar.get(HIGGSFIELD_API_KEY_COOKIE)?.value,user.id));
 return {authenticated:true,saved};
}
export async function saveHiggsfieldApiKey(apiKey){
 const user=await currentUser();
 if(!user)return {ok:false,error:'SIGN_IN_REQUIRED'};
 if(!isValidCopiedHiggsfieldKey(apiKey))return {ok:false,error:'INVALID_KEY'};
 const jar=await cookies();
 jar.set(HIGGSFIELD_API_KEY_COOKIE,encodeHiggsfieldUserKey({userId:user.id,apiKey}),{
  httpOnly:true,
  secure:process.env.NODE_ENV==='production'||process.env.VERCEL_ENV==='preview',
  sameSite:'lax',
  path:'/',
  maxAge:60*60*24*30,
  priority:'high'
 });
 return {ok:true,saved:true};
}
export async function removeHiggsfieldApiKey(){
 const user=await currentUser();
 if(!user)return {ok:false,error:'SIGN_IN_REQUIRED'};
 const jar=await cookies();
 jar.set(HIGGSFIELD_API_KEY_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production'||process.env.VERCEL_ENV==='preview',sameSite:'lax',path:'/',maxAge:0});
 return {ok:true,saved:false};
}
