import Link from 'next/link';
import {K4K_PLANS,K4K_PACKS,formatGbp} from '../../lib/k4k-app-pricing.mjs';
import './pricing.css';
export const metadata={title:'K4K APP — Plans & Credits (Preview)',description:'Explore draft K4K APP monthly plans and credit packs. Checkout is not live.'};
export default function PricingPage(){return <main className="price-shell">
 <header className="price-nav"><Link href="/k4k-app">K4K <span>APP</span></Link><nav><Link href="/templates">Templates</Link><Link href="/create">Create</Link><Link href="/academy">Existing members</Link></nav></header>
 <section className="price-hero"><div className="price-chip">PRICING PREVIEW · NOT FOR SALE YET</div><h1>Make more. <em>Create your way.</em></h1><p>Pick a monthly credit allowance that fits your workflow. All amounts below are proposed GBP prices; no checkout is active.</p></section>
 <section className="price-grid" aria-label="Monthly plans">{K4K_PLANS.map(plan=><article key={plan.id} className={'price-card '+(plan.featured?'price-featured':'')}>
  {plan.featured&&<span className="price-popular">MOST POPULAR</span>}<h2>{plan.name}</h2><p>{plan.description}</p><div className="price-number">{formatGbp(plan.gbpPence)}<small> / month</small></div>
  <strong className="price-credits">{plan.monthlyCredits.toLocaleString('en-GB')} credits / month</strong>
  <ul>{plan.features.map(f=><li key={f}>✓ {f}</li>)}</ul><button type="button" disabled aria-label={plan.name+' checkout coming soon'}>Coming soon</button>
 </article>)}</section>
 <section className="price-packs"><div><span className="price-chip">NEED MORE?</span><h2>One-time credit packs</h2><p>Top up without changing your monthly plan. Draft pricing only.</p></div><div className="pack-grid">{K4K_PACKS.map(pack=><article key={pack.id}><strong>{pack.credits} credits</strong><span>{formatGbp(pack.gbpPence)}</span><button type="button" disabled>Coming soon</button></article>)}</div></section>
 <aside className="price-legacy"><h2>Already a K4K Academy member?</h2><p>Your existing subscription and terms remain unchanged. These proposed K4K APP plans do not automatically replace your current membership or credits.</p><Link href="/academy">Open your Academy →</Link></aside>
 <footer>Final credit charges vary by AI model and duration. Exact model rates and payment availability will be shown before launch. No unlimited generation is promised.</footer>
 </main>}
