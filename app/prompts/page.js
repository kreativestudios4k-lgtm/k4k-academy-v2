'use client';
import {useState} from 'react';
import Link from 'next/link';
import {IdeaHeader,IdeaFooter,IdeaKicker,IdeaLink} from '../components/IdeaUI';

import {ArrowLeft,ArrowUpRight,Copy,Check,BookOpen,ChevronDown,Image as ImageIcon} from 'lucide-react';

const corePrompts=[
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
,
 {title:'Portrait Texture · No Beauty Filter',category:'PHOTOREALISM',body:`Use the uploaded adult portrait as the only identity reference. Preserve their actual face, hairstyle, glasses, age appearance, facial hair, proportions and natural skin tone.

GOAL: Improve authentic photographic texture without changing identity.
SKIN: Irregular naturally distributed pores, fine facial hair, realistic beard stubble, subtle pigmentation variation, fine creases and realistic lip texture. Correct eyelids, catchlights and surface reflections.
LIGHTING: Soft directional natural light, accurate shadow falloff, restrained specular highlights, physically plausible skin translucency and subtle film grain.
KEEP: Same camera angle, clothing, expression, environment and framing.
REVIEW: Compare the new image with the original around eyebrows, nose, lips, spectacles and hairline.
AVOID: Waxy CGI, excessive sharpening, artificial uniform pores, beauty smoothing or face reshaping.

Photorealism must not be misrepresented as an untouched documentary photograph.`},
 {title:'QA Review · Fix the Weak Frame',category:'ITERATION & QC',body:`Act as a production quality-control reviewer for an AI-generated image or video and its authorised reference.

INPUTS: [SOURCE IMAGE/VIDEO], [AI RESULT], [THE PROMPT AND SETTINGS USED].
TASK: Compare the same moments or angles. Do NOT assume the generation succeeded.

CHECK THESE:
1. Face and identity drift, eyewear, hairstyle, outfit and body scale.
2. Hands, feet, ball or object contact, limb anatomy and background interactions.
3. Camera position, lens perspective, lighting direction and motion timing.
4. Unwanted cuts, missing speech, inaccurate lip sync or sound glitches.
5. Source and music usage permissions, export format and disclosure.

RETURN: A short table with (timestamp or region), what is wrong, severity, which input is relevant, one precise correction, and how to verify it. Recommend changing one variable at a time. If the model cannot guarantee a fix, say so.

Never invent quality scores or claim to see frames you were not given.`}
];

