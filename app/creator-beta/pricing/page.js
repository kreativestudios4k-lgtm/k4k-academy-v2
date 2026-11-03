import Link from 'next/link';

export const metadata={title:'K4K APP | Creator Beta Pricing Preview'};
const plans=[
 {name:'Starter',monthly:799},
 {name:'Creator',monthly:1499},
 {name:'Pro',monthly:2999},
 {name:'Studio',monthly:5999},
];
const money=p=>(p/100).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
const discount=50;
export default function BetaPricing(){
 return <main style={{minHeight:'100vh',background:'#080912',color:'#f7f7fb',padding:'44px max(20px,5vw)',fontFamily:'Arial,sans-serif'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
   <Link href="/" style={{color:'white',fontWeight:800,textDecoration:'none',fontSize:22}}>K4K APP</Link>
   <Link href="/academy" style={{color:'#b5a9ff'}}>Existing subscribers → Academy</Link>
  </header>
  <section style={{maxWidth:900,margin:'70px auto 32px',textAlign:'center'}}>
   <p style={{color:'#a997ff',letterSpacing:2,fontSize:12,fontWeight:700}}>INVITE-ONLY • PRICING PREVIEW</p>
   <h1 style={{fontSize:'clamp(32px,5vw,56px)',lineHeight:1.1}}>Founding creator beta</h1>
   <p style={{color:'#b6b8c8',fontSize:18}}>A proposed 50% introductory discount for the first 25 approved creators, for their first 3 months. Pricing is provisional and no checkout is active.</p>
  </section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,maxWidth:1100,margin:'0 auto'}}>
   {plans.map(plan=><article key={plan.name} style={{border:'1px solid #303146',borderRadius:18,padding:24,background:'#151626'}}>
    <h2 style={{fontSize:20}}>{plan.name}</h2>
    <p style={{color:'#a9aabc'}}>Proposed beta rate</p>
    <p style={{fontSize:36,fontWeight:800,margin:'8px 0'}}>{money(plan.monthly*(100-discount)/100)}<span style={{fontSize:14,color:'#aaa'}}> / month</span></p>
    <p style={{color:'#b5b5c8'}}>Regular price: {money(plan.monthly)} / month</p>
    <p style={{color:'#d2c8ff',fontSize:13}}>Credit allowance pending provider cost verification</p>
    <div style={{border:'1px solid #51496e',borderRadius:10,padding:12,textAlign:'center',marginTop:22,color:'#c5baff'}}>Checkout not enabled</div>
   </article>)}
  </section>
  <section style={{maxWidth:850,margin:'42px auto',color:'#b8b9c9',lineHeight:1.7}}>
   <h2 style={{color:'white'}}>Before subscriptions open</h2>
   <p>Invitation eligibility, credit costs, payment webhook handling, renewal pricing, refunds and the generation pipeline must pass end-to-end tests. The discount is limited to 25 invited accounts, not the first 25 anonymous visitors. Existing Academy subscribers keep their current entitlements and billing.</p>
   <p>After month 3 the proposed price returns to the regular monthly rate, subject to explicit acceptance of the final terms before any payment. No payment will be collected on this preview.</p>
  </section>
 </main>;
}
