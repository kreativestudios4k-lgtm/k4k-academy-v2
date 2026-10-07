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

function CopyPrompt({title,text}){const[copied,setCopied]=useState(false);async function copy(){await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1500)}return <article className="promptCard"><div><small>K4K PROMPT</small><h3>{title}</h3></div><pre>{text}</pre><button onClick={copy}><Copy/>{copied?'COPIED':'COPY PROMPT'}</button></article>}

export default function WorkflowOne(){return <main className="workflowPage">
<Link className="back" href="/academy"><ArrowLeft/> Back to Academy</Link>
<section className="workflowHero"><div className="kicker"><Sparkles/> K4K WORKFLOW 001</div><h1>RECREATE A VIRAL VIDEO<br/><i>WITH YOUR OWN CHARACTER.</i></h1><p>Watch the process, copy the exact workflow prompts and use the downloadable reference asset to practise.</p><div className="workflowStats"><span><b>3.7M</b> views / 24h</span><span><b>241K</b> likes</span><span><b>73K</b> shares</span><span><b>14K</b> saves</span></div></section>

<section className="lessonVideo"><div className="lessonVideoStage"><Video/><Play/><span>FULL K4K VIDEO TUTORIAL</span></div><div><small>WATCH FIRST</small><h2>Follow the complete workflow</h2><p>Watch the tutorial from reference selection through character preparation, Genjutsu Motion Transfer and the final AI result. Then use the resources below while you build your own version.</p></div></section>

<section className="resourceStrip"><div><small>REFERENCE ASSET</small><h2>Original reference video</h2><p>Download the reference video supplied with this lesson where redistribution is authorised, then use it as the motion source while you practise.</p></div><button disabled><Download/> DOWNLOAD REFERENCE VIDEO</button></section>

<section className="workflowBlock"><div className="stepNo">01</div><div><small>REFERENCE</small><h2>Upload the reference video</h2><p>The reference controls movement, performance, timing, framing, camera motion, interactions and overall energy.</p></div></section>
<section className="workflowBlock"><div className="stepNo">02</div><div><small>CHARACTER</small><h2>Prepare your own character</h2><p>Use a clear image of yourself, your own character or another image you are authorised to use. More identity coverage improves consistency.</p><CopyPrompt title="Character Sheet Prompt" text={characterPrompt}/></div></section>
<section className="workflowBlock featuredStep"><div className="stepNo">03</div><div><small>HIGGSFIELD · GENJUTSU</small><h2>Genjutsu on Higgsfield — Motion Transfer setup</h2><p><b>Genjutsu is a tool inside Higgsfield.</b> Open Higgsfield, select <b>Genjutsu</b>, upload the reference video, add your character sheet, select <b>Motion Transfer</b>, paste the prompt below and generate.</p><div className="miniChecks"><span><Check/> Reference video</span><span><Check/> Character sheet</span><span><Check/> Motion Transfer</span><span><Check/> Prompt</span></div><CopyPrompt title="Genjutsu Character Replacement" text={genjutsuPrompt}/></div></section>
<section className="workflowBlock"><div className="stepNo">04</div><div><small>RESULT</small><h2>Watch and compare the AI result</h2><p>Check identity, hair, wardrobe, hands, background people, movement and camera behaviour. Regenerate problem areas instead of accepting the first output.</p><div className="lessonVideoStage resultVideo"><Play/><span>FINAL AI RESULT</span></div></div></section>
<section className="workflowBlock"><div className="stepNo">05</div><div><small>EXPORT</small><h2>Finish and publish</h2><p>Trim, add licensed audio, colour-match where needed, apply subtle sharpening and export at 9:16, 1080 × 1920, 30fps for short-form platforms.</p></div></section>
</main>}