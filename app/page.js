import {headers} from 'next/headers';
import RegionalCarousel from './components/RegionalCarousel';
import {IdeaHeader} from './components/IdeaUI';

const checkout='https://buy.stripe.com/dRmbJ293u6d7egQ8CseEo0n';

export const dynamic='force-dynamic';
export const metadata={
 title:'K4K Academy — AI Video Workflows & Creator Education',
 description:'Learn practical AI video creation, character consistency and production workflows with K4K Academy. Secure recurring membership, regional first-month offers and an honest approach to creative learning.'
};

export default async function Home({searchParams}){
 const requestHeaders=await headers();
 const params=await searchParams;
 const marketOverride=typeof params?.market==='string'?params.market.toLowerCase():'';
 const country=(requestHeaders.get('x-vercel-ip-country')||requestHeaders.get('cf-ipcountry')||'').toUpperCase();
 const isBrazil=marketOverride==='br'||(marketOverride!=='eu'&&(country==='BR'||(!country&&/pt-BR/i.test(requestHeaders.get('accept-language')||''))));
 const showFirstMonthOffer=Date.now()<Date.UTC(2026,9,28,23,59,0);
 return <main className="ideaSite k4kLanding" id="top">
  <IdeaHeader/>
  <RegionalCarousel initialMarket={isBrazil?'br':'eu'} checkout={checkout} promotionActive={showFirstMonthOffer}/>
 </main>;
}
