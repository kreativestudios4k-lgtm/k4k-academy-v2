import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {getRoute} from "../../../../../../lib/k4k-provider-routing";
export const runtime="nodejs";
const json=(body:object,status:number)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 const token=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token)return json({error:"Authentication required"},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return json({error:"Authentication unavailable"},503);
 const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return json({error:"Invalid session"},401);
 const {data:paid,error:membershipError}=await sb.rpc("k4k_ericm_has_paid_access");
 if(membershipError||paid!==true)return json({error:"Active membership required"},403);
 if(!(req.headers.get("content-type")||"").toLowerCase().includes("application/json"))return json({error:"JSON required"},415);
 let payload:unknown;try{payload=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return json({error:"Invalid payload"},400);
 const feature=(payload as Record<string,unknown>).feature;
 if(typeof feature!=="string")return json({error:"Feature required"},422);
 const route=getRoute(feature);
 if(!route)return json({error:"Unknown feature"},422);
 return json({status:"not_enabled",feature,provider:route.provider,model:route.model,jobCreated:false,providerCalled:false,creditsCharged:0,message:"K4K APP generation is disabled until provider validation, upload security, cost ceilings and atomic credit reservations are implemented."},409);
}
