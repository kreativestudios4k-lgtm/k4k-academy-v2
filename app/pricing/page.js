import Link from 'next/link';
import SubscribeButton from './SubscribeButton';
import {PLAN_PRICES} from '../../lib/k4k-plan-prices.mjs';

export const metadata={title:'K4K APP | Pricing'};

const SALES_EMAIL='sales@kreativestudios4k.com';
const CREDITS={starter:80,creator:160,pro:340,studio:700};

const PLANS=[
 {key:'starter',name:'Starter',audience:'For casual creators',badge:null},
 {key:'creator',name:'Creator',audience:'For regular creators',badge:'Most popular'},
 {key:'pro',name:'Pro',audience:'For active creators',badge:'Best value'},
 {key:'studio',name:'Studio',audience:'For teams',badge:null},
];

const WHY=[
 {title:'Failed jobs are refunded',body:'If a generation fails or is blocked by moderation, its credits go back to your balance automatically. Each job is refunded once.'},
 {title:'Academy included',body:'Every plan includes K4K Academy, so you can learn the workflow as well as run it.'},
 {title:'Monthly, no annual lock-in',body:'Every plan is billed monthly. You are not signed up for a year without choosing it.'},
];

const money=(minor,currency)=>(minor/100).toLocaleString('en-GB',{style:'currency',currency});

export default function PricingPage(){
 return <main style={{minHeight:'100vh',background:'#080912',color:'#f7f7fb',padding:'44px max(20px,5vw)',fontFamily:'Arial,sans-serif'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
   <Link href="/" style={{color:'white',fontWeight:800,textDecoration:'none',fontSize:22}}>K4K APP</Link>
   <Link href="/academy" style={{color:'#b5a9ff'}}>Academy</Link>
  </header>

  <section style={{maxWidth:900,margin:'60px auto 32px',textAlign:'center'}}>
   <h1 style={{fontSize:'clamp(32px,5vw,56px)',lineHeight:1.1}}>Choose your plan</h1>
   <p style={{color:'#b6b8c8',fontSize:18}}>Every plan includes K4K Academy.</p>
  </section>

  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,maxWidth:1200,margin:'0 auto'}}>
   {PLANS.map(plan=>{
    const price=PLAN_PRICES[plan.key].GBP;
    return <article key={plan.key} style={{border:'1px solid #303146',borderRadius:18,padding:24,background:'#151626',display:'flex',flexDirection:'column'}}>
     {plan.badge && <p style={{color:'#080912',background:'#cdff14',display:'inline-block',alignSelf:'flex-start',padding:'4px 10px',borderRadius:999,fontSize:12,fontWeight:700}}>{plan.badge}</p>}
     <h2 style={{fontSize:22,margin:'8px 0 4px'}}>{plan.name}</h2>
     <p style={{color:'#a9aabc',margin:0}}>{plan.audience}</p>
     <p style={{fontSize:40,fontWeight:800,margin:'16px 0 0'}}>{money(price,'GBP')}<span style={{fontSize:14,color:'#aaa'}}> / month</span></p>
     <p style={{color:'#d2c8ff',fontWeight:700,margin:'10px 0 0'}}>{CREDITS[plan.key]} credits / month</p>
     <p style={{color:'#9b9db0',fontSize:13,lineHeight:1.5,margin:'12px 0 20px'}}>Credit charges depend on video duration (3–30 seconds), model and resolution. Actual generation is disabled until provider prices and safeguards are validated.</p>
     <SubscribeButton plan={plan.key} currency="GBP" style={{marginTop:'auto',width:'100%',background:'#cdff14',color:'#080912',padding:'12px 16px',borderRadius:10,fontWeight:800,border:'none',cursor:'pointer',fontSize:16}} />
    </article>;
   })}

   <article style={{border:'1px solid #303146',borderRadius:18,padding:24,background:'#151626',display:'flex',flexDirection:'column'}}>
    <h2 style={{fontSize:22,margin:'8px 0 4px'}}>Enterprise</h2>
    <p style={{color:'#a9aabc',margin:0}}>For teams and organisations</p>
    <p style={{fontSize:28,fontWeight:800,margin:'16px 0 0'}}>Custom pricing</p>
    <p style={{color:'#9b9db0',fontSize:13,lineHeight:1.5,margin:'12px 0 20px'}}>Tell us about your team and we will put together a plan. Enterprise accounts are set up by our sales team.</p>
    <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('Enterprise enquiry')}`} style={{marginTop:'auto',textAlign:'center',border:'1px solid #51496e',color:'#c5baff',padding:'12px 16px',borderRadius:10,fontWeight:800,textDecoration:'none'}}>Contact sales</a>
    <p style={{color:'#7d8095',fontSize:12,marginTop:10}}>KreativeStudios4K Sales</p>
   </article>
  </section>

  <section style={{maxWidth:1100,margin:'56px auto 0'}}>
   <h2 style={{textAlign:'center',fontSize:'clamp(24px,3vw,34px)'}}>Why K4K APP</h2>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginTop:24}}>
    {WHY.map(item=><article key={item.title} style={{border:'1px solid #303146',borderRadius:14,padding:20,background:'#101120'}}>
     <h3 style={{fontSize:18,margin:'0 0 8px',color:'#cdff14'}}>{item.title}</h3>
     <p style={{color:'#b5b5c8',lineHeight:1.6,margin:0}}>{item.body}</p>
    </article>)}
   </div>
  </section>
 </main>;
}
