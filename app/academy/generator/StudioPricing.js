'use client';
import {useState} from 'react';
const monthly=[['Starter','9.99','500'],['Creator','24.99','1,500'],['Pro','49.99','3,500']];
const packs=[['Small','4.99','200'],['Medium','12.99','600'],['Large','29.99','1,600']];
export default function StudioPricing(){
 const [tab,setTab]=useState('monthly');
 const rows=tab==='monthly'?monthly:packs;
 return <section id="pricing" style={{padding:'80px 0',borderTop:'1px solid #ffffff20'}}>
 <p style={{color:'#bba3ef',letterSpacing:2,fontSize:12}}>K4K GENERATION CREDITS</p>
 <h2 style={{fontSize:'clamp(32px,5vw,55px)',margin:'10px 0'}}>Choose your creative power.</h2>
 <p style={{color:'#a7a2b3'}}>Monthly subscriptions or flexible one-time credit packs.</p>
 <div style={{display:'flex',gap:10,margin:'26px 0'}}>
 <button type="button" onClick={()=>setTab('monthly')} aria-pressed={tab==='monthly'}>Monthly plans</button>
 <button type="button" onClick={()=>setTab('packs')} aria-pressed={tab==='packs'}>One-time packs</button>
 </div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
 {rows.map(([name,price,credits])=><article key={name} style={{border:'1px solid #66537b',background:'#18151f',padding:25,borderRadius:16}}>
 <strong style={{color:'#cbb5f8'}}>{name}</strong>
 <h3 style={{fontSize:36,margin:'18px 0'}}>£{price}<small style={{fontSize:12,color:'#a9a3b4'}}>{tab==='monthly'?'/month':' once'}</small></h3>
 <p>{credits} credits</p><button type="button" disabled>Coming soon</button>
 </article>)}</div>
 <p style={{color:'#b9a8d7',marginTop:28}}>Existing Academy members retain their current membership price and access. Studio credits are optional and separate.</p>
 <p style={{color:'#999',fontSize:12}}>Illustrative pricing only. Checkout, charging, generation and credit deductions are disabled in this preview.</p>
 </section>;
}