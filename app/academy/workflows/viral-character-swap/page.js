'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ArrowLeft,Check,Copy,Download,Play,Sparkles,Video} from 'lucide-react';

const characterPrompt=`Using the uploaded person as the sole identity reference, create a professional character reference sheet while preserving the subject's facial structure, skin tone, hairstyle, body proportions and distinctive physical characteristics.

Show consistent front, back, left/right profile, three-quarter portrait, full-body and close facial views. Maintain exactly the same character identity across every panel. Preserve the requested wardrobe consistently across the sheet.

Use a neutral studio background, clean even lighting, realistic proportions and high-detail facial consistency. Do not invent facial features, change hairstyle, alter apparent age, or add accessories unless they exist in the supplied reference.`;

const genjutsuPrompt=`Use the uploaded video as the primary motion, performance, composition and camera reference.

Replace only the designated principal character with the person shown in the supplied character reference.

Preserve the reference character's facial identity, facial proportions, hairstyle, skin tone, body proportions, wardrobe and distinctive visual features consistently throughout the entire sequence.

Match the original actor's body movement, positioning, gestures, timing, orientation and interaction with surrounding people. Preserve the original video's camera movement, handheld motion, framing, perspective changes, scene timing, environment, lighting, background people and overall energy.

Keep the replacement character recognisable as the same person from beginning to end and from every camera angle. Do not add facial hair, glasses, hats, jewellery, accessories or wardrobe changes unless visible in the character reference. Do not replace unrelated background people or redesign the environment.

Avoid face morphing, identity drift, duplicate characters, warped hands, altered clothing, artificial skin, floating objects or unnecessary camera changes.`;

const originalVideo='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/3811fa21-621f-4789-8139-7e2c4df44b51.mp4';
const aiVideo='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/0d93077d-a152-4824-af6d-86e38bc6a6cd.mp4';

function CopyPrompt({title,text}){const[copied,setCopied]=useState(false);async function copy(){await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1500)}return <article className="promptCard"><div><small>K4K PROMPT</small><h3>{title}</h3></div><pre>{text}</pre><button onClick={copy}><Copy/>{copied?'COPIED':'COPY PROMPT'}</button></article>}

export default function WorkflowOne(){return <main className="workflowPage">
<Link className="back" href="/academy"><ArrowLeft/> Back to Academy</Link>
<section className="workflowHero"><div className="kicker"><Sparkles/> K4K WORKFLOW 001</div><h1>RECREATE A VIRAL VIDEO<br/><i>WITH YOUR OWN CHARACTER.</i></h1><p>Follow each beginner-friendly step: find a reference video, prepare your character, generate a prompt and review your result. This lesson currently uses ready-to-copy prompts; automatic AI video analysis is coming later.</p><div className="workflowStats"><span><b>3.8M</b> views</span><span><b>244K</b> likes</span><span><b>74K</b> shares</span><span><b>14K</b> saves</span></div></section>

<section className="lessonVideo" style={{display:"block"}}>
 <div style={{marginBottom:22}}><small style={{color:"#caff39",fontWeight:900,letterSpacing:2}}>WATCH BOTH VIDEOS · WORKFLOW 001</small><h2 style={{margin:"10px 0",fontSize:"clamp(24px,4vw,38px)"}}>ORIGINAL VIDEO <span style={{color:"#caff39"}}>VS.</span> AI RECREATION</h2><p style={{color:"#b9c7b4",lineHeight:1.7}}>Watch the original clip first, then play the AI recreation. Compare camera movement, character identity, expressions and timing before following the steps below.</p></div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:18}}>
  <article style={{border:"1px solid #ffffff29",borderRadius:14,overflow:"hidden",background:"#111711"}}>
   <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><strong style={{fontSize:13}}>01 · ORIGINAL REFERENCE</strong><span style={{fontSize:11,color:"#caff39"}}>46 SECONDS</span></div>
   <video controls playsInline preload="metadata" aria-label="Original reference video" style={{display:"block",width:"100%",maxHeight:460,background:"#000"}}><source src={originalVideo} type="video/mp4"/>Your browser does not support video.</video>
   <p style={{padding:"13px 16px",fontSize:12,lineHeight:1.6,color:"#b9c7b4",margin:0}}>Study the original actions, performance, environment and camera movement.</p>
  </article>
  <article style={{border:"1px solid #caff3955",borderRadius:14,overflow:"hidden",background:"#111711"}}>
   <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><strong style={{fontSize:13}}>02 · AI RECREATION</strong><span style={{fontSize:11,color:"#caff39"}}>16 SECONDS</span></div>
   <video controls playsInline preload="metadata" aria-label="AI recreation result video" style={{display:"block",width:"100%",maxHeight:460,background:"#000"}}><source src={aiVideo} type="video/mp4"/>Your browser does not support video.</video>
   <p style={{padding:"13px 16px",fontSize:12,lineHeight:1.6,color:"#b9c7b4",margin:0}}>Review the AI-generated result and compare it with the source clip.</p>
  </article>
 </div>
 </section>

