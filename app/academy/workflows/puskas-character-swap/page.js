import Link from 'next/link';
import {CompleteWorkflowButton} from '../../LearningProgress';
import {ArrowLeft,LockKeyhole,CalendarDays,PlayCircle,CheckCircle2,Video,Image as ImageIcon} from 'lucide-react';

export const dynamic='force-dynamic';
export const revalidate=0;
const releaseAt=new Date('2026-10-11T23:00:00.000Z'); // Monday 12 October 2026, 00:00 BST
const referenceVideo='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/b9fefbf2-47b1-495d-8ede-a66bd3841a60.mp4';
const resultVideo='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/a052972a-6037-4938-8800-c39b8446074b.mp4';
const characterSheet='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/4b7dae04-8bad-475f-b0d7-fe4a884a46a0.jpg';
const green='#caff39';
const panel={border:'1px solid #ffffff30',borderRadius:15,padding:'clamp(18px,3vw,30px)',background:'#101811',marginTop:22};
const prompt=`Use the uploaded reference video as the exact motion and camera guide, and use the supplied multi-angle character sheet as the ONLY replacement character identity.

Replace the main football player in the video with the small-statured man in the reference sheet. Keep his natural, compact body height and proportions in EVERY frame. Never scale him up to match the original player's height. Maintain the same realistic face, hairstyle, skin texture, yellow Brazil jersey with green trim, orange captain armband, black shorts, bright orange socks and black trainers shown in the character sheet.

Preserve the original football action, dribbling, ball contact, acceleration, body language, reactions, camera tracking, shot composition, field, background players, stadium atmosphere, shadows and scene timing. The replacement player's foot-to-ball interaction must remain physically plausible at his own body scale. Preserve motion blur, depth of field and the original lighting. Keep character identity consistent from front, side and back views.

Avoid artificial faces, stretched limbs, floating feet, body enlargement, identity drift, jersey changes, duplicated players, ball distortion, jump cuts and camera changes. Output a natural live-action-looking football recreation.`;

