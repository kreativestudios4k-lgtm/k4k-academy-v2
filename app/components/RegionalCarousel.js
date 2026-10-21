'use client';

import {useRef,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight} from 'lucide-react';

const sprite='/images/k4k-academy-carousel-sprite.webp';
const sharedSlides=[
 {key:'pitch',position:'0% 100%',label:'K4K Academy football creative in a white kit on the pitch, without text'},
 {key:'locker',position:'100% 100%',label:'K4K Academy masked football creative in a dark kit, seated in a cinematic locker room, without text'}
];

export default function RegionalCarousel({initialMarket='eu',checkout,promotionActive=true}){
 const [market,setMarket]=useState(initialMarket==='br'?'br':'eu');
 const [slide,setSlide]=useState(0);
 const touchStart=useRef(null);
 const isBrazil=market==='br';
 const slides=[
  {key:'cover',position:isBrazil?'100% 0%':'0% 0%',
   label:isBrazil?'K4K Academy Brazil, 70% off the first month, R$14,99 and code K4K70':'K4K Academy UK and Europe, 70% off the first month, £2.40 and code K4K70'},
  ...sharedSlides
 ];
 const current=slides[slide];
 const go=(direction)=>setSlide(i=>(i+direction+slides.length)%slides.length);
 const selectMarket=(next)=>{setMarket(next);setSlide(0)};
 const copy=isBrazil
  ?{heading:'COMECE A CRIAR',action:'ENTRAR NA ACADEMY',note:'Primeiro mês com o código K4K70. A renovação é mensal. Confirme o preço final e a moeda no checkout.'}
  :{heading:'START CREATING',action:'JOIN THE ACADEMY',note:'Use K4K70 for your first month. The subscription renews monthly. Confirm your final price and currency at checkout.'};
 return <section className="k4k-market-carousel" id="join" aria-label="K4K Academy regional image gallery">
  <div className="k4k-carousel-top">
   <span className="k4k-carousel-eyebrow">K4K ACADEMY / CREATOR SCHOOL</span>
   <div className="k4k-market-switch" role="group" aria-label="Select your market">
    <button type="button" aria-pressed={!isBrazil} className={!isBrazil?'selected':''} onClick={()=>selectMarket('eu')}>UK / EUROPE · £</button>
    <button type="button" aria-pressed={isBrazil} className={isBrazil?'selected':''} onClick={()=>selectMarket('br')}>BRASIL · R$</button>
   </div>
  </div>
  <div className="k4k-carousel-stage">
   <button type="button" className="k4k-carousel-arrow" aria-label="Previous picture" onClick={()=>go(-1)}><ChevronLeft size={23}/></button>
   <div className="k4k-carousel-picture-wrap"
      onTouchStart={e=>{touchStart.current=e.changedTouches[0].screenX}}
      onTouchEnd={e=>{if(touchStart.current===null)return;const delta=e.changedTouches[0].screenX-touchStart.current;touchStart.current=null;if(Math.abs(delta)>50)go(delta<0?1:-1)}}
   >
    {slide===0&&!promotionActive?
     <div className="k4k-carousel-expired-cover"><span>K4K ACADEMY</span><strong>LEARN TO<br/>CREATE WITH<br/><em>INTENTION.</em></strong><p>The K4K Academy course and practical workflows are open for new members.</p><p>Subscription price and currency confirmed at checkout.</p></div>
     :slide===0
      ?<a className="k4k-carousel-picture" key={current.key+'-'+market} href={checkout} aria-label={isBrazil?'Entrar na K4K Academy — abrir pagamento Stripe':'Join K4K Academy — open secure Stripe checkout'} style={{backgroundImage:`url("${sprite}")`,backgroundPosition:current.position}}/>
      :<div className="k4k-carousel-picture" key={current.key+'-'+market} role="img" aria-label={current.label} style={{backgroundImage:`url("${sprite}")`,backgroundPosition:current.position}}/>
    }
   </div>
   <button type="button" className="k4k-carousel-arrow" aria-label="Next picture" onClick={()=>go(1)}><ChevronRight size={23}/></button>
  </div>
  <div className="k4k-carousel-footer">
   <div className="k4k-carousel-dots" role="group" aria-label="Select image">
    {slides.map((s,i)=><button key={s.key} type="button" aria-label={`Show image ${i+1} of ${slides.length}`} aria-current={slide===i?'true':undefined} className={slide===i?'active':''} onClick={()=>setSlide(i)}/>)}
   </div>
   <span className="k4k-carousel-progress">0{slide+1} / 03</span>
  </div>
  <div className="k4k-carousel-action"><div><strong>{copy.heading}</strong><p>{slide===0&&promotionActive?copy.note:'Real projects, practical prompts and an honest production method. No guaranteed viral results.'}</p></div><a className="idea-button" href={checkout}>{copy.action}<ArrowUpRight size={19}/></a></div>
 </section>;
}
