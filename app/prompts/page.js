'use client';
import {useState} from 'react';
import Link from 'next/link';
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
 const [section,setSection]=useState('gallery');
 const [filter,setFilter]=useState('All');
 const [copied,setCopied]=useState('');
 const [error,setError]=useState('');
 const visible=filter==='All'?visualPrompts:visualPrompts.filter(item=>item.category===filter);
 async function copy(body,id){
  setError('');
  try{await navigator.clipboard.writeText(body);setCopied(id)}
  catch{setCopied('');setError('Clipboard unavailable. Select and copy the text manually.')}
 }
 return <main className="promptEditorialPage">
  <a className="vaultSkip" href="#prompt-content">Skip to prompt content</a>
  <nav className="promptEditorialNav"><Link href="/academy"><ArrowLeft size={17}/> BACK TO ACADEMY</Link><Link href="/" className="promptEditorialLogo">K<span>4</span>K <small>ACADEMY</small></Link><span>CREATOR TOOLS / 001</span></nav>
  <section className="promptEditorialHero" id="prompt-content">
   <div className="promptEditorialKicker"><span/> K4K STUDIO EDITIONS · VISUAL CREATION LAB</div>
   <h1>THE ART<br/>OF THE <em>PROMPT.</em></h1>
   <div className="promptEditorialLead"><p>A collection of visual studies built around the K4K masked creator. Study the image, then study the decisions: identity, composition, camera and lighting. The prompt starts the experiment, but your judgement finishes it.</p><div><span>09 EDITORIAL STUDIES</span><span>06 PRACTICAL PROMPT TEMPLATES</span></div></div>
  </section>
  <section className="promptProofBridge" aria-label="How real character references improve production">
   <div className="promptProofImage"><img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/32d483de-7d94-4b63-89c2-454821b2c4d9.png" alt="A K4K four-panel full-body and close-up character reference used in an actual production" loading="lazy"/></div>
   <div><small>REAL CREATOR ASSET / THE FOUR-VIEW REFERENCE</small><h2>ONE FACE.<br/><em>FOUR CHECKS.</em></h2><p>This actual creator reference uses full-body front, full-body profile and two close-up angles. The image is an input: it helps the model, but does not guarantee consistency by itself.</p>
    <ol><li>Choose a face with permission or use your own.</li><li>Check the same glasses, haircut and body scale across panels.</li><li>Save the character sheet alongside the exact video prompt.</li><li>Inspect the output whenever the camera changes angle.</li></ol>
    <Link href="/academy/method">LEARN THE FRAME METHOD <ArrowUpRight size={18}/></Link>
   </div>
  </section>
  <section className="promptEditorialLibrary">
   <div className="promptEditorialTabs" role="group" aria-label="Choose prompt collection">
    <button type="button" className={section==='gallery'?'selected':''} aria-pressed={section==='gallery'} onClick={()=>setSection('gallery')}><ImageIcon size={16}/> VISUAL PROMPT COLLECTION <span>09</span></button>
    <button type="button" className={section==='workflows'?'selected':''} aria-pressed={section==='workflows'} onClick={()=>setSection('workflows')}><BookOpen size={16}/> PRODUCTION PROMPTS <span>06</span></button>
   </div>
   {section==='gallery'?<>
    <div className="promptEditorialSectionInfo"><div><small>STUDIO COLLECTION / 2026</small><h2>NINE STUDIES.<br/>ONE CREATIVE IDENTITY.</h2></div><p>The same signature masked creator, reimagined through lighting, composition, motion and art direction. Each image opens a fully copyable production brief.</p></div>
    <div className="promptFilterBar" aria-label="Filter gallery by style">{filters.map(value=><button type="button" key={value} className={filter===value?'selected':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value.toUpperCase()}</button>)}</div>
    <div className="promptEditorialGrid">{visible.map((item)=><article className="promptEditorialCard" key={item.id}>
     <div className="promptEditorialArt"><img src={item.src} width="660" height="825" loading="lazy" alt={item.alt}/><span className="promptArtCounter">K4K / {item.id}</span></div>
     <div className="promptEditorialCardContent"><small>{item.category.toUpperCase()} · EDITORIAL STUDY {item.id}</small><div className="promptEditorialTitleLine"><h3>{item.title}</h3><ArrowUpRight size={19}/></div><p>{item.caption}</p>
      <details className="promptEditorialDetails"><summary>REVEAL THE PROMPT <ChevronDown size={17}/></summary><div className="promptEditorialPrompt"><p>{item.body}</p><button type="button" onClick={()=>copy(item.body,'gallery-'+item.id)}>{copied==='gallery-'+item.id?<Check size={17}/>:<Copy size={17}/>} {copied==='gallery-'+item.id?'COPIED TO CLIPBOARD':'COPY THIS PROMPT'}</button></div></details>
     </div>
    </article>)}</div>
    <p className="promptGalleryDisclaimer">IMAGE STUDIES ARE VISUAL EXAMPLES, NOT GUARANTEED GENERATION OUTPUTS. UPLOAD AN AUTHORISED CHARACTER REFERENCE AND ADAPT THE PROMPT TO YOUR OWN IDEA. THIRD-PARTY TOOL COSTS MAY APPLY.</p>
   </>:<>
    <div className="promptEditorialSectionInfo"><div><small>YOUR PRODUCTION FOUNDATION</small><h2>BUILT FOR<br/>REAL WORKFLOWS.</h2></div><p>Six practical templates covering character references, motion transfer, cinematic scenes, short-form structure, realistic skin and frame-by-frame quality review. Adapt the inputs, then check the result.</p></div>
    <div className="promptCoreGrid">{corePrompts.map((item,index)=><article key={item.title} className="promptCoreCard"><small>CORE / {String(index+1).padStart(2,'0')} · {item.category}</small><h3>{item.title}</h3><pre>{item.body}</pre><button type="button" onClick={()=>copy(item.body,'core-'+index)}>{copied==='core-'+index?<Check size={17}/>:<Copy size={17}/>} {copied==='core-'+index?'COPIED':'COPY PROMPT'}</button></article>)}</div>
   </>}
   {error&&<p role="alert" className="promptCopyError">{error}</p>}
  </section>
  <section className="promptEditorialClosing"><span>K4K ACADEMY / THE CREATOR METHOD</span><h2>FROM PROMPT<br/>TO <em>PRODUCTION.</em></h2><div><p>Want the full video breakdown, references and step-by-step workflow?</p><Link href="/academy/workflows/viral-character-swap">EXPLORE WORKFLOW 01 <ArrowUpRight size={18}/></Link></div></section>
  <footer className="promptEditorialFooter"><Link href="/academy">← PRIVATE ACADEMY</Link><span>© 2026 KREATIVE STUDIOS 4K</span><Link href="/">KREATIVESTUDIOS4K.COM</Link></footer>
  <style>{`
    .promptProofBridge{max-width:1600px;margin:0 auto;padding:70px clamp(20px,5vw,74px);display:grid;grid-template-columns:.95fr 1.05fr;gap:clamp(25px,5vw,85px);align-items:center;border-top:1px solid #ffffff29;border-bottom:1px solid #ffffff29;background:radial-gradient(ellipse at 18% 65%,#1838675d,transparent 70%)}.promptProofImage{border:1px solid #ffffff3e;border-radius:20px;background:#0b101a;overflow:hidden}.promptProofImage img{width:100%;display:block;max-height:500px;object-fit:contain}.promptProofBridge small{font-size:10px;color:#baff45;letter-spacing:.18em;font-weight:900}.promptProofBridge h2{font-size:clamp(43px,6vw,88px);letter-spacing:-.08em;line-height:.92;margin:25px 0}.promptProofBridge h2 em{font-style:normal;color:transparent;-webkit-text-stroke:1px #fff}.promptProofBridge p{font-size:15px;line-height:1.8;color:#bbc9d8}.promptProofBridge ol{padding-left:21px;color:#d6e2f2;line-height:1.8;font-size:13px}.promptProofBridge li{margin-bottom:7px}.promptProofBridge a{display:inline-flex;align-items:center;gap:12px;border:1px solid #ffffff5e;border-radius:99px;padding:17px 20px;font-size:11px;font-weight:900;margin-top:18px}
    @media(max-width:780px){.promptProofBridge{grid-template-columns:1fr}.promptProofImage img{max-height:420px}}
    .promptEditorialPage{color:#f3f5f7;background:#06080c;min-height:100vh;font-family:Arial,Helvetica,sans-serif;overflow:hidden}.promptEditorialPage *{box-sizing:border-box}.promptEditorialPage a{text-decoration:none}.promptEditorialPage :is(button,a,summary):focus-visible{outline:2px solid #caff39;outline-offset:4px}
    .vaultSkip{position:absolute;left:16px;top:-200px;background:#caff39;color:#070907;padding:12px 18px;z-index:100}.vaultSkip:focus{top:16px}
    .promptEditorialNav{padding:25px clamp(20px,5vw,74px);display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #ffffff30;max-width:1600px;margin:auto}.promptEditorialNav>a:first-child{display:flex;align-items:center;gap:9px;color:#e3eaf4;font-size:10px;font-weight:800;letter-spacing:.12em}.promptEditorialNav>span{color:#8797a9;font-size:9px;letter-spacing:.17em}.promptEditorialLogo{font-size:24px;color:#fff;font-weight:900;letter-spacing:-.08em;white-space:nowrap}.promptEditorialLogo span{color:#caff39}.promptEditorialLogo small{font-size:12px;letter-spacing:.2em;font-weight:700;margin-left:6px}
    .promptEditorialHero{max-width:1600px;margin:auto;padding:clamp(70px,9vw,135px) clamp(20px,5vw,74px) 80px;background:radial-gradient(ellipse 45% 55% at 80% 47%,#13396788,transparent 84%)}.promptEditorialKicker{font-size:10px;font-weight:900;letter-spacing:.2em;color:#b9c9dc;display:flex;align-items:center;gap:12px}.promptEditorialKicker>span{display:block;width:7px;height:7px;border-radius:50%;background:#caff39;box-shadow:0 0 15px #caff3955}
    .promptEditorialHero h1{font-size:clamp(64px,10vw,165px);font-weight:900;line-height:.82;letter-spacing:-.095em;margin:42px 0}.promptEditorialHero h1 em{color:transparent;-webkit-text-stroke:1.5px #f0f7fe;font-style:normal}
    .promptEditorialLead{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;border-top:1px solid #ffffff35;padding-top:25px}.promptEditorialLead>p{max-width:570px;color:#adbed1;font-size:clamp(14px,1.4vw,18px);line-height:1.85;margin:0}.promptEditorialLead>div{display:flex;gap:25px;flex-wrap:wrap;justify-content:flex-end}.promptEditorialLead>div span{font-size:10px;font-weight:800;letter-spacing:.09em;color:#c7d4e4}
    .promptEditorialLibrary{max-width:1600px;margin:auto;padding:20px clamp(20px,5vw,74px) 130px}
    .promptEditorialTabs{border-bottom:1px solid #ffffff3b;display:flex;gap:35px;flex-wrap:wrap}.promptEditorialTabs button{display:inline-flex;align-items:center;gap:12px;border:0;border-bottom:2px solid transparent;color:#9aa7b8;background:transparent;padding:22px 3px;cursor:pointer;font-size:11px;font-weight:900;letter-spacing:.07em}.promptEditorialTabs button.selected{color:white;border-bottom-color:#caff39}.promptEditorialTabs button span{border:1px solid #ffffff3c;border-radius:99px;padding:4px 8px;color:#caff39;font-size:9px}
    .promptEditorialSectionInfo{display:flex;align-items:end;justify-content:space-between;gap:36px;padding:68px 0 36px}.promptEditorialSectionInfo small{font-size:9px;color:#caff39;letter-spacing:.18em;font-weight:900}.promptEditorialSectionInfo h2{font-size:clamp(38px,5vw,76px);font-weight:900;letter-spacing:-.07em;line-height:.94;margin:20px 0 0}.promptEditorialSectionInfo>p{font-size:14px;line-height:1.8;color:#afbed0;max-width:360px;margin:0}
    .promptFilterBar{display:flex;flex-wrap:wrap;gap:9px;margin:10px 0 26px}.promptFilterBar button{border:1px solid #ffffff3b;border-radius:99px;padding:11px 17px;font-size:10px;letter-spacing:.08em;font-weight:800;color:#bacbde;background:#ffffff09;cursor:pointer}.promptFilterBar button.selected{color:#060806;background:#caff39;border-color:#caff39}
    .promptEditorialGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:start}.promptEditorialCard{min-width:0;background:linear-gradient(140deg,#161d29,#0d111a);border:1px solid #ffffff31;border-radius:16px;overflow:hidden;transition:border-color .2s,transform .2s}.promptEditorialCard:hover{border-color:#a8caff9d;transform:translateY(-2px)}
    .promptEditorialArt{position:relative;overflow:hidden;background:#172232}.promptEditorialArt img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;filter:saturate(.93)}.promptArtCounter{position:absolute;top:16px;left:16px;background:#0b1018cd;border:1px solid #ffffff6b;padding:8px 10px;border-radius:99px;font-size:9px;font-weight:800;letter-spacing:.13em}
    .promptEditorialCardContent{padding:24px}.promptEditorialCardContent>small{color:#9eb6d0;font-weight:900;font-size:9px;letter-spacing:.18em}.promptEditorialTitleLine{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:12px 0 8px}.promptEditorialTitleLine h3{font-size:clamp(24px,2.5vw,38px);line-height:1;letter-spacing:-.06em;margin:0}.promptEditorialTitleLine svg{color:#caff39}.promptEditorialCardContent>p{font-size:12px;color:#b6c4d3;line-height:1.6}
    .promptEditorialDetails{margin-top:26px;border-top:1px solid #ffffff33}.promptEditorialDetails summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:9px;cursor:pointer;color:#caff39;font-size:11px;font-weight:900;letter-spacing:.07em;padding:19px 0 0}.promptEditorialDetails summary::-webkit-details-marker{display:none}.promptEditorialDetails[open] summary svg{transform:rotate(180deg)}.promptEditorialPrompt{padding-top:17px}.promptEditorialPrompt>p{font-size:12px;line-height:1.9;color:#d0dae7;white-space:pre-wrap;margin:0 0 18px}.promptEditorialPrompt button,.promptCoreCard button{display:inline-flex;align-items:center;gap:9px;border:0;background:#caff39;color:#081009;border-radius:99px;padding:13px 17px;font-size:11px;font-weight:900;cursor:pointer}
    .promptGalleryDisclaimer{color:#8594a7;font-size:9px;letter-spacing:.1em;line-height:1.9;max-width:950px;margin:34px 0}
    .promptCoreGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.promptCoreCard{min-width:0;border:1px solid #ffffff35;border-radius:19px;background:#131924;padding:clamp(21px,3vw,33px)}.promptCoreCard>small{font-size:10px;color:#caff39;letter-spacing:.12em;font-weight:900}.promptCoreCard h3{font-size:clamp(24px,3vw,37px);letter-spacing:-.055em;line-height:1.05;margin:17px 0}.promptCoreCard pre{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere;color:#bdcbdc;background:#0a0e16;border:1px solid #ffffff27;padding:20px;border-radius:11px;font-size:13px;line-height:1.85;max-height:390px;overflow:auto}.promptCoreCard button{margin-top:18px}.promptCopyError{color:#ffcbad;line-height:1.7}
    .promptEditorialClosing{padding:90px clamp(20px,7vw,105px) 100px;background:radial-gradient(ellipse at 70% 95%,#18376497,transparent 60%),#09111b;border-top:1px solid #ffffff26}.promptEditorialClosing>span{font-size:10px;color:#caff39;letter-spacing:.21em}.promptEditorialClosing h2{font-size:clamp(55px,10vw,140px);letter-spacing:-.09em;line-height:.89;margin:35px 0}.promptEditorialClosing h2 em{font-style:normal;color:transparent;-webkit-text-stroke:1px #fff}.promptEditorialClosing>div{display:flex;align-items:center;justify-content:space-between;gap:30px}.promptEditorialClosing p{color:#b9c9da;font-size:14px;line-height:1.8;max-width:340px}.promptEditorialClosing a{display:inline-flex;align-items:center;gap:15px;padding:17px 22px;background:#caff39;color:#080c07;border-radius:99px;font-size:11px;font-weight:900}
    .promptEditorialFooter{max-width:1600px;padding:32px clamp(20px,5vw,74px);margin:auto;display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;color:#9aa8b8;border-top:1px solid #ffffff27;font-size:10px;letter-spacing:.1em}.promptEditorialFooter a{color:#dbe5ef}
    @media(max-width:1100px){.promptEditorialGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:720px){.promptEditorialHero{padding-top:67px}.promptEditorialHero h1{font-size:clamp(61px,12vw,87px)}.promptEditorialLead,.promptEditorialSectionInfo{display:block}.promptEditorialLead>div{justify-content:flex-start;margin-top:27px}.promptEditorialSectionInfo>p{max-width:550px;margin-top:22px}.promptEditorialGrid{gap:14px}.promptEditorialCardContent{padding:18px}.promptEditorialNav>span{display:none}.promptCoreGrid{grid-template-columns:1fr}.promptEditorialClosing>div{display:block}.promptEditorialClosing a{margin-top:20px}}
    @media(max-width:540px){.promptEditorialNav{padding:23px 18px}.promptEditorialNav>a:first-child{font-size:9px}.promptEditorialLogo{font-size:20px}.promptEditorialLogo small{font-size:9px}.promptEditorialHero{padding:60px 18px 55px}.promptEditorialHero h1{font-size:clamp(56px,13vw,76px);margin:29px 0}.promptEditorialLibrary{padding:12px 18px 85px}.promptEditorialTabs{gap:20px}.promptEditorialTabs button{font-size:9px;gap:7px}.promptEditorialSectionInfo{padding:50px 0 32px}.promptEditorialSectionInfo h2{font-size:46px}.promptEditorialGrid{grid-template-columns:1fr}.promptEditorialCardContent{padding:22px}.promptEditorialTitleLine h3{font-size:32px}.promptEditorialClosing{padding:72px 20px}.promptEditorialClosing h2{font-size:clamp(55px,13vw,81px)}}
    @media(prefers-reduced-motion:reduce){.promptEditorialPage *{transition:none!important;scroll-behavior:auto!important}}
  `}</style>
 </main>;
}
