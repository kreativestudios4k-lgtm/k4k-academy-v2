'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {createClient} from '../../lib/supabase/client';
import {studioDestination} from '../../lib/customer-routes.mjs';
import {useVerifiedAccount} from './useVerifiedAccount';
import {useK4KLocale} from './locale';
import AccountMenu from './AccountMenu';
export default function AccountStatus(){
 const {user,ready}=useVerifiedAccount();const pathname=usePathname();
 const {locale}=useK4KLocale();const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [walletState,setWalletState]=useState({owner:null,balance:null}),[next,setNext]=useState('/k4k-app/creator');
 const balance=walletState.owner===user?.id?walletState.balance:null;
 useEffect(()=>{setNext(studioDestination(window.location.pathname+window.location.search))},[pathname]);
 useEffect(()=>{let alive=true;setWalletState({owner:null,balance:null});if(!user?.id)return;
 const client=createClient();async function refresh(){try{const {data:{session}}=await client.auth.getSession();if(!session||session.user.id!==user.id)return;const response=await fetch('/api/billing/account',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});const wallet=response.ok?await response.json():null;if(alive)setWalletState({owner:user.id,balance:wallet?.creditBalance??null})}catch{}}
 refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000);return()=>{alive=false;clearInterval(timer)}
 },[user?.id]);
 if(!ready)return <span className="k4k-account-status" aria-live="polite">{tr('Account','Conta','Cuenta')}</span>;
 if(!user)return <Link href={'/login?next='+encodeURIComponent(next)} className="k4k-account-status">{tr('Sign in','Entrar','Iniciar sesión')}</Link>;
 return <><Link href="/k4k-app/credits" className="k4k-account-status" aria-label={tr('View your credits','Ver seus créditos','Ver tus créditos')}>{balance===null?tr('My credits','Meus créditos','Mis créditos'):balance+' '+tr('credits','créditos','créditos')}</Link><AccountMenu user={user} key={user.id}/></>
}
