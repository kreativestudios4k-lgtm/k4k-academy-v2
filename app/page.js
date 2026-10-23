import {headers} from 'next/headers';
import ImmersiveHero from './components/ImmersiveHero';
import './immersive-hero.css';
import {IdeaHeader} from './components/IdeaUI';
import {getK4KDisplayPricing} from '../lib/k4k-display-pricing';

const checkout='https://buy.stripe.com/dRmbJ293u6d7egQ8CseEo0n';

export const dynamic='force-dynamic';
export const metadata={
 title:'K4K Academy — Your AI Style Needs a System',
 description:'Learn practical AI video creation, character consistency and production workflows with K4K Academy. Secure recurring membership and regional currency pricing verified at checkout.'
};

export default async function Home(){
 const requestHeaders=await headers();
 // Vercel attaches this country code based on the visitor's IP at the edge.
 // It is processed on the server, not displayed and not written to a cookie.
 const country=requestHeaders.get('x-vercel-ip-country')||
   requestHeaders.get('cf-ipcountry')||
   requestHeaders.get('x-k4k-country')||'';
 const pricing=getK4KDisplayPricing(country);
 const showFirstMonthOffer=Date.now()<Date.UTC(2026,9,28,23,59,0);
 return <main className="ideaSite k4kLanding" id="top">
  <IdeaHeader/>
  <ImmersiveHero locale={pricing.locale} pricing={pricing} checkout={checkout} promotionActive={showFirstMonthOffer}/>
 </main>;
}
