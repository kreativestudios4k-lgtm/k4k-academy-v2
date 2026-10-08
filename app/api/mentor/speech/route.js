import {experimental_generateSpeech as generateSpeech} from 'ai';
import {gateway} from '@ai-sdk/gateway';
import {createClient} from '../../../../lib/supabase/server';

const voices={core:'Orus',mentor:'Orus',warm:'Orus'};
const locales={'en-US':'English with a refined British accent','en-GB':'English with a refined British accent','pt-BR':'Brazilian Portuguese with a natural Brazilian accent','es-ES':'Spanish with a neutral Latin American accent','es-MX':'Spanish with a neutral Latin American accent'};

export async function POST(request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  try{
    const body=await request.json();
    const text=String(body?.text||'').trim().slice(0,3500);
    const profile=voices[body?.voice]?body.voice:'core';
    const language=locales[body?.language]||'the same language as the text';
    if(!text)return Response.json({error:'No text'},{status:400});
    const result=await generateSpeech({
      model:gateway.speechModel('google/gemini-3.8-flash-lite-tts'),
      text,
      voice:voices[profile]||voices.core,
      instructions:`K4K Core: a distinctive sophisticated male digital assistant voice. Speak in ${language}. Sound composed, subtly deep, elegant, intelligent, precise and reassuring, like a premium cinematic technology concierge. Natural human rhythm, restrained wit, smooth intonation, deliberate but not exaggerated pauses, crisp articulation and gentle warmth. Preserve the language of the supplied text, never translate it. Avoid robotic monotone, metallic effects, overly theatrical delivery or imitation of any named actor or copyrighted character.`,
      outputFormat:'wav'
    });
    return new Response(result.audio.uint8Array,{headers:{'Content-Type':'audio/wav','Cache-Control':'private, max-age=0'}});
  }catch(error){
    console.error('K4K speech error',error);
    return Response.json({error:'Voice generation unavailable'},{status:503});
  }
}