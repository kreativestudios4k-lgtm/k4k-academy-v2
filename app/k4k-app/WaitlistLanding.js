'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import MobileTemplateFeed from './MobileTemplateFeed';
import WaitlistSignup from './WaitlistSignup';
import {useK4KLocale} from './locale';
import './waitlist.css';
export default function WaitlistLanding(){
 const [open,setOpen]=useState(false);const dialog=useRef(null);const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current?.close()},[open]);
 return <><MobileTemplateFeed waitlist paused={open} onJoinWaitlist={()=>setOpen(true)}/><dialog ref={dialog} className="kf-launch-dialog" onCancel={()=>setOpen(false)} onClick={event=>{if(event.target===dialog.current)setOpen(false)}} aria-labelledby="launch-title"><button type="button" className="kf-launch-close" aria-label={tr('Close','Fechar','Cerrar')} onClick={()=>setOpen(false)}><X size={20}/></button><img src="/k4k-mark.svg" alt="K4K" width="32" height="32"/><span className="kf-launch-eyebrow">K4K APP / {tr('PLANNED RELEASE','LANÇAMENTO PREVISTO','LANZAMIENTO PREVISTO')}</span><h2 id="launch-title">04.12.2026</h2><p>{tr('Your ideas. Your characters. A whole new story.','Suas ideias. Seus personagens. Uma nova história.','Tus ideas. Tus personajes. Una nueva historia.')}</p><WaitlistSignup idPrefix="modal"/><p className="kf-launch-note">{tr('Launch timing is subject to final testing and provider confirmation.','Data sujeita aos testes finais e à confirmação do provedor.','Fecha sujeta a las pruebas finales y a la confirmación del proveedor.')}</p></dialog></>;
}