const visualPrompts=[
  {
    "id": "01",
    "slug": "01-monochrome-editorial",
    "category": "Portrait",
    "title": "Monochrome Identity",
    "caption": "The portrait is the message.",
    "src": "/prompts/01-monochrome-editorial.webp",
    "alt": "Masked K4K creator in a high-collar black jacket and glasses against a white editorial background",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a photorealistic, luxury black-and-white fashion portrait of this exact masked creator in a structured black high-collar technical jacket. Frontal waist-up composition, level camera, direct intense eye contact, pure off-white seamless studio background, medium-format portrait lens feel, clean sculptural highlights, deep fabric shadows, razor-sharp eyes and glasses, natural authentic material texture, restrained fine-grain editorial finish. Prioritise intelligent negative space, graphic contrast and sophisticated magazine-cover composition. No invented facial features, no unwanted branding, no other people."
  },
  {
    "id": "02",
    "slug": "02-teal-editorial",
    "category": "Portrait",
    "title": "Teal Focus",
    "caption": "Make the colour do the work.",
    "src": "/prompts/02-teal-editorial.webp",
    "alt": "Cinematic K4K masked creator portrait against a rich teal green background",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a chest-up cinematic studio portrait with the subject wearing a fine-knit black turtleneck and black balaclava, rectangular black glasses preserved. Deep petrol-teal monochrome backdrop, subtle teal rim lighting, soft key light from upper left, realistic texture in dark clothing, layered tonal contrast and gently falling background light. Direct confident gaze, simple centered composition, premium artistic campaign aesthetic. Shot as a 70–85mm studio portrait, photorealistic, carefully controlled exposure, shallow depth of field. No extra accessories, no identity drift, no artificial glow or overprocessed skin."
  },
  {
    "id": "03",
    "slug": "03-orange-teal-portrait",
    "category": "Creative",
    "title": "Colour Collision",
    "caption": "Two tones. One visual identity.",
    "src": "/prompts/03-orange-teal-portrait.webp",
    "alt": "K4K masked creator in teal outerwear with vivid orange and teal graphic colour blocking",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create an ultra-clean high-fashion colour-block portrait, featuring a vivid saturated orange background and cool deep-teal treatment on the subject. The K4K masked creator wears a dark technical high-collar jacket, black rectangular glasses with luminous warm orange lens reflections, understated silver chain. Frontal medium close-up, composed powerful expression through the visible eyes, balanced negative space, minimal hard shadows, crisp fashion campaign geometry, sculptural lighting and print-ready contrast. Preserve accurate clothing construction and natural pose; never change the source identity or use unrelated brand logos."
  },
  {
    "id": "04",
    "slug": "04-still-in-motion",
    "category": "Motion",
    "title": "Still in Motion",
    "caption": "Freeze the subject. Move the world.",
    "src": "/prompts/04-still-in-motion.webp",
    "alt": "K4K masked creator stays sharply in focus as surrounding figures streak with cinematic motion blur",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a cinematic street-fashion portrait in a bright minimalist gallery corridor. The reference character stands perfectly still in a matte black oversized coat, facing the camera with steady intense eye contact, sharply rendered eyes, glasses and knit mask. Four anonymous adult passersby move around the subject with physically plausible long-exposure motion blur, as though a slow shutter captured their movement. Cool pale daylight, subtly muted analog-film palette, 50mm street-editorial framing, shallow depth and refined negative space. Keep the central person completely sharp; blur only moving bystanders. No duplicated subject, no fake limbs or warped anatomy."
  },
  {
    "id": "05",
    "slug": "05-football-locker",
    "category": "Football",
    "title": "Before Kick-Off",
    "caption": "Silence before the moment.",
    "src": "/prompts/05-football-locker.webp",
    "alt": "Masked K4K football creator seated in an atmospheric locker room holding a vintage brown football",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a premium photorealistic football campaign portrait of the K4K masked creator sitting naturally on a wooden changing-room bench, holding an old brown leather football with both hands. Wear a black and dark-navy football-style training kit with discreet yellow accents and black base layers. Authentic metal lockers, a hanging kit and realistic locker-room wear in the background. Warm dramatic side lighting, faint atmospheric haze, confident direct eye contact, 50mm cinematic framing, natural posture and scale, tactile jersey fabric, restrained film grain, deep shadow detail. No extra fingers, no invented player identity, no impossible ball grip."
  },
  {
    "id": "06",
    "slug": "06-football-motion",
    "category": "Motion",
    "title": "Motion / 001",
    "caption": "Energy in every frame.",
    "src": "/prompts/06-football-motion.webp",
    "alt": "Black-and-white action photo of the masked K4K character dribbling a football with dramatic motion blur",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a striking monochrome sports-editorial action photograph of the masked creator dribbling a football on a minimal pale seamless studio background. Preserve the exact character identity from the uploaded reference while dressing them in black technical sportswear. Dynamic low-angle 24–35mm perspective, athletic balance, physically believable contact between foot and ball, fast controlled movement. Apply intentional directional motion blur only to the moving legs, ball and trailing fabric; keep the eyes, eyewear and upper torso readable. High-contrast black-and-white tonal range, realistic fabric folds, contemporary sports campaign energy. No motion-distorted face, duplicated limbs, floating football or extra athletes."
  },
  {
    "id": "07",
    "slug": "07-football-editorial",
    "category": "Football",
    "title": "Beyond the Pitch",
    "caption": "The creator is the campaign.",
    "src": "/prompts/07-football-editorial.webp",
    "alt": "K4K Academy masked football character in white custom kit seated beside a ball in front of a goal",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a world-class modern football editorial on a full-sized natural-green playing pitch. The K4K masked creator is seated beside the goal, one knee raised, resting a hand naturally on a clean white football, wearing a premium white football-inspired kit with minimalist gold detailing and an original, non-licensed K4K emblem. Include a visible net, distant stadium structure and diffused overcast daylight. Use a low wide-angle camera perspective with one boot closer to the lens, natural football scale and convincing materials. Luxurious sports photography, polished yet realistic, subtle film grain and tactile skin/cloth details. No club trademarks, no altered proportions and no surreal ball geometry."
  },
  {
    "id": "08",
    "slug": "08-football-campaign",
    "category": "Football",
    "title": "The Number 10",
    "caption": "A story behind the shirt.",
    "src": "/prompts/08-football-campaign.webp",
    "alt": "K4K masked creator holding a white ball in a dark locker room with a number 10 jersey hanging behind",
    "body": "Use the uploaded K4K masked-creator character reference as the face and identity source. Maintain the same black balaclava silhouette, rectangular black glasses, visible eyes, realistic head and body proportions. Do not reveal or invent a new face. Create a moody, high-end football locker-room portrait. The masked K4K character sits centered on a dark bench holding a white-and-navy patterned football securely, wearing an original deep navy and burgundy football-inspired jersey. A coordinated number 10 shirt hangs directly behind the character as a cinematic focal point; avoid copying an existing club badge. Symmetrical composition with architectural lockers, cool shadows, a narrow warm practical light above, subtle haze and realistic ball and fabric details. Direct eye contact, natural body scale, high cinematic dynamic range, premium editorial campaign finish. No facial identity changes or malformed hands."
  },
  {
    "id": "09",
    "slug": "09-still-life",
    "category": "Creative",
    "title": "Signature Details",
    "caption": "Build an identity without a face.",
    "src": "/prompts/09-still-life.webp",
    "alt": "Editorial flat-lay of a crystal glass, black glasses, metal chain and K4K dark-blue sports jersey in hard sunlight",
    "body": "Create a luxurious ultra-photorealistic product-style still life representing a mysterious AI creator without showing a person. Arrange a heavy cut-crystal tumbler containing a deep ruby-red non-alcoholic botanical drink, black rectangular eyewear, a polished silver chain and a folded dark navy sports jersey with restrained golden details on a textured stone tabletop. One strong narrow beam of late-afternoon sunlight creates a distinctive long diagonal shadow. Rich glass refraction, sharp jewelry texture, highly controlled reflections, cinematic black levels, subtle editorial grain and clean composition with negative space. No readable brand logos, no hands, no floating objects and no clutter."
  }
];
const filters=['All','Portrait','Creative','Motion','Football'];

