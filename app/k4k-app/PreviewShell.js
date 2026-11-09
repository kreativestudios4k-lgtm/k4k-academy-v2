'use client';
import Link from 'next/link';
import './preview.css';
import {useK4KLocale} from './locale';

const navigation=[
 {href:'/k4k-app',symbol:'⌂',title:'Explore',active:'Home'},
 {href:'/k4k-app/videos',symbol:'▦',title:'Projects',active:'Videos'},
 {href:'/k4k-app/creator',symbol:'✦',title:'Create',active:'Creator'},
 {href:'/k4k-app/credits',symbol:'◎',title:'Plans',active:'Credits'},
 {href:'/k4k-app/account',symbol:'♙',title:'Account',active:'Account'}
];
const translations={
 pt:{Explore:'Explorar',Projects:'Projetos',Create:'Criar',Plans:'Planos',Account:'Conta'},
 es:{Explore:'Explorar',Projects:'Proyectos',Create:'Crear',Plans:'Planes',Account:'Cuenta'}
};
export default function PreviewShell({active,children}){
 const {locale}=useK4KLocale();
 const labels=translations[locale]||{};
 return <div className="k4k-light">
  <header className="k4k-global-header">
   <Link className="k4k-global-brand" href="/k4k-app">✦ K4K <b>APP</b></Link>
   <nav aria-label="Customer links"><Link href="/k4k-app/support">Help & support</Link><Link href="/academy">My Academy</Link></nav>
  </header>
  <main className="k4k-light-main">{children}</main>
  <nav className="k4k-light-nav" aria-label="K4K APP primary navigation">
   {navigation.map(item=><Link key={item.href} href={item.href} className={active===item.active?'active':''} aria-current={active===item.active?'page':undefined}><span aria-hidden="true">{item.symbol}</span><small>{labels[item.title]||item.title}</small></Link>)}
  </nav>
 </div>;
}
