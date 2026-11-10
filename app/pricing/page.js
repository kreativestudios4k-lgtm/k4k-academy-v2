import {headers} from 'next/headers';
import {currencyForCountry} from '../../lib/k4k-market.mjs';
import Link from 'next/link';
import SubscribeButton from './SubscribeButton';
import {PLAN_PRICES} from '../../lib/k4k-plan-prices.mjs';
import '../kx-redesign.css';

export const metadata={title:'K4K APP | Pricing'};

const SALES_EMAIL='sales@kreativestudios4k.com';
const CREDITS={starter:80,creator:160,pro:340,studio:700};
const MAX_CREDITS=700;

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

export const dynamic='force-dynamic';
export default async function PricingPage(){
 const currency=currencyForCountry((await headers()).get('x-vercel-ip-country'));
 return <main className="kx-pricing">
  <header className="kx-pricing-top">
   <Link href="/" className="kx-pricing-brand">K4K<span> APP</span></Link>
   <Link href="/academy" className="kx-pricing-academy">Academy →</Link>
  </header>

  <section className="kx-pricing-hero">
   <p className="kx-pricing-kicker">Plans · Billed monthly · {currency}</p>
   <h1 className="kx-hook">Pick the plan that <em>powers your next scene.</em></h1>
   <p>Every plan includes K4K Academy. Prices exclude applicable VAT, added at checkout.</p>
   <p role="note">Preview · Stripe TEST checkout only. No live payments. AI generation is currently disabled.</p>
  </section>

  <section className="kx-plans" aria-label="Subscription plans">
   {PLANS.map(plan=>{
    const price=PLAN_PRICES[plan.key][currency];
    const meter=Math.round((CREDITS[plan.key]/MAX_CREDITS)*100);
    return <article key={plan.key} className="kx-plan">
     <div className="kx-plan-name">
      {plan.badge && <span className={plan.badge==='Best value'?'kx-badge kx-badge-alt':'kx-badge'}>{plan.badge}</span>}
      <h2>{plan.name}</h2>
      <p>{plan.audience}</p>
     </div>
     <p className="kx-price">{money(price,currency)}<small>/ month</small></p>
     <div className="kx-credits">
      <strong>{CREDITS[plan.key]} credits / month</strong>
      <div className="kx-meter" style={{'--w':`${meter}%`}} aria-hidden="true"/>
      <p className="kx-credit-note">Credit charges depend on video duration (3–30 seconds), model and resolution. Actual generation is disabled until provider prices and safeguards are validated.</p>
     </div>
     <div className="kx-plan-cta">
      <SubscribeButton plan={plan.key} currency={currency} style={{width:'100%'}} />
     </div>
    </article>;
   })}

   <article className="kx-plan">
    <div className="kx-plan-name">
     <h2>Enterprise</h2>
     <p>For teams and organisations</p>
    </div>
    <p className="kx-price">Custom pricing</p>
    <div className="kx-credits">
     <p className="kx-credit-note">Tell us about your team and we will put together a plan. Enterprise accounts are set up by our sales team.</p>
    </div>
    <div className="kx-plan-cta">
     <a className="kx-plan-cta-link" href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent('Enterprise enquiry')}`}>Contact sales</a>
     <p>KreativeStudios4K Sales</p>
    </div>
   </article>
  </section>

  <section className="kx-why">
   <h2>Why K4K APP</h2>
   <div className="kx-why-grid">
    {WHY.map(item=><article key={item.title}>
     <h3>{item.title}</h3>
     <p>{item.body}</p>
    </article>)}
   </div>
  </section>
 </main>;
}
