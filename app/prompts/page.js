'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Sparkles,Copy,Check,BookOpen} from 'lucide-react';

const prompts=[
 {title:'Character Sheet · Universal',category:'CHARACTER CONSISTENCY',body:`Create a professional photorealistic multi-angle character reference sheet using my uploaded image(s) as the ONLY identity source.

CHARACTER: [Describe the character and any distinctive details].
IDENTITY LOCK: Preserve the exact face, skin tone, hairstyle, age appearance, natural height and body proportions from the references. Do not invent a new person.
WARDROBE: [Describe clothing, colours, accessories and shoes]. Keep all details consistent in every view.
REQUIRED VIEWS: Full-body front, full-body back, left profile, right profile, three-quarter view and facial close-up.
PRESENTATION: Neutral studio background, clean separated panels, soft even lighting, realistic fabric and skin textures.
NEGATIVE: No extra people, face changes, extra fingers, incorrect logos, inconsistent outfits or warped anatomy.`},
 {title:'Genjutsu · Motion Transfer',category:'VIDEO RECREATION',body:`Use @video as the exact reference for motion, performance, camera angles, timing, lighting and environment. Replace ONLY the designated character with @image1.

CHARACTER LOCK: Keep the replacement character's exact facial identity, hair, skin texture, natural height, body proportions and outfit from @image1 throughout every shot.
PRESERVE: Original shot sequence, camera movement, gestures, timing, interactions, surrounding people, background, transitions, perspective, lighting and natural motion blur.
PHYSICS: Hands, feet, clothing and object interactions must remain physically plausible.
AUDIO: Preserve authorised source audio if supported. Otherwise restore it in editing and check lip sync.
NEGATIVE: No identity drift, body enlargement, morphing, duplicated characters, floating objects, distorted hands or redesigned background.
OUTPUT: Natural live-action realism; maintain the source aspect ratio.`},
 {title:'Cinematic Scene · Direction',category:'CREATIVE PRODUCTION',body:`Create a realistic cinematic video scene.

SUBJECT: [Who is in the scene and what they look like].
LOCATION: [Precise environment, time of day and weather].
ACTION: [Specific natural action, gesture and timing].
CAMERA: [Shot size, lens feel, movement, framing and focus].
LIGHTING: [Direction, quality, practical lights, shadows and colour].
AUDIO: [Dialogue or authorised ambience, if applicable].
CONTINUITY: Preserve the subject's face, wardrobe, body scale and props across every shot.
STYLE: Photorealistic, grounded movement and natural skin texture.
AVOID: Unwanted scene cuts, flicker, warped anatomy, artificial expressions and inconsistent clothing.`},
 {title:'Short-Form Hook · First 3 Seconds',category:'RETENTION & STORYTELLING',body:`Plan a 15–30 second vertical short-form video about [TOPIC] for [AUDIENCE].

0–3s HOOK: Start with a visually surprising action or question. The viewer should understand the premise immediately, even without sound.
3–10s SETUP: Establish the situation using clear visuals and short, natural dialogue.
10–20s PAYOFF: Deliver the twist, transformation or reveal without unnecessary filler.
FINAL 3s: End on a memorable visual or question that invites genuine comments.
CAMERA: Specify framing, movement and cut timing for every beat.
ON-SCREEN TEXT: Keep short, legible and inside platform-safe margins.
QUALITY CHECK: Clear opening, consistent character identity, natural pacing, licensed audio and mobile-first composition.`}
];
export default function Prompts(){
 const [copied,setCopied]=useState(-1);
 async function copy(text,i){try{await navigator.clipboard.writeText(text);setCopied(i);setTimeout(()=>setCopied(-1),2000)}catch{setCopied(-2)}}
 return <main className="vault" style={{minHeight:'100vh'}}>
  <Link href="/academy" className="back"><ArrowLeft/> Back to Academy</Link>
  <div className="kicker" style={{marginTop:60}}><Sparkles/> K4K PROMPT VAULT</div>
  <h1>BUILD BETTER<br/><i>INSTRUCTIONS.</i></h1>
  <p className="vaultlead">Four practical, ready-to-copy prompt templates. Replace the bracketed fields with your own idea and upload the appropriate references before generating.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,360px),1fr))',gap:20,marginTop:35}}>
  {prompts.map((p,i)=><article key={p.title} style={{background:'#101710',border:'1px solid #ffffff2c',borderRadius:16,padding:'clamp(18px,3vw,28px)',minWidth:0}}>
   <small style={{color:'#caff39',fontSize:10,letterSpacing:2,fontWeight:900}}>{String(i+1).padStart(2,'0')} · {p.category}</small>
   <h2 style={{fontSize:25,margin:'15px 0',letterSpacing:'-.04em'}}>{p.title}</h2>
   <pre style={{fontFamily:'inherit',whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:13,lineHeight:1.8,color:'#d4e0cc',padding:18,border:'1px solid #ffffff1d',background:'#090f09',borderRadius:10,maxHeight:350,overflow:'auto'}}>{p.body}</pre>
   <button type="button" onClick={()=>copy(p.body,i)} style={{display:'inline-flex',alignItems:'center',gap:9,marginTop:18,background:'#caff39',color:'#0b1308',border:0,borderRadius:9,padding:'14px 19px',fontWeight:900,cursor:'pointer'}}>{copied===i?<Check size={18}/>:<Copy size={18}/>} {copied===i?'COPIED!':'COPY PROMPT'}</button>
  </article>)}</div>
  {copied===-2&&<p role="alert" style={{color:'#ffc7a0'}}>Clipboard unavailable. Select and copy the prompt text manually.</p>}
  <div style={{marginTop:40,display:'flex',alignItems:'center',gap:10,color:'#b8c7b0'}}><BookOpen size={19} color="#caff39"/> For the complete example and videos, open <Link href="/academy/workflows/viral-character-swap" style={{color:'#caff39',textDecoration:'underline'}}>Workflow 01</Link>.</div>
 </main>;
}