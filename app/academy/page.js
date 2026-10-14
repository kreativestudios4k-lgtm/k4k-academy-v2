import LogoutButton from '../components/LogoutButton';
import Link from 'next/link';
import GooglePasswordReminder from './GooglePasswordReminder';
import LearningProgress from './LearningProgress';
import {courseTopics,weeklyTrend} from '../../lib/academy-course';
import {realProjects} from '../../lib/k4k-real-work';
import {ArrowRight,LockKeyhole,CalendarDays,CheckCircle2,LifeBuoy,BookOpen} from 'lucide-react';

export const dynamic='force-dynamic';
export default function Academy(){
 const workflowTwoAvailable=Date.now()>=new Date('2026-10-11T23:00:00.000Z').getTime();
 return <main className="dash dashPremium">
  <aside>
   <Link className="brand" href="/"><span>K4K</span> ACADEMY <small className="dashBrandSub">CREATOR STUDIO / MEMBERS</small></Link>
   <nav><Link className="active" href="/academy">My Studio</Link><Link href="/academy/method">Start Here · K4K FRAME</Link><Link href="/academy/gallery">Real Work Gallery</Link><Link href="/academy#course-topics">Course Topics</Link><Link href="/academy/trends">Trend of the Week</Link><Link href="/academy/workflows/viral-character-swap">Workflow 01</Link><Link href="/academy/workflows/puskas-character-swap">Workflow 02 · {workflowTwoAvailable?'Available':'Monday'}</Link><Link href="/prompts">Prompt Vault</Link></nav>
   <div style={{padding:"12px 0",display:"grid",gap:12}}><Link href="/update-password" style={{color:"#caff39",fontSize:13,fontWeight:800,textDecoration:"underline"}}>Change Password</Link><a href="https://billing.stripe.com/p/login/28E7sM93ubxrfkU05WeEo00" target="_blank" rel="noopener noreferrer" style={{color:"#d9edcc",fontSize:13,textDecoration:"underline"}}>Manage billing &amp; cancellation ↗</a><LogoutButton/></div>
   <div className="member"><small>MEMBERSHIP</small><b>CREATOR MEMBER</b><span>Private workflow library</span></div>
  </aside>
  <section className="dashmain">
   <div className="academyMobileNav"><Link href="/academy/method">Start Here</Link><Link href="/academy/gallery">Real Gallery</Link><Link href="/academy#course-topics">Course Topics</Link><Link href="/academy/trends">Weekly Trend</Link><Link href="/academy/workflows/viral-character-swap">Workflow 01</Link><Link href="/academy/workflows/puskas-character-swap">Workflow 02</Link><Link href="/prompts">Prompts</Link><Link href="/update-password">Password</Link></div>
   <GooglePasswordReminder/>
   <header className="dashEditorialHero"><div><small><span className="dashStatusDot"/> K4K ACADEMY / THE MEMBER SPACE</small><h1>MAKE<br/>BETTER<br/><i>CREATIVE WORK.</i></h1><p>Not a shortcut to viral views. A private studio for learning real reference breakdowns, character sheets, thoughtful prompts, honest testing and final edits.</p><Link href="/academy/method" className="dashEditorialJump">START THE K4K FRAME METHOD <ArrowRight size={17}/></Link></div><div className="dashEditorialIndex" aria-hidden="true"><span>K4K</span><small>CREATE / LEARN / REFINE</small></div></header>
   <section className="k4kStartHere" aria-label="Your suggested learning path">
    <div className="k4kStartIntro"><div><small>NEW HERE? START WITH A REAL PROJECT.</small><h2>ONE METHOD.<br/><em>FIVE QUALITY GATES.</em></h2><p>Make a short video you can explain and improve. Build the habit of saving your inputs, reference frames, prompts, failed attempts and final export.</p></div><Link href="/academy/method">LEARN THE K4K FRAME METHOD <ArrowRight size={18}/></Link></div>
    <div className="k4kStartStages"><span><b>F</b> FIND</span><span><b>R</b> READ</span><span><b>A</b> ANCHOR</span><span><b>M</b> MAKE</span><span><b>E</b> EDIT</span></div>
    <div className="k4kStartActions"><Link href="/academy/workflows/viral-character-swap"><strong>01 / WATCH A FULL BREAKDOWN</strong><small>Original footage, AI result, character sheet and actual prompts</small><ArrowRight size={17}/></Link><Link href="/prompts"><strong>02 / PREPARE YOUR OWN ASSETS</strong><small>Copy the character-sheet and motion-transfer templates</small><ArrowRight size={17}/></Link><Link href="/academy/gallery"><strong>03 / REVIEW THE REAL WORK</strong><small>Spot what was made, what still breaks and what to check</small><ArrowRight size={17}/></Link></div>
   </section>
      <LearningProgress workflowTwoAvailable={workflowTwoAvailable}/>

   <section id="course-topics" className="academyCourseSection">
     <div className="academyCourseHeading"><div><span className="academyKicker">K4K ACADEMY · YOUR LEARNING PATH</span><h2>FROM FIRST FRAME TO <em>FINAL EXPORT.</em></h2><p>Six self-paced topics with hands-on files, prompts, practical quality checks and specific deliverables. No promise of automatic mastery.</p></div><span className="academyCourseCount">06 TOPICS</span></div>
     <div className="academyCourseGrid">{courseTopics.map(topic=><Link className="academyCourseCard" href={`/academy/topics/${topic.slug}`} key={topic.slug}>
       <div className="academyCourseImage"><img src={topic.image} alt={topic.imageAlt} width="1920" height="1080" loading="lazy"/><span>TOPIC {topic.number}</span></div>
       <div className="academyCourseCardBody"><small>{topic.eyebrow} · {topic.level}</small><h3>{topic.title}</h3><p>{topic.summary}</p><span className="academyCourseLink">OPEN TOPIC <ArrowRight size={16}/></span></div>
     </Link>)}</div>
     <p className="academyCourseNote">Guided study notes and practice projects. For full filmed examples, continue to the existing weekly Workflows.</p>
   </section>

   <section className="k4kDashboardGallery">
     <div><span>ACTUAL PRODUCTION WORK / CURATED SELECTION</span><h2>SEE IT. BREAK IT DOWN. RECREATE IT.</h2><p>These are files from existing lessons and completed creative jobs—not simulated student results.</p></div>
     <div className="k4kDashboardGalleryGrid">{realProjects.filter(p=>p.featured).slice(0,3).map(p=><Link key={p.id} href={p.href}><img src={p.cover} loading="lazy" alt={p.title}/><div><small>{p.track}</small><strong>{p.title}</strong><ArrowRight size={17}/></div></Link>)}</div>
     <Link className="k4kDashboardGalleryMore" href="/academy/gallery">OPEN THE REAL WORK GALLERY <ArrowRight size={17}/></Link>
   </section>
      <section id="trend-of-the-week" className="academyTrendFeature">
      <div className="academyTrendPhoto"><img src={weeklyTrend.image} alt={weeklyTrend.imageAlt} width="1920" height="1080" loading="lazy"/></div>
      <div className="academyTrendFeatureCopy"><span className="academyKicker">TREND OF THE WEEK · {weeklyTrend.week}</span><h2>{weeklyTrend.title}</h2><p>{weeklyTrend.subtitle}</p><p className="academyTrendSummary">Our curated creative challenge: analyse the technique, adapt a ready-to-use prompt and practise with authorised footage.</p><Link href="/academy/trends">OPEN THIS WEEK'S TREND LAB <ArrowRight size={17}/></Link></div>
   </section>
   <div className="sectiontitle"><div>YOUR WEEKLY WORKFLOWS</div><span>{workflowTwoAvailable?'02 WORKFLOWS AVAILABLE':'01 AVAILABLE · 02 MONDAY 12 OCT'}</span></div>
   <div className="continue">
    <div className="workflowCover"><img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/06017105-11b5-47e6-aafd-f942478ead64.jpg" alt="Multi-angle character sheet from Dembow Party Workflow 01" loading="lazy"/><span className="workflowCoverLabel">WORKFLOW 001 · REAL EXAMPLE</span></div>
    <section>
     <small><CheckCircle2 size={14} style={{verticalAlign:"middle",marginRight:6}}/> WORKFLOW 001 · AVAILABLE NOW · 5 STEPS</small>
     <h2>DEMBOW PARTY · CHARACTER SWAP</h2>
     <p>Watch the 46-second original street-performance video alongside the 16-second AI recreation. Download the exact military-jacket and pink-shorts character sheet, then follow the Higgsfield Genjutsu workflow with ready-to-copy prompts.</p>
     <Link href="/academy/workflows/viral-character-swap">OPEN WORKFLOW 01 <ArrowRight/></Link>
    </section>
   </div>
   <article id="coming-next" style={{marginTop:24,padding:"clamp(22px,4vw,36px)",border:"1px solid #ffffff2b",borderRadius:16,background:"linear-gradient(125deg,#161d16,#0d120e)",display:"flex",flexWrap:"wrap",gap:20,alignItems:"center",justifyContent:"space-between"}}>
    <div style={{flex:"1 1 290px",maxWidth:650}}>
     <small style={{display:"flex",alignItems:"center",gap:8,color:"#caff39",fontWeight:800,letterSpacing:2}}>{workflowTwoAvailable?<CheckCircle2 size={15}/>:<LockKeyhole size={15}/>} WORKFLOW 002 · {workflowTwoAvailable?'AVAILABLE NOW':'UNLOCKS MONDAY 12 OCTOBER'}</small>
     <h2 style={{fontSize:"clamp(24px,3.5vw,36px)",margin:"14px 0",color:"#f7f9f4"}}>THE PUSKÁS CHARACTER SWAP</h2>
     <p style={{lineHeight:1.75,color:"#b9c7b4",margin:0}}>Recreate a historic football goal with a new character while preserving the original camera work, football movement and realistic body proportions. Includes the original video, AI result, multi-angle character sheet and a Genjutsu prompt.</p>
     <Link href="/academy/workflows/puskas-character-swap" style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:20,color:workflowTwoAvailable?"#101510":"#caff39",background:workflowTwoAvailable?"#caff39":"transparent",border:"1px solid #caff39",padding:"12px 16px",borderRadius:8,fontSize:12,fontWeight:900,textDecoration:"none"}}>{workflowTwoAvailable?'OPEN WORKFLOW 02':'PREVIEW RELEASE DATE'} <ArrowRight size={16}/></Link>
    </div>
    <div style={{flex:"0 1 260px",width:"100%",maxWidth:280,alignSelf:"stretch",minHeight:170,overflow:"hidden",borderRadius:12,border:"1px solid #ffffff24",background:"#232d22"}}>
     <img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/4b7dae04-8bad-475f-b0d7-fe4a884a46a0.jpg" alt="Workflow 02 football character sheet preview" loading="lazy" style={{width:"100%",height:"100%",maxHeight:260,objectFit:"cover",objectPosition:"top"}}/>
    </div>
   </article>
   <div className="academyHelp"><div><LifeBuoy size={22}/><div><strong>Need help accessing your membership?</strong><p>Already paid? Don't buy again. We can help with login, password and subscription questions.</p></div></div><a href="mailto:hello@kreativestudios4k.com?subject=K4K%20Academy%20member%20support">CONTACT SUPPORT <ArrowRight size={16}/></a></div>
   <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"24px 0",color:"#b9c7b4",lineHeight:1.7}}><CalendarDays size={20} color="#caff39" style={{flexShrink:0,marginTop:2}}/><p style={{margin:0}}><strong style={{color:"#f6f9f2"}}>New work when it is ready.</strong> We publish documented breakdowns after the footage, prompts, assets and quality checks are prepared. There is no guaranteed weekly release schedule.</p></div>
  </section>
  <style>{`
   .k4kStartHere{border:1px solid #ffffff36;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at 80% 10%,#22477666,transparent 70%),#101723;margin:30px 0 58px;color:#f6f8fc}
   .k4kStartIntro{padding:clamp(24px,4vw,45px);display:flex;justify-content:space-between;align-items:end;gap:20px}.k4kStartIntro>div{max-width:760px}.k4kStartIntro small{color:#baff45;letter-spacing:.16em;font-weight:900;font-size:10px}.k4kStartIntro h2{font-size:clamp(34px,4.7vw,66px);letter-spacing:-.075em;line-height:.98;margin:23px 0}.k4kStartIntro h2 em{font-style:normal;color:transparent;-webkit-text-stroke:1px #f0f3f9}.k4kStartIntro p{font-size:14px;line-height:1.8;color:#b6c5d5;max-width:680px;margin:0}.k4kStartIntro>a{display:inline-flex;align-items:center;justify-content:space-between;gap:18px;background:#baff45;color:#081008;border-radius:99px;padding:17px 18px;font-size:11px;font-weight:900;flex-shrink:0;max-width:300px}
   .k4kStartStages{border-block:1px solid #ffffff36;display:grid;grid-template-columns:repeat(5,1fr)}.k4kStartStages>span{padding:17px 8px;display:flex;align-items:center;justify-content:center;gap:10px;color:#d0dceb;font-size:11px;letter-spacing:.1em;font-weight:800;border-right:1px solid #ffffff25}.k4kStartStages>span:last-child{border-right:0}.k4kStartStages b{font-size:24px;color:#baff45}
   .k4kStartActions{display:grid;grid-template-columns:repeat(3,1fr);gap:0}.k4kStartActions>a{position:relative;border-right:1px solid #ffffff30;display:flex;flex-direction:column;gap:12px;padding:25px 30px;min-width:0}.k4kStartActions>a:last-child{border:0}.k4kStartActions strong{font-size:12px;color:#f7faff}.k4kStartActions small{color:#a7b7c9;font-size:12px;line-height:1.7}.k4kStartActions svg{color:#baff45;margin-top:auto}.k4kStartActions>a:hover{background:#ffffff0c}
   .k4kDashboardGallery{padding:60px 0 72px;border-top:1px solid #ffffff2e}.k4kDashboardGallery>div:first-child>span{color:#baff45;font-size:10px;letter-spacing:.16em;font-weight:900}.k4kDashboardGallery h2{font-size:clamp(31px,4vw,55px);line-height:1.04;letter-spacing:-.06em;color:white;margin:18px 0}.k4kDashboardGallery p{color:#aebecd;line-height:1.7}.k4kDashboardGalleryGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin-top:28px}.k4kDashboardGalleryGrid>a{border:1px solid #ffffff38;border-radius:14px;overflow:hidden;background:#121c27;min-width:0}.k4kDashboardGalleryGrid img{display:block;width:100%;height:clamp(145px,17vw,255px);object-fit:cover}.k4kDashboardGalleryGrid>a>div{padding:17px;display:grid;gap:8px;grid-template-columns:1fr auto}.k4kDashboardGalleryGrid small{font-size:10px;color:#baff45;letter-spacing:.08em;grid-column:1/-1}.k4kDashboardGalleryGrid strong{color:#f3f5f9;font-size:17px}.k4kDashboardGalleryGrid svg{color:#c7d9ee}.k4kDashboardGalleryMore{display:inline-flex;gap:15px;align-items:center;border:1px solid #ffffff6b;border-radius:99px;padding:15px 22px;color:white;font-size:11px;font-weight:900;margin-top:23px}
   @media(max-width:850px){.k4kStartIntro{display:block}.k4kStartIntro>a{margin-top:24px;max-width:none}.k4kStartActions{grid-template-columns:1fr}.k4kStartActions>a{border-right:0;border-bottom:1px solid #ffffff30}.k4kDashboardGalleryGrid{grid-template-columns:1fr 1fr}}
   @media(max-width:520px){.k4kStartStages>span{font-size:8px;gap:4px;flex-direction:column}.k4kStartStages b{font-size:21px}.k4kDashboardGalleryGrid{grid-template-columns:1fr}.k4kDashboardGalleryGrid img{height:210px}}
  `}</style>
 </main>
}