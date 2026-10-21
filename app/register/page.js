import Link from 'next/link';
import {ArrowRight,LockKeyhole,ShieldCheck} from 'lucide-react';
import Login from '../login/page';
export const dynamic='force-dynamic';
export const metadata={title:'Complete Your Purchase & Register — K4K Academy',robots:{index:false,follow:false}};
export default async function Register({searchParams}){
 const params=await searchParams;
 const checkout=typeof params?.checkout==='string'?params.checkout:'';
 const session=typeof params?.session_id==='string'?params.session_id:'';
 // A returned checkout URL only opens the account form. It never grants paid access.
 // Membership activation requires a verified email and an active Stripe-backed subscription.
 const fromCheckout=checkout==='success'&&/^cs_live_[A-Za-z0-9_]{8,170}$/.test(session);
 if(fromCheckout)return <Login initialMode="register"/>;
 return <main style={{minHeight:'100svh',background:'#070907',color:'#f2f6ee',display:'grid',placeItems:'center',padding:'28px',fontFamily:'Arial, sans-serif'}}>
  <section style={{maxWidth:600,border:'1px solid #caff3958',borderRadius:18,padding:'clamp(26px,5vw,55px)',background:'#121a0f'}}>
   <Link href="/" style={{textDecoration:'none',color:'#caff39',fontWeight:900,letterSpacing:3}}>K4K ACADEMY</Link>
   <p style={{fontSize:11,color:'#caff39',fontWeight:900,letterSpacing:2,marginTop:36}}>STEP 01 — COMPLETE PAYMENT</p>
   <h1 style={{fontSize:'clamp(36px,6vw,58px)',letterSpacing:'-.065em',lineHeight:1,margin:'15px 0'}}>PAY FIRST.<br/>THEN REGISTER.</h1>
   <p style={{fontSize:15,lineHeight:1.8,color:'#c8d2c4'}}>Account registration opens automatically after your successful K4K Academy Stripe checkout. If you have already purchased, sign in with your payment email or contact support for help activating your account. Never pay twice.</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'27px 0'}}>
    <Link href="https://buy.stripe.com/dRmbJ293u6d7egQ8CseEo0n" style={{display:'inline-flex',alignItems:'center',gap:9,background:'#caff39',color:'#0a1005',borderRadius:9,padding:'15px 18px',textDecoration:'none',fontSize:12,fontWeight:900}}>PURCHASE ACADEMY <ArrowRight size={17}/></Link>
    <Link href="/login" style={{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid #caff39',borderRadius:9,padding:'15px 18px',textDecoration:'none',color:'#caff39',fontSize:12,fontWeight:900}}>ALREADY PURCHASED? LOGIN</Link>
   </div>
   <p style={{fontSize:12,color:'#aebca7',lineHeight:1.7}}><ShieldCheck size={16} style={{display:'inline',verticalAlign:'middle'}}/> Secure payments are handled by Stripe. Student access is checked against verified email and an active paid subscription.</p>
   <p style={{fontSize:12,color:'#b7c5b1'}}>Paid previously but never created a login? <a style={{color:'#caff39'}} href="mailto:hello@kreativestudios4k.com?subject=Paid%20Academy%20registration">Contact Academy support</a>.</p>
  </section>
 </main>;
}