<section className="resourceStrip"><div><small>REFERENCE ASSET</small><h2>Original reference video</h2><p>Download the reference video supplied with this lesson where redistribution is authorised, then use it as the motion source while you practise.</p></div><a href={originalVideo} download className="back"><Download/> DOWNLOAD REFERENCE VIDEO</a></section>

<section className="workflowBlock"><div className="stepNo">01</div><div><small>REFERENCE</small><h2>Find and upload your reference video</h2><p><b>What is a reference video?</b> It is the original clip whose movements, acting, camera angles and timing you want to recreate with your own characters.</p><ol><li>Open TikTok, Instagram Reels or YouTube Shorts and look for a short clip with clear characters and movements.</li><li>Choose a video you own or have permission to reuse. For your first project, aim for 5–15 seconds with one or two visible people.</li><li>Save an authorised MP4 or MOV copy to your device. You can also use the downloadable practice video above.</li><li>Watch it carefully: identify who speaks, who moves, how the camera moves and which elements must remain unchanged.</li><li>When you reach Genjutsu in Step 03, upload this clip as the motion reference.</li></ol><p><b>K4K tip:</b> Clear faces, steady framing and simple actions make character replacement easier. Do not upload private or copyrighted videos without permission.</p></div></section>
<section className="workflowBlock"><div className="stepNo">02</div><div><small>CHARACTER</small><h2>Prepare your replacement character</h2><p>Use a clear image of yourself, your own character or another image you are authorised to use. More identity coverage improves consistency.</p><ol><li>Pick a sharp, well-lit portrait where the face is clearly visible.</li><li>For better results, prepare front, side and full-body reference views.</li><li>Keep the same hairstyle, outfit and facial identity across the character sheet.</li><li>Copy the character-sheet prompt below into your preferred image tool and review the result before continuing.</li></ol><CopyPrompt title="Character Sheet Prompt" text={characterPrompt}/></div></section>
<section className="workflowBlock featuredStep"><div className="stepNo">03</div><div><small>HIGGSFIELD · GENJUTSU</small><h2>Genjutsu on Higgsfield — Motion Transfer setup</h2><p><b>Genjutsu is a tool inside Higgsfield.</b> Open Higgsfield, select <b>Genjutsu</b>, upload the reference video, add your character sheet, select <b>Motion Transfer</b>, paste the prompt below and generate.</p><div className="miniChecks"><span><Check/> Reference video</span><span><Check/> Character sheet</span><span><Check/> Motion Transfer</span><span><Check/> Prompt</span></div><CopyPrompt title="Genjutsu Character Replacement" text={genjutsuPrompt}/></div></section>
<section className="workflowBlock"><div className="stepNo">04</div><div><small>RESULT</small><h2>Watch and compare the AI result</h2><p>Check identity, hair, wardrobe, hands, background people, movement and camera behaviour. Regenerate problem areas instead of accepting the first output.</p><p><b>Compare the two videos at the top of this lesson:</b> play the original reference, then play the AI recreation. The example AI output is shorter than the full original source clip.</p></div></section>
<section className="workflowBlock"><div className="stepNo">05</div><div><small>EXPORT</small><h2>Finish and publish</h2><p>Trim, add licensed audio, colour-match where needed, apply subtle sharpening and export at 9:16, 1080 × 1920, 30fps for short-form platforms.</p></div></section>
</main>}