export default function Prompts(){
 const[tab,setTab]=useState('workflows');
 const[filter,setFilter]=useState('All');
 const[copied,setCopied]=useState('');
 const[error,setError]=useState('');
 const items=filter==='All'?visualPrompts:visualPrompts.filter(item=>item.category===filter);
 async function copy(value,key){try{await navigator.clipboard.writeText(value);setCopied(key);setError('')}catch{setError('Clipboard permission unavailable. You can select the text and copy it manually.')}}
 return <main className="ideaPage"><IdeaHeader privateArea/><div className="idea-wrap">
 <header className="idea-subhero"><IdeaKicker>K4K ACADEMY / CREATIVE TOOLKIT</IdeaKicker><h1 className="idea-display">THE PROMPT<br/>IS <em>NOT</em><br/>THE FINISH.</h1><p>The library isn't a secret shortcut. It's a set of real production instructions designed to help you direct, test and correct your own projects. Every prompt is editable and reusable.</p></header>
 <section className="idea-section" style={{paddingTop:15}}><div className="idea-marker"><span>01 / CHOOSE YOUR WORKSPACE</span><span>TEXT FIRST / ZERO MEDIA EMBEDS</span></div>
 <div style={{display:'flex',gap:13,alignItems:'center',flexWrap:'wrap',padding:'35px 0 45px'}}>
  <button type="button" className={tab==='workflows'?'idea-button':'idea-button idea-outline'} onClick={()=>setTab('workflows')}>PRODUCTION TEMPLATES ({corePrompts.length})</button>
  <button type="button" className={tab==='editorial'?'idea-button':'idea-button idea-outline'} onClick={()=>setTab('editorial')}>EDITORIAL BRIEFS ({visualPrompts.length})</button>
 </div>
 {tab==='workflows'?<>
  <div className="idea-section-header" style={{marginTop:0}}><h2 className="idea-display">MAKE IT<br/><em>REPEATABLE.</em></h2><p>Core templates for character sheets, video motion, scenes, opening hooks, skin realism and revision notes. Replace placeholders, check usage rights, and review every output.</p></div>
  <div className="idea-prompt-grid">{corePrompts.map((p,i)=><article key={p.title} className="idea-prompt-card"><div className="idea-eyebrow">TEMPLATE / {String(i+1).padStart(2,'0')} · {p.category}</div><h3>{p.title}</h3><p style={{fontSize:13,lineHeight:1.8,color:'#acaca4'}}>This is a working starting point. Adapt your inputs and review the result before accepting it.</p><pre>{p.body}</pre><button type="button" onClick={()=>copy(p.body,'core'+i)}>{copied==='core'+i?<Check size={16}/>:<Copy size={16}/>} {copied==='core'+i?'COPIED TO CLIPBOARD':'COPY FULL PROMPT'}</button></article>)}</div>
 </>:<>
  <div className="idea-section-header" style={{marginTop:0}}><h2 className="idea-display">WRITE THE<br/><em>VISUAL BRIEF.</em></h2><p>Nine creative briefs drawn from earlier K4K visual studies. The actual images have been removed from this website. Learn to describe lighting, framing and material choices without depending on thumbnails.</p></div>
  <div style={{display:'flex',flexWrap:'wrap',gap:9,padding:'0 0 28px'}}>{filters.map(x=><button type="button" key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)} className={filter===x?'idea-button':'idea-button idea-outline'} style={{minHeight:38,padding:'9px 14px',fontSize:10}}>{x.toUpperCase()}</button>)}</div>
  <div className="idea-prompt-grid">{items.map(p=><article className="idea-prompt-card" key={p.slug}><div className="idea-eyebrow">CREATIVE BRIEF / {p.id} · {p.category}</div><h3>{p.title}</h3><p style={{fontSize:15,lineHeight:1.8,color:'#c3c3bc'}}>{p.caption}</p><details><summary className="idea-utility" style={{cursor:'pointer'}}>READ THE PRODUCTION BRIEF +</summary><pre>{p.body}</pre></details><button type="button" style={{marginTop:25}} onClick={()=>copy(p.body,'visual'+p.id)}>{copied==='visual'+p.id?<Check size={16}/>:<Copy size={16}/>} {copied==='visual'+p.id?'COPIED TO CLIPBOARD':'COPY FULL PROMPT'}</button></article>)}</div>
 </>}
 {error&&<p role="alert" className="idea-note" style={{color:'#ffbca2'}}>{error}</p>}
 </section>
 <section className="idea-section" style={{paddingTop:10}}><div className="idea-ethics"><div><IdeaKicker>PRODUCTION RULE</IdeaKicker><h3>YOUR INPUT<br/>IS YOUR JOB.</h3></div><div><p className="idea-body">Use consented images, properly licensed footage and original ideas. A prompt is not proof of quality: always examine the actual result, record model settings and make corrections. The original visual assets remain outside the redesigned site.</p><IdeaLink href="/academy/method" variant="outline">FOLLOW THE IDEA METHOD</IdeaLink></div></div></section>
 </div><IdeaFooter privateArea/></main>;
}