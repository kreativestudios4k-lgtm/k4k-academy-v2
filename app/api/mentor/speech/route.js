import {experimental_generateSpeech as generateSpeech} from 'ai';
import {gateway} from '@ai-sdk/gateway';
import {createClient} from '../../../../lib/supabase/server';

const voices={core:'Sulafat',mentor:'Sulafat',warm:'Sulafat'};

export async function POST(request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  try{
    const body=await request.json();
    const text=String(body?.text||'').trim().slice(0,3500);
    const profile=voices[body?.voice]?body.voice:'core';
    if(!text)return Response.json({error:'No text'},{status:400});
    const result=await generateSpeech({
      model:gateway.speechModel('google/gemini-3.8-flash-lite-tts'),
      text,
      voice:voices[profile]||voices.core,
      instructions:'Speak like a friendly, experienced human video-production teacher speaking one-to-one with a student. Natural conversational rhythm, relaxed pace, warm confident tone, subtle emotional expression and genuine enthusiasm. Use short organic pauses at punctuation, vary emphasis naturally, and make the speech sound spontaneous rather than read aloud. Avoid robotic precision, monotone delivery, exaggerated cinematic narration, synthetic-sounding cadence, and overacting. Match the language and regional accent of the provided text. Never imitate a specific real person.',
      outputFormat:'wav'
    });
    return new Response(result.audio.uint8Array,{headers:{'Content-Type':'audio/wav','Cache-Control':'private, max-age=0'}});
  }catch(error){
    console.error('K4K speech error',error);
    return Response.json({error:'Voice generation unavailable'},{status:503});
  }
}