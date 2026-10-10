'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Check,ShieldCheck,LockKeyhole,Play,Video,Clapperboard,FileText,ChevronDown,CheckCircle2,MoveUpRight} from 'lucide-react';

const checkout='https://buy.stripe.com/dRmbJ293u6d7egQ8CseEo0n';
const demoVideo='https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/94c04cc0-e9f1-48cf-a4fd-a8c271ba069d.mp4';
const steps=[
 {number:'01',title:'Study the viral reference',description:'Break down the original movement, timing, camera angles and performance before you start.'},
 {number:'02',title:'Create your character sheet',description:'Use the included prompt to create consistent reference views of your own character.'},
 {number:'03',title:'Recreate it in Genjutsu',description:'Follow the Higgsfield Motion Transfer setup and use the ready-to-copy replacement prompt.'},
 {number:'04',title:'Compare and export',description:'Compare the AI result, correct identity drift and prepare your final vertical video.'}
];
const included=['Workflow 01: original video, AI result and full tutorial','New workflow releases in the member library','Character sheet and copy-ready AI prompts','Higgsfield Genjutsu motion-transfer lessons','Quality checks, export tips and practice assets','Private access while your subscription is active'];
const faq=[
 ['What am I buying?','An active K4K Academy membership. Workflow 01 is ready now; new workflows are released to the private library as they become available.'],
 ['Is £7.99 a one-time payment?','No. This is a recurring £7.99 monthly subscription. Stripe shows the billing terms before you confirm payment.'],
 ['How do I access the workflow after paying?','After checkout you will be redirected to create or sign into your K4K Academy account. Use the same email address you used to pay, verify your email if prompted, and your active subscription can be linked to your account.'],
 ['Will I get access to other lessons?','Yes. Active members can access newly released K4K Academy workflows at no additional lesson charge. Workflow 02 is scheduled for Monday 12 October 2026.'],
 ['Can I cancel my subscription?','Yes. Your Stripe receipt contains your purchase details. For billing or cancellation assistance, email hello@kreativestudios4k.com.']
];
export default function Home(){
 const [open,setOpen]=useState(0);
 return <main className="k4kCheckout"><a className="skipLink" href="#main-content">Skip to content</a>
  <div className="topline"><span className="pulse"/> K4K ACADEMY · WEEKLY CREATOR WORKFLOWS · PRIVATE MEMBER ACCESS</div>
  <header className="k4kNav">
   <Link href="/" className="k4kBrand"><span>K4K</span> ACADEMY</Link>
   <div className="navActions"><a href="#included">What you get</a><Link href="/login">Member login <MoveUpRight size={15}/></Link></div>
  </header>
  <div className="k4kContent" id="main-content">
   <section className="k4kHero" id="top">
    <div className="k4kHeroText">
     <div className="eyebrowTag"><span/> THE K4K AI CREATOR MEMBERSHIP</div>
     <h1>RECREATE THE<br/><em>VIRAL VIDEO.</em><br/>STEP BY STEP.</h1>
     <p className="heroLead">Go from a real reference clip to your own AI character swap. Get guided video breakdowns, copy-ready prompts and new creative workflows in your private member library.</p>
     <div className="heroChecks"><span><CheckCircle2/> Real video breakdown</span><span><CheckCircle2/> Copy-ready prompts</span><span><CheckCircle2/> Private workflow access</span></div>
     <a href="#checkout" className="primaryCTA mobileCTA">GET THE WORKFLOW <ArrowRight size={19}/></a>
    </div>
    <aside className="orderCard" id="checkout">
     <div className="orderTop"><span className="orderEyebrow">YOUR ACCESS</span><span className="orderStatus"><span/> AVAILABLE NOW</span></div>
     <div className="orderIcon"><Clapperboard size={27}/></div>
     <h2>K4K ACADEMY<br/>MEMBERSHIP</h2>
     <p className="orderSubtitle">Character Swap · Higgsfield Genjutsu</p>
     <div className="orderDivider"/>
     <div className="orderPrice"><strong>£7.99</strong><span>/ month</span></div>
     <p className="priceNote">Recurring monthly membership · cancel any time with billing support</p>
     <div className="orderDivider"/>
     <div className="orderList">{included.slice(0,5).map(x=><div key={x}><Check size={17}/><span>{x}</span></div>)}</div>
     <a href={checkout} className="payButton">JOIN K4K ACADEMY <ArrowRight size={20}/></a>
     <div className="secureRow"><ShieldCheck size={17}/> Secure payment powered by Stripe</div>
     <p className="orderFootnote">After payment: sign in using the <b>same email</b> as your Stripe receipt. Already paid? <a href="mailto:hello@kreativestudios4k.com?subject=K4K%20Academy%20access%20help" style={{color:'#caff39',textDecoration:'underline'}}>Get access help</a> instead of purchasing again.</p>
    </aside>
   </section>
   <section className="previewSection" id="included">
    <div className="sectionKicker">REAL AI RESULTS · FULL METHOD FOR MEMBERS</div>
    <div className="sectionHeading"><h2>SEE WHAT YOU CAN<br/><em>LEARN TO CREATE.</em></h2><p>Watch a short AI recreation from Workflow 01. The original reference, downloadable assets, full lesson and prompts stay inside your private Academy.</p></div>
    <div className="comparisonFrame realPreview">
     <div className="demoMedia"><div className="demoPhone"><video controls playsInline preload="metadata" aria-label="AI character swap recreation preview"><source src={demoVideo} type="video/mp4"/>Your browser does not support this video.</video></div></div>
     <div className="demoCopy"><span className="sectionKicker">WORKFLOW 001 · AVAILABLE NOW</span><h3>FROM REFERENCE<br/>TO RECREATION.</h3><p>Study the original, build your own character sheet, transfer motion in Higgsfield Genjutsu and check the finished video for natural movement and consistent identity.</p><div className="demoPills"><span>Real example</span><span>Copyable prompts</span><span>Guided steps</span></div><a href="#checkout" className="secondaryCTA">LEARN THE METHOD <ArrowRight size={17}/></a><small>Preview clip only. Full lessons require an active membership.</small></div>
    </div>
   </section>
   <section className="methodSection">
    <div className="sectionKicker">THE WORKFLOW</div>
    <h2>FOUR STEPS.<br/><em>ONE COMPLETE PROCESS.</em></h2>
    <div className="stepsGrid">{steps.map(s=><article key={s.number}><span className="stepNumber">{s.number}</span><h3>{s.title}</h3><p>{s.description}</p></article>)}</div>
   </section>
   <section className="includedSection">
    <div><div className="sectionKicker">INSIDE YOUR MEMBERSHIP</div><h2>EVERYTHING YOU NEED<br/><em>FOR THIS VIDEO.</em></h2><p>Start with the character swap method, then explore new step-by-step video workflows as they are released to your private member library.</p><a href={checkout} className="secondaryCTA">JOIN THE ACADEMY <ArrowRight size={19}/></a></div>
    <div className="includedPanel">{included.map((x,i)=><div key={x}><span className="includeIcon">{i===0?<Play size={16}/>:i===1?<Clapperboard size={16}/>:i===2||i===3?<FileText size={16}/>:<Check size={16}/>}</span><span>{x}</span><Check size={16} className="includeTick"/></div>)}</div>
   </section>
   <section className="faqSection"><div className="sectionKicker">BEFORE YOU JOIN</div><h2>QUESTIONS & <em>ANSWERS.</em></h2><div className="faqList">{faq.map(([q,a],i)=><div className="faqItem" key={q}><button type="button" aria-expanded={open===i} onClick={()=>setOpen(open===i?-1:i)}><span>{q}</span><ChevronDown size={20} className={open===i?'rotated':''}/></button>{open===i&&<p>{a}</p>}</div>)}</div></section>
   <section className="lastCTA"><div className="sectionKicker">K4K ACADEMY</div><h2>READY TO MAKE<br/><em>YOUR VERSION?</em></h2><p>Get Workflow 01 now and future workflow releases while your £7.99/month membership stays active.</p><a href={checkout} className="payButton">UNLOCK FOR £7.99 / MONTH <ArrowRight size={20}/></a><div className="secureRow"><LockKeyhole size={16}/> Secure Stripe checkout · Member access after sign-in</div></section>
  </div>
  <footer className="k4kFooter"><span className="k4kBrand"><span>K4K</span> ACADEMY</span><span>© 2026 KREATIVE STUDIOS 4K</span><div className="footerLinks"><Link href="/login">Member login</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@kreativestudios4k.com">Support</a></div></footer>
  <style>{`
  .k4kCheckout{min-height:100vh;background:#080a08;color:#f7f8f4;font-family:Arial,Helvetica,sans-serif;overflow:hidden}
  .k4kCheckout *{box-sizing:border-box}.k4kCheckout a{text-decoration:none}.k4kCheckout .topline{background:#caff39;color:#12180c;font-size:10px;font-weight:900;letter-spacing:2px;text-align:center;padding:11px 12px}.topline .pulse,.eyebrowTag span,.orderStatus span{display:inline-block;width:7px;height:7px;border-radius:50%;background:#141b0d;margin-right:8px}
  .k4kNav{height:80px;max-width:1240px;margin:auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff18}
  .k4kBrand{color:white;font-size:22px;font-weight:900;letter-spacing:-1px}.k4kBrand span{color:#caff39}
  .navActions{display:flex;gap:28px;align-items:center}.navActions a{font-size:13px;font-weight:700;color:#c6cfc1}.navActions a:last-child{display:flex;align-items:center;gap:6px;color:white}
  .k4kContent{max-width:1240px;margin:0 auto;padding:0 28px}.k4kHero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(345px,.78fr);gap:66px;align-items:center;padding:85px 0 110px}
  .eyebrowTag,.sectionKicker{font-size:11px;letter-spacing:2.5px;font-weight:900;color:#caff39}.eyebrowTag{display:inline-flex;align-items:center;border:1px solid #caff3944;border-radius:99px;padding:12px 16px;background:#caff390d}.eyebrowTag span{background:#caff39}
  .k4kHero h1{font-size:clamp(46px,5.5vw,78px);letter-spacing:-.075em;line-height:1.03;margin:28px 0 25px;font-weight:950}.k4kCheckout h1 em,.k4kCheckout h2 em{color:#caff39;font-style:normal}
  .heroLead{color:#c1c7bd;font-size:17px;line-height:1.85;max-width:570px}.heroChecks{display:flex;flex-direction:column;gap:14px;margin-top:35px}.heroChecks span{display:flex;align-items:center;gap:12px;color:#e3e9dd;font-size:14px;font-weight:700}.heroChecks svg{color:#caff39;width:19px}
  .orderCard{background:#151a14;border:1px solid #414d32;border-radius:22px;padding:32px;box-shadow:0 30px 100px #0009;position:relative}.orderTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.orderEyebrow{color:#aab8a0;letter-spacing:2px;font-size:10px;font-weight:900}.orderStatus{color:#caff39;font-size:10px;font-weight:900;white-space:nowrap}.orderStatus span{background:#caff39}
  .orderIcon{width:55px;height:55px;background:#caff39;color:#10160d;display:grid;place-items:center;border-radius:13px;margin-top:28px}.orderCard h2{font-size:29px;line-height:1.08;letter-spacing:-1px;margin:20px 0 9px}.orderSubtitle{color:#aeb9a6;font-size:13px}.orderDivider{height:1px;background:#ffffff1b;margin:23px 0}.orderPrice strong{font-size:56px;letter-spacing:-3px}.orderPrice span{font-size:15px;color:#b5c1ad;margin-left:10px}.priceNote{font-size:11px;color:#aeb9a6;line-height:1.6}.orderList{display:grid;gap:13px;margin-bottom:26px}.orderList>div{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#e2e9db;line-height:1.45}.orderList svg{flex-shrink:0;color:#caff39}
  .payButton,.primaryCTA,.secondaryCTA{display:flex;justify-content:center;align-items:center;gap:12px;padding:19px 18px;border-radius:9px;background:#caff39;color:#0b1008;font-weight:950;font-size:14px;letter-spacing:.25px;box-shadow:0 8px 30px #caff3922;transition:transform .2s,background .2s}.payButton:hover,.primaryCTA:hover,.secondaryCTA:hover{transform:translateY(-2px);background:#dbff6a}
  .secureRow{display:flex;justify-content:center;align-items:center;gap:8px;color:#b9c6b0;font-size:11px;margin-top:17px}.orderFootnote{font-size:11px;line-height:1.65;color:#a9b6a3;text-align:center;margin:17px 0 0}.orderFootnote b{color:#e8f1de}.mobileCTA{display:none}
  .previewSection,.methodSection,.includedSection,.faqSection{padding:95px 0;border-top:1px solid #ffffff1a}.k4kCheckout h2{font-size:clamp(32px,4.3vw,55px);letter-spacing:-.055em;line-height:1.1}.sectionHeading{display:flex;justify-content:space-between;align-items:end;gap:40px}.sectionHeading h2{margin:18px 0 30px}.sectionHeading p{max-width:350px;color:#b9c5b1;line-height:1.7;font-size:14px;margin-bottom:34px}.comparisonFrame{background:#111810;border:1px solid #ffffff24;border-radius:18px;overflow:hidden}.comparisonFrame img{display:block;width:100%;height:auto;min-height:220px;object-fit:cover}.comparisonCaption{padding:20px 24px;display:flex;justify-content:space-between;gap:20px;color:#caff39;font-size:11px;font-weight:900;letter-spacing:1.4px}.comparisonCaption span:first-child{display:flex;align-items:center;gap:10px}.comparisonCaption span:last-child{color:#b7c2b0}
  .methodSection h2,.includedSection h2,.faqSection h2{margin:18px 0 35px}.stepsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.stepsGrid article{padding:26px 22px;background:#141a12;border:1px solid #ffffff1b;border-radius:14px}.stepNumber{color:#caff39;font-size:13px;font-weight:900;letter-spacing:2px}.stepsGrid h3{font-size:20px;line-height:1.2;letter-spacing:-.6px;margin:27px 0 13px}.stepsGrid p{color:#acb9a7;line-height:1.7;font-size:13px}
  .includedSection{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}.includedSection>div>p{color:#b8c3b2;line-height:1.75;font-size:15px;max-width:460px}.secondaryCTA{display:inline-flex;margin-top:25px}.includedPanel{background:#151a14;border:1px solid #ffffff26;border-radius:17px;padding:20px 27px}.includedPanel>div{display:flex;align-items:center;gap:15px;padding:17px 0;border-bottom:1px solid #ffffff18;font-size:14px;color:#e6ede2}.includedPanel>div:last-child{border:0}.includeIcon{width:34px;height:34px;border-radius:8px;background:#caff3917;color:#caff39;display:grid;place-items:center;flex-shrink:0}.includeTick{margin-left:auto;color:#caff39;flex-shrink:0}
  .faqSection{max-width:850px;margin:auto}.faqList{border-top:1px solid #ffffff24}.faqItem{border-bottom:1px solid #ffffff24}.faqItem button{width:100%;padding:25px 0;display:flex;justify-content:space-between;gap:20px;align-items:center;background:none;border:0;color:#f7f8f4;text-align:left;font-size:17px;font-weight:800;cursor:pointer}.faqItem button svg{color:#caff39;transition:transform .2s;flex-shrink:0}.faqItem button svg.rotated{transform:rotate(180deg)}.faqItem p{margin:0 0 24px;color:#b6c2af;line-height:1.8;font-size:14px;max-width:740px}
  .lastCTA{text-align:center;border:1px solid #caff3933;border-radius:22px;background:radial-gradient(circle at 50% 0,#2c3a1c,#111710 65%);padding:75px 30px;margin:15px 0 95px}.lastCTA h2{font-size:clamp(42px,5.4vw,69px);margin:19px 0}.lastCTA p{color:#c5cfc0;font-size:16px}.lastCTA .payButton{max-width:350px;margin:30px auto 0}
  .k4kFooter{max-width:1240px;margin:auto;padding:35px 28px 45px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid #ffffff18}.k4kFooter>span:nth-child(2),.k4kFooter>a{font-size:11px;color:#aab6a3}.k4kFooter>a{text-decoration:underline}

  .skipLink{position:absolute;top:-100px;left:12px;z-index:100;background:#caff39;color:#101510;padding:12px 18px;border-radius:8px}.skipLink:focus{top:12px}
  .k4kCheckout :is(a,button,video):focus-visible{outline:3px solid #e8ff9b;outline-offset:4px}
  .realPreview{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1fr);align-items:center;gap:clamp(25px,5vw,70px);padding:clamp(22px,5vw,56px);background:radial-gradient(circle at 15% 35%,#2b3b20,#101710 55%)}
  .demoMedia{display:grid;place-items:center}.demoPhone{width:min(100%,290px);aspect-ratio:9/16;background:#050605;border:7px solid #273622;border-radius:25px;overflow:hidden;box-shadow:0 25px 60px #0009}.demoPhone video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
  .demoCopy h3{font-size:clamp(30px,4vw,50px);line-height:1.05;letter-spacing:-.055em;margin:22px 0}.demoCopy p{font-size:15px;line-height:1.8;color:#c1cdbb;max-width:470px}.demoPills{display:flex;gap:9px;flex-wrap:wrap;margin:23px 0}.demoPills span{border:1px solid #caff3945;background:#caff390b;color:#dff5ca;padding:8px 11px;border-radius:30px;font-size:11px;font-weight:800}.demoCopy .secondaryCTA{margin:15px 0;max-width:260px}.demoCopy>small{display:block;color:#9fac99;font-size:11px;line-height:1.6}.footerLinks{display:flex;gap:17px;flex-wrap:wrap}.footerLinks a{font-size:12px;color:#c7d2bf;text-decoration:underline}
  @media(max-width:760px){.realPreview{grid-template-columns:1fr}.demoPhone{width:min(100%,265px)}.demoCopy{text-align:left}}
  @media(prefers-reduced-motion:reduce){.k4kCheckout *{scroll-behavior:auto!important;transition:none!important}}
  @media(max-width:900px){.k4kHero{grid-template-columns:1fr;gap:40px;padding:65px 0 80px}.orderCard{max-width:620px;width:100%;margin:auto}.stepsGrid{grid-template-columns:repeat(2,1fr)}.includedSection{grid-template-columns:1fr;gap:35px}.sectionHeading{display:block}.sectionHeading p{max-width:650px}.mobileCTA{display:inline-flex;margin-top:30px}.k4kHero h1{font-size:clamp(45px,8vw,72px)}}
  @media(max-width:560px){.k4kNav{height:65px;padding:0 18px}.k4kBrand{font-size:18px}.navActions{gap:0}.navActions>a:first-child{display:none}.navActions a{font-size:12px}.k4kContent{padding:0 17px}.k4kHero{padding:48px 0 60px}.k4kHero h1{font-size:clamp(40px,10.5vw,57px);letter-spacing:-.065em}.heroLead{font-size:15px;line-height:1.75}.orderCard{padding:25px 21px}.orderCard h2{font-size:27px}.orderPrice strong{font-size:49px}.previewSection,.methodSection,.includedSection,.faqSection{padding:65px 0}.stepsGrid{grid-template-columns:1fr}.stepsGrid article{padding:22px}.comparisonCaption{flex-direction:column;font-size:10px}.lastCTA{padding:55px 20px;margin-bottom:60px}.k4kFooter{flex-direction:column;align-items:flex-start;padding:30px 18px}.k4kCheckout h2{font-size:clamp(31px,8.5vw,45px)}}
  `}</style>
 </main>
}