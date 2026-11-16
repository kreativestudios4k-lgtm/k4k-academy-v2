'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Sparkles} from 'lucide-react';
import {createClient} from '../../lib/supabase/client';
import {useVerifiedAccount} from './useVerifiedAccount';
import {useK4KLocale} from './locale';
import './early-free-offer.css';
export default function EarlyFreeOffer({studio=false,compact=false,refreshKey=null}){
 const {user,ready}=useVerifiedAccount();const {locale}=useK4KLocale();const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [gift,setGift]=useState(null);
 useEffect(()=>{let alive=true;setGift(null);if(!ready||!user?.id)return;
  const client=createClient();
  async function load(){try{const {data:{session}}=await client.auth.getSession();if(!session||session.user.id!==user.id)return;
   const r=await fetch('/api/billing/account',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});if(!r.ok)return;
   const data=await r.json();if(alive)setGift({owner:user.id,offer:data.earlyFreeGeneration});
  }catch{}}
  load();const visible=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',visible);
  const timer=setInterval(visible,30000);return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[user?.id,ready,refreshKey]);
 const offer=gift?.owner===user?.id?gift.offer:null;
 if(!offer||offer.status!=='available')return null;
 return <section className={'k4k-free-offer'+(compact?' k4k-free-offer-compact':'')} aria-label={tr('Your free generation','Sua geração grátis','Tu generación gratis')}>
  <Sparkles size={compact?16:22} aria-hidden="true"/><div><strong>{tr('Your first free K4K video is ready','Seu vídeo grátis K4K está disponível','Tu video gratis de K4K está disponible')}</strong>{!compact&&<p>{studio?tr('Upload a 2–5 second MP4 and your character photos. Select Lite 720p, review your quote and confirm at 0 credits.','Envie um MP4 de 2–5 segundos e as fotos dos personagens. Selecione Lite 720p, confira o orçamento e confirme com 0 créditos.','Sube un MP4 de 2–5 segundos y tus fotos. Selecciona Lite 720p, revisa el coste y confirma con 0 créditos.'):tr('A gift for existing creators: one video up to 5 seconds, Lite 720p. No subscription required.','Um presente para criadores existentes: um vídeo de até 5 segundos, Lite 720p. Sem assinatura.','Un regalo para creadores existentes: un video de hasta 5 segundos, Lite 720p. Sin suscripción.')}</p>}</div>{!studio&&<Link href="/k4k-app/creator">{tr('Claim','Resgatar','Canjear')} ↗</Link>}</section>
}
