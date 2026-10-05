import {experimental_generateSpeech as generateSpeech} from 'ai';
import {gateway} from '@ai-sdk/gateway';
import {createClient} from '../../../../lib/supabase/server';

const voices={core:'Orus',mentor:'Sadaltager',warm:'Sulafat'};

export async function POST(request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  try{
    const body=await request.json();
    const text=String(body?.text||'').trim().slice(0,3500);
    const profile=voices[body?.voice]?'core':(body?.voice||'core');
    if(!text)return Response.json({error:'No text'},{status:400});
    const result=await generateSpeech({
      model:gateway.speechModel('google/gemini-3.8-flash-lite-tts'),
      text,
      voice:voices[profile]||voices.core,
      instructions:'Original K4K Core instructor voice. Calm, composed, intelligent and cinematic. Clear teaching cadence, subtle futuristic confidence, never imitate or impersonate any existing fictional or real character.',
      outputFormat:'wav'
    });
    return new Response(result.audio.uint8Array,{headers:{'Content-Type':'audio/wav','Cache-Control':'private, max-age=0'}});
  }catch(error){
    console.error('K4K speech error',error);
    return Response.json({error:'Voice generation unavailable'},{status:503});
  }
}