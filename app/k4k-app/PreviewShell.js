'use client';
import Link from 'next/link';
import {useState} from 'react';
import {MessageCircle,X,Mail,HelpCircle,Compass,Film,Sparkles,Coins,UserRound} from 'lucide-react';
import './preview.css';
import AccountStatus from './AccountStatus';
import {useK4KLocale,LanguageSwitcher} from './locale';

const navigation=[
 {href:'/k4k-app/explore',icon:Compass,title:'Explore',active:'Home'},
 {href:'/k4k-app/videos',icon:Film,title:'Library',active:'Videos'},
 {href:'/k4k-app/creator',icon:Sparkles,title:'Create',active:'Creator'},
 {href:'/k4k-app/credits',icon:Coins,title:'Plans',active:'Credits'},
 {href:'/k4k-app/account',icon:UserRound,title:'Account',active:'Account'}
];
const translations={
 pt:{Explore:'Explorar',Projects:'Projetos',Library:'Biblioteca',Create:'Criar',Plans:'Planos',Account:'Conta'},
 es:{Explore:'Explorar',Projects:'Proyectos',Library:'Biblioteca',Create:'Crear',Plans:'Planes',Account:'Cuenta'}
};
export default function PreviewShell({active,children,studio=true}){
 const {locale}=useK4KLocale();
 const [supportOpen,setSupportOpen]=useState(false);
 const labels=translations[locale]||{};
 return <div className={'k4k-light'+(studio?' k4k-studio-shell':'')}>
  <header className="k4k-global-header">
   <Link className="k4k-global-brand" href="/k4k-app/creator"><img src="/k4k-mark.svg" alt="" width="34" height="34"/> <span>K4K <b>APP</b></span></Link>
   {studio&&<nav className="k4k-studio-topnav" aria-label="Studio navigation"><Link href="/k4k-app/explore">{labels.Explore||'Explore'}</Link><Link href="/k4k-app/creator" aria-current={active==='Creator'?'page':undefined}>{locale==='pt'?'Criar vídeo':locale==='es'?'Crear vídeo':'Create video'}</Link><Link href="/k4k-app/videos" aria-current={active==='Videos'?'page':undefined}>{locale==='pt'?'Minha biblioteca':locale==='es'?'Mi biblioteca':'My library'}</Link><Link href="/k4k-app/credits">{labels.Plans||'Plans'}</Link></nav>}
   <nav aria-label="Customer links"><LanguageSwitcher/><AccountStatus/><Link className="k4k-profile-link" href="/k4k-app/account" aria-label="Your account"><UserRound size={19}/></Link></nav>
  </header>
  <main className="k4k-light-main">{children}</main>
  <div className="k4k-support-dock"><button type="button" className="k4k-support-fab" aria-label={supportOpen?"Close support":"Open support"} aria-expanded={supportOpen} aria-controls="k4k-support-panel" onClick={()=>setSupportOpen(v=>!v)}>{supportOpen?<X size={23}/>:<MessageCircle size={23}/>}<span>Support</span></button>{supportOpen&&<section className="k4k-support-panel" id="k4k-support-panel" aria-label="K4K support"><div className="k4k-support-panel-head"><strong>How can we help?</strong><button type="button" aria-label="Close support" onClick={()=>setSupportOpen(false)}><X size={19}/></button></div><p>Choose an option below. Our team responds by email.</p><a href="/k4k-app/support"><HelpCircle size={18}/> Help centre & FAQs</a><a href="mailto:hello@kreativestudios4k.com?subject=K4K%20APP%20Support"><Mail size={18}/> Email K4K support</a><small>Do not share passwords or payment card details.</small></section>}</div>
  <nav className="k4k-light-nav" aria-label="K4K APP primary navigation">
   {navigation.map(item=><Link key={item.href} href={item.href} className={active===item.active?'active':''} aria-current={active===item.active?'page':undefined}><span aria-hidden="true"><item.icon size={23}/></span><small>{labels[item.title]||item.title}</small></Link>)}
  </nav>
 </div>;
}
