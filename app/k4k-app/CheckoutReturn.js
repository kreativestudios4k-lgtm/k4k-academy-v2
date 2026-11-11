'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createClient} from '../../lib/supabase/client';
import {useK4KLocale} from './locale';
// Returning from Checkout is navigation, never proof of payment or a credit grant.
export default function CheckoutReturn(){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [state,setState]=useState(null),[balance,setBalance]=useState(null);
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get('checkout')!=='success')return;
  let stopped=false,timer,attempts=0;setState('checking');
  async function check(){
   try{
    const client=createClient();const {data:{user},error}=await client.auth.getUser();
    if(stopped)return;
    if(error||!user){setState('sign-in');return;}
    const [membership,wallet]=await Promise.all([
     client.from('memberships').select('status').eq('user_id',user.id).maybeSingle(),
     client.from('studio_credit_accounts').select('balance').eq('user_id',user.id).maybeSingle()
    ]);
    if(stopped)return;
    if(!membership.error&&!wallet.error&&['active','trialing'].includes(membership.data?.status)&&Number.isFinite(wallet.data?.balance)){
     setBalance(wallet.data.balance);setState('active');return;
    }
   }catch{}
   if(stopped)return;
   if(++attempts<8)timer=setTimeout(check,3000);else setState('pending');
  }
  check();return()=>{stopped=true;clearTimeout(timer)};
 },[]);
 if(!state)return null;
 return <section className="k4k-checkout-return" role="status"><strong>{state==='active'?tr('Your subscription is active','Sua assinatura está ativa','Tu suscripción está activa'):tr('Welcome to your studio','Bem-vindo ao seu estúdio','Bienvenido a tu estudio')}</strong><p>{state==='active'?tr('Current verified balance: ','Saldo atual verificado: ','Saldo actual verificado: ')+balance+tr(' credits.',' créditos.',' créditos.'):state==='sign-in'?tr('Sign in with your checkout account to see your subscription and credits.','Entre com a conta usada no checkout para ver seus créditos.','Inicia sesión con tu cuenta de compra para ver tus créditos.'):tr('We are checking your subscription. Credits appear after verified payment; returning from checkout alone does not add credits. If you already paid, do not pay again.','Estamos verificando sua assinatura. Os créditos aparecem após a confirmação do pagamento. Se já pagou, não pague novamente.','Estamos verificando tu suscripción. Los créditos aparecen tras confirmar el pago. Si ya pagaste, no vuelvas a pagar.')}</p><Link href={state==='sign-in'?'/login?next=%2Fk4k-app%2Fcreator':'/k4k-app/account'}>{tr('View account','Ver conta','Ver cuenta')} →</Link></section>;
}
