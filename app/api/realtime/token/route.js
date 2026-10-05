import {gateway} from '@ai-sdk/gateway';
import {createClient} from '../../../../lib/supabase/server';

export async function POST(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  try{
    const {token,url}=await gateway.experimental_realtime.getToken({model:'google/gemini-3.8-live'});
    return Response.json({token,url,tools:[]});
  }catch(error){
    console.error('K4K realtime token error',error);
    return Response.json({error:'Realtime voice unavailable'},{status:503});
  }
}