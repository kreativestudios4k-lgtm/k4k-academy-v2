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
 const [question,setQuestion]=useState(''),[messages,setMessages]=useState([]);
 function askSupport(value){const q=value.trim();if(!q)return;const t=q.toLowerCase();let answer;
 if(/credit|crédito|billing|payment|pix|pagamento|plan|plano/.test(t))answer=locale==='pt'?'Confira seus planos e créditos na aba Planos. O custo exato é exibido antes de confirmar a geração. Para problemas de cobrança, fale com nosso suporte.':'Open Plans to review your credits and subscriptions. The verified generation cost is shown before confirmation. For billing issues, contact our support team.';
 else if(/download|baixar|library|biblioteca|status/.test(t))answer=locale==='pt'?'Abra Biblioteca para verificar o status e baixar seus vídeos concluídos.':'Open Library to check generation status and download completed videos.';
 else if(/template|video|vídeo|photo|foto|generat|gera|upload|erro|error/.test(t))answer=locale==='pt'?'No Criador, escolha um template ou envie um MP4 de 2 a 15 segundos e até 8 fotos. Confira os créditos antes de confirmar. Se houver erro, envie a mensagem de erro ao suporte.':'In Creator, select a template or upload a 2–15 second MP4 and up to 8 photos. Review the credit cost before confirming. If an error persists, send its message to support.';
 else answer=locale==='pt'?'Não tenho uma resposta específica para isso. Use a central de ajuda ou envie um email à equipe K4K.':'I do not have a specific answer for that. Use the help centre or email the K4K team.';
 setMessages(old=>[...old,{q,answer}]);setQuestion('');
 }
 const labels=translations[locale]||{};
 return <div className={'k4k-light'+(studio?' k4k-studio-shell':'')}>
  <header className="k4k-global-header">
   <Link className="k4k-global-brand" href="/k4k-app/creator"><img src="/k4k-mark.svg" alt="" width="34" height="34"/> <span>K4K <b>APP</b></span></Link>
   {studio&&<nav className="k4k-studio-topnav" aria-label="Studio navigation"><Link href="/k4k-app/explore">{labels.Explore||'Explore'}</Link><Link href="/k4k-app/creator" aria-current={active==='Creator'?'page':undefined}>{locale==='pt'?'Criar vídeo':locale==='es'?'Crear vídeo':'Create video'}</Link><Link href="/k4k-app/videos" aria-current={active==='Videos'?'page':undefined}>{locale==='pt'?'Minha biblioteca':locale==='es'?'Mi biblioteca':'My library'}</Link><Link href="/k4k-app/credits">{labels.Plans||'Plans'}</Link></nav>}
   <nav className="k4k-customer-nav" aria-label="Customer links"><LanguageSwitcher/><AccountStatus/></nav>
  </header>
  <main className="k4k-light-main">{children}</main>
  <div className="k4k-support-dock"><button type="button" className="k4k-support-fab" aria-label={supportOpen?"Close support":"Open support"} aria-expanded={supportOpen} aria-controls="k4k-support-panel" onClick={()=>setSupportOpen(v=>!v)}>{supportOpen?<X size={23}/>:<MessageCircle size={23}/>}<span>Support</span></button>{supportOpen&&<section className="k4k-support-panel" id="k4k-support-panel" aria-label="K4K support"><div className="k4k-support-panel-head"><strong>How can we help?</strong><button type="button" aria-label="Close support" onClick={()=>setSupportOpen(false)}><X size={19}/></button></div><p>{locale==='pt'?'Assistente K4K · ajuda automática':'K4K Assistant · automated help'}</p><div aria-live="polite" style={{maxHeight:220,overflowY:'auto'}}>{messages.map((m,i)=><div key={i} style={{marginBottom:12}}><strong>{m.q}</strong><p>{m.answer}</p></div>)}</div><form onSubmit={e=>{e.preventDefault();askSupport(question)}} style={{display:'flex',gap:6,marginBottom:12}}><input aria-label="Ask K4K Assistant" value={question} onChange={e=>setQuestion(e.target.value)} placeholder={locale==='pt'?'Como podemos ajudar?':'Ask a question…'} maxLength={300} style={{minWidth:0,flex:1,padding:9,background:'#222',color:'white',border:'1px solid #555',borderRadius:8}}/><button type="submit" style={{background:'#faf9f6',color:'#111',border:0,borderRadius:8,padding:9}}>↗</button></form><a href="/k4k-app/support"><HelpCircle size={18}/> Help centre & FAQs</a><a href="mailto:hello@kreativestudios4k.com?subject=K4K%20APP%20Support"><Mail size={18}/> Email K4K support</a><small>Do not share passwords or payment card details.</small></section>}</div>
  <nav className="k4k-light-nav" aria-label="K4K APP primary navigation">
   {navigation.map(item=><Link key={item.href} href={item.href} className={active===item.active?'active':''} aria-current={active===item.active?'page':undefined}><span aria-hidden="true"><item.icon size={23}/></span><small>{labels[item.title]||item.title}</small></Link>)}
  </nav>
 </div>;
}
