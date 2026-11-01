import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const TYPES:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
export async function POST(request:Request){
 const token=request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(!token)return fail("Sign in required",401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return fail("Authentication unavailable",503);
 const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return fail("Invalid session",401);
 const {data:paid,error:membershipError}=await sb.rpc("k4k_ericm_has_paid_access");
 if(membershipError||paid!==true)return fail("Active Academy membership required",403);
 if(!(request.headers.get("content-type")||"").includes("application/json"))return fail("JSON required",415);
 let input:unknown;try{input=await request.json()}catch{return fail("Invalid JSON",400)}
 if(!input||typeof input!=="object"||Array.isArray(input))return fail("Invalid payload",400);
 const body=input as Record<string,unknown>;
 if(typeof body.mimeType!=="string"||!Object.hasOwn(TYPES,body.mimeType))return fail("Use JPG, PNG or WebP images",422);
 if(typeof body.sizeBytes!=="number"||!Number.isSafeInteger(body.sizeBytes)||body.sizeBytes<1||body.sizeBytes>10*1024*1024)return fail("Image must be 10 MB or smaller",422);
 const bucket="studio-references",path=`${user.id}/${crypto.randomUUID()}.${TYPES[body.mimeType]}`;
 const {data,error:uploadError}=await sb.storage.from(bucket).createSignedUploadUrl(path);
 if(uploadError||!data?.token)return fail("Unable to authorize image upload",503);
 return NextResponse.json({bucket,path,token:data.token,mimeType:body.mimeType,maxBytes:10*1024*1024},{headers:{"Cache-Control":"no-store"}});
}
