'use client';
import {useRef,useState,useEffect} from 'react';
import Link from 'next/link';
import {ChevronDown,UserRound,LogOut,Film,Coins,Copy} from 'lucide-react';
import {useK4KLocale} from './locale';
import {signOutK4K} from './useVerifiedAccount';
import {k4kProfileId,profileName,profileInitials} from '../../lib/k4k-profile-id.mjs';
import './account-menu.css';
export default function AccountMenu({user,landing=false}){
 const {locale}=useK4KLocale();const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const menu=useRef(null),lock=useRef(false);const [busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const id=k4kProfileId(user?.id);
 useEffect(()=>{const close=e=>{if(menu.current&&!menu.current.contains(e.target))menu.current.open=false};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 async function logout(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await signOutK4K()}catch{setError(tr('Could not sign out. Try again.','Não foi possível sair. Tente novamente.','No se pudo cerrar sesión. Inténtalo de nuevo.'));lock.current=false;setBusy(false)}}
 async function copy(){try{await navigator.clipboard.writeText(id);setCopied(true)}catch{setError(tr('Copy the ID manually.','Copie o ID manualmente.','Copia el ID manualmente.'))}}
 if(!user)return null;
 return <details ref={menu} className={'k4k-profile-menu'+(landing?' k4k-profile-menu-landing':'')} onKeyDown={e=>{if(e.key==='Escape'){menu.current.open=false;menu.current.querySelector('summary')?.focus()}}}>
 <summary aria-label={tr('Your account menu','Menu da sua conta','Menú de tu cuenta')}><span className="k4k-profile-avatar">{profileInitials(user)}</span><ChevronDown size={13}/></summary>
 <div className="k4k-profile-popover">
 <div className="k4k-profile-identity"><strong>{profileName(user)}</strong><small>{user.email}</small></div>
 {id&&<div className="k4k-profile-id"><span>{tr('PROFILE ID','ID DO PERFIL','ID DEL PERFIL')}</span><code>{id}</code><button type="button" onClick={copy}><Copy size={14}/>{copied?tr('Copied','Copiado','Copiado'):tr('Copy ID','Copiar ID','Copiar ID')}</button></div>}
 <Link href="/k4k-app/account" onClick={()=>{menu.current.open=false}}><UserRound size={17}/>{tr('My profile','Meu perfil','Mi perfil')}</Link>
 <Link href="/k4k-app/videos" onClick={()=>{menu.current.open=false}}><Film size={17}/>{tr('My library','Minha biblioteca','Mi biblioteca')}</Link>
 <Link href="/k4k-app/credits" onClick={()=>{menu.current.open=false}}><Coins size={17}/>{tr('Plans & credits','Planos e créditos','Planes y créditos')}</Link>
 <button type="button" className="k4k-profile-logout" onClick={logout} disabled={busy}><LogOut size={17}/>{busy?tr('Signing out…','Saindo…','Cerrando sesión…'):tr('Sign out','Sair','Cerrar sesión')}</button>
 {error&&<p role="alert">{error}</p>}
 </div></details>
}