export default function WorkflowTwo(){
 const released=Date.now()>=releaseAt.getTime();
 return <main className="workflowPage" style={{color:'#f4f8f1'}}>
  <Link className="back" href="/academy"><ArrowLeft/> Back to Academy</Link>
  {!released?<>
   <section className="workflowHero">
    <div className="kicker"><LockKeyhole/> K4K WORKFLOW 002 · LOCKED UNTIL MONDAY</div>
    <h1>THE PUSKÁS<br/><i>CHARACTER SWAP.</i></h1>
    <p>Your next AI football recreation lesson is prepared, but its tutorial, videos and prompts are not available yet.</p>
    <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'14px 18px',background:'#caff3915',border:'1px solid #caff3960',borderRadius:12,color:green,fontWeight:900,marginTop:18}}><CalendarDays size={19}/> UNLOCKS MONDAY 12 OCTOBER 2026</div>
   </section>
   <section style={panel}><p style={{margin:0,lineHeight:1.8,color:'#b9c7b4'}}>Workflow 01 is available now. Workflow 02 unlocks automatically on Monday at 00:00 UK time for members with an active subscription. No additional purchase is required.</p><Link href="/academy/workflows/viral-character-swap" className="back" style={{marginTop:22}}>OPEN WORKFLOW 01 →</Link></section>
  </>:<>
   <section className="workflowHero">
    <div className="kicker"><CheckCircle2/> K4K WORKFLOW 002 · AVAILABLE NOW</div>
    <h1>RECREATE A HISTORIC GOAL<br/><i>WITH A NEW CHARACTER.</i></h1>
    <p>Learn how to recreate a football highlight with a consistent replacement character while preserving the original movement, ball physics, camera work and atmosphere.</p>
   </section>
   <section style={panel}>
    <small style={{color:green,fontWeight:900,letterSpacing:2}}>01 · WATCH & COMPARE</small>
    <h2 style={{margin:'12px 0 8px'}}>ORIGINAL VS. AI RECREATION</h2>
    <p style={{lineHeight:1.7,color:'#b9c7b4'}}>Both examples are approximately 15 seconds. Play the original first, then compare the AI character replacement.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,270px),1fr))',gap:18,marginTop:20}}>
     <article style={{border:'1px solid #ffffff30',borderRadius:12,overflow:'hidden',background:'#080d09'}}><div style={{padding:14,fontWeight:900}}>01 · ORIGINAL FOOTBALL VIDEO</div><video controls playsInline preload="metadata" aria-label="Original historic football goal reference" style={{display:'block',width:'100%',maxHeight:490,background:'#000'}}><source src={referenceVideo} type="video/mp4"/>Video playback not supported.</video><p style={{padding:14,color:'#b9c7b4',fontSize:13}}>Observe the player, ball contact, camera tracking and scene timing.</p></article>
     <article style={{border:'1px solid #caff3950',borderRadius:12,overflow:'hidden',background:'#080d09'}}><div style={{padding:14,fontWeight:900}}>02 · AI CHARACTER SWAP RESULT</div><video controls playsInline preload="metadata" aria-label="AI recreation of football goal" style={{display:'block',width:'100%',maxHeight:490,background:'#000'}}><source src={resultVideo} type="video/mp4"/>Video playback not supported.</video><p style={{padding:14,color:'#b9c7b4',fontSize:13}}>Compare character identity, body scale, ball contact and natural motion.</p></article>
    </div>
   </section>
   <section style={panel}>
    <small style={{color:green,fontWeight:900,letterSpacing:2}}>02 · CHARACTER REFERENCE</small>
    <h2 style={{margin:'12px 0'}}>USE THE SAME CHARACTER IN EVERY FRAME</h2>
    <p style={{lineHeight:1.8,color:'#b9c7b4'}}>This multi-angle character sheet is the identity reference for the football replacement. Preserve the compact height, face, hairstyle and exact clothing from the sheet.</p>
    <img src={characterSheet} alt="Multi-angle character sheet showing a footballer in yellow Brazil jersey, black shorts and orange socks" loading="lazy" style={{width:'100%',maxWidth:850,display:'block',margin:'18px auto',borderRadius:12}}/>
    <p style={{fontSize:13,color:'#b9c7b4'}}>Use front, profile, three-quarter and rear views to maintain identity during turns.</p>
   </section>
   <section style={panel}><small style={{color:green,fontWeight:900,letterSpacing:2}}>03 · MOTION TRANSFER</small><h2 style={{margin:'12px 0'}}>BUILD THE RECREATION IN HIGGSFIELD</h2>
    <ol style={{lineHeight:2,color:'#dce6d7',paddingLeft:23}}>
     <li>Open Higgsfield and select the Genjutsu character replacement / motion transfer workflow.</li>
     <li>Upload the original 15-second football reference video.</li>
     <li>Add the supplied character sheet as your character identity reference.</li>
     <li>Paste the prompt below. Keep the new character's natural compact height and proportions.</li>
     <li>Generate, compare against the original and refine any mismatched ball contact, movement or identity.</li>
    </ol>
    <h3 style={{color:green,marginTop:22}}>READY-TO-COPY GENJUTSU PROMPT</h3>
    <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:18,borderRadius:10,background:'#080e09',border:'1px solid #caff3945',lineHeight:1.7,fontSize:13}}>{prompt}</pre>
   </section>
   <section style={panel}><small style={{color:green,fontWeight:900,letterSpacing:2}}>04 · QUALITY CONTROL & EXPORT</small><h2 style={{margin:'12px 0'}}>REVIEW YOUR RESULT</h2>
    <p style={{lineHeight:1.8,color:'#b9c7b4'}}>Check every cut for facial consistency, natural proportions, accurate foot-to-ball contact, wardrobe stability, preserved camera angles and realistic lighting. Export your final vertical video at 1080 × 1920 if the reference framing supports it.</p>
    <Link href="/academy" className="back">RETURN TO ALL WORKFLOWS →</Link>
   </section>
  <CompleteWorkflowButton lessonId="workflow-002"/>
  </>}
 </main>;
}
