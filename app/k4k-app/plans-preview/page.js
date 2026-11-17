import Link from 'next/link';
import {K4K_V2_PLANS,v2PreviewAllowed,K4K_PROVIDER_COST_POLICY} from '../../../lib/k4k-plan-v2.mjs';
export const metadata={title:'2026 plans preview | K4K APP',robots:{index:false,follow:false}};
export default function PlansPreview(){
 if(!v2PreviewAllowed())return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#080a0e',color:'#fff',fontFamily:'sans-serif'}}><p>Preview unavailable.</p></main>;
 const plans=Object.values(K4K_V2_PLANS);
 const format=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p.gbpMinor/100);
 return <main style={{minHeight:'100vh',color:'#fafafa',background:'radial-gradient(ellipse at 50% 0%,#24362a 0%,#101414 44%,#080a0c 90%)',padding:'48px 18px',fontFamily:'Inter,Arial,sans-serif'}}>
  <div style={{maxWidth:1240,margin:'0 auto'}}>
   <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
    <Link href="/k4k-app" style={{color:'white',fontWeight:800,fontSize:20,textDecoration:'none'}}>K4K <span style={{color:'#a3ff9b'}}>APP</span></Link>
    <span style={{border:'1px solid #748a77',background:'#23342a',padding:'9px 14px',borderRadius:999,fontSize:11,fontWeight:750,letterSpacing:2}}>PREVIEW ONLY · CHECKOUT DISABLED</span>
   </header>
   <section style={{textAlign:'center',padding:'74px 0 44px'}}>
    <div style={{color:'#a3ff9b',fontWeight:700,letterSpacing:3,fontSize:12}}>THE CREATOR ECONOMY, REIMAGINED</div>
    <h1 style={{fontSize:'clamp(40px,6vw,80px)',letterSpacing:'-0.065em',lineHeight:1.03,maxWidth:900,margin:'24px auto'}}>Create more. Pay less per creation.</h1>
    <p style={{maxWidth:710,margin:'0 auto',fontSize:16,lineHeight:1.7,color:'#adb5ae'}}>Four flexible creator plans with more monthly credits. The same models for every creator; premium plans add more capacity and faster workflow.</p>
   </section>
   <section aria-label="New K4K monthly plans" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(238px,1fr))',gap:16}}>
    {plans.map(p=><article key={p.key} style={{position:'relative',border:p.featured?'2px solid #a2ff9b':'1px solid #343f38',background:p.featured?'linear-gradient(160deg,#22392a,#101815)':'linear-gradient(155deg,#181e1c,#101312)',borderRadius:24,padding:'28px 24px',display:'flex',flexDirection:'column',minHeight:440}}>
     {p.featured&&<div style={{position:'absolute',top:-14,right:20,background:'#a3ff9b',color:'#0c1d10',borderRadius:999,padding:'7px 14px',fontSize:11,fontWeight:900,letterSpacing:1}}>MOST POPULAR</div>}
     <div style={{fontSize:14,color:'#d7e5d9',fontWeight:800}}>{p.name.toUpperCase()}</div>
     <p style={{color:'#a5b0a8',minHeight:37,fontSize:13}}>{p.description}</p>
     <div style={{margin:'12px 0 0',fontSize:42,fontWeight:900,letterSpacing:-2}}>{format(p)}<span style={{fontSize:13,color:'#adb5ae',fontWeight:500,letterSpacing:0}}> / month</span></div>
     <div style={{background:'#202d25',border:'1px solid #344b39',borderRadius:16,padding:16,margin:'20px 0'}}><strong style={{fontSize:32,color:'#b0ffa8'}}>{p.credits.toLocaleString('en-GB')}</strong><div style={{fontSize:12,color:'#b7c8b9'}}>monthly generation credits</div></div>
     <ul style={{margin:'0 0 26px',padding:'0 0 0 20px',fontSize:13,lineHeight:2.1,color:'#c6d3c9',flex:1}}>
      <li>All available K4K AI models</li>
      <li>Video and image generations</li>
      <li>Character swap & creator templates</li>
      <li>{p.concurrency} simultaneous {p.concurrency===1?'generation':'generations'}</li>
      <li>Private library and downloads</li>
     </ul>
     <span aria-disabled="true" style={{display:'block',textAlign:'center',borderRadius:14,padding:'15px',background:p.featured?'#a3ff9b':'#303b34',color:p.featured?'#112017':'#bfcac1',fontWeight:850,fontSize:13}}>COMING SOON · PREVIEW</span>
    </article>)}
   </section>
   <section style={{borderTop:'1px solid #344139',marginTop:52,paddingTop:27,color:'#a3afa5',fontSize:13,lineHeight:1.7}}>
    <strong style={{color:'#fff'}}>Existing members are protected.</strong> Current subscribers keep their original Stripe price and monthly credit allowance unless they explicitly opt in to a future migration. This page takes no payments and does not alter your subscription. Model generation costs are quoted individually after verified provider pricing; high-cost generations are unavailable until the budget ledger supports them.
    <p>GBP prices are tax-inclusive where tax applies. New subscriptions and other currencies are not open here. Current provider risk budget: maximum USD {K4K_PROVIDER_COST_POLICY.maxProviderUsdPerJob} per job until further verification.</p>
   </section>
  </div>
 </main>;
}
