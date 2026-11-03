import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {getGenerationBetaGate} from '../../../../lib/server/generation-beta-gate.mjs';
export const runtime='nodejs';
export async function GET(request){
 const headers={'Cache-Control':'no-store'};
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return NextResponse.json({invited:false},{status:401,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return NextResponse.json({invited:false},{status:503,headers});
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}={},error}=await client.auth.getUser(token);
 if(error||!user||user.is_anonymous)return NextResponse.json({invited:false},{status:401,headers});
 const gate=getGenerationBetaGate(process.env);
 const ids=(process.env.K4K_GENERATION_BETA_USER_IDS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 const invited=gate.invitedCount<=gate.cohortLimit&&ids.includes(user.id.toLowerCase());
 return NextResponse.json({invited},{status:invited?200:403,headers});
}
