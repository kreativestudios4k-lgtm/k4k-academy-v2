'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Images,Film,Clapperboard,Play} from 'lucide-react';
import {useK4KLocale} from './locale';
import './quick-create.css';

const choices={
 image:[
  {label:'Nano Banana 2.1',description:'Create a new image',url:'/k4k-app/image?model=nano_banana_2'},
  {label:'FLUX 3',description:'Create with FLUX',url:'/k4k-app/image?model=flux_3_image'}
 ],
 video:[
  {label:'Kling 4.0',description:'Text to video',url:'/k4k-app/video?model=kling4_0'},
  {label:'Seedance 2.5',description:'Cinematic video',url:'/k4k-app/video?model=seedance_2_5'},
  {label:'Wan 3',description:'Reference-led video',url:'/k4k-app/creator'}
 ],
 motion:[
  {label:'K4K Motion',description:'Swap characters from a video',url:'/k4k-app/motion'},
  {label:'Explore templates',description:'Recreate an existing scene',url:'/k4k-app/motion/explore'}
 ]
};
export default function QuickCreate(){
 const {locale}=useK4KLocale();
 const tr=(en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
 const [kind,setKind]=useState('video');
 const [selected,setSelected]=useState('Kling 4.0');
 const options=choices[kind];
 const active=options.find(x=>x.label===selected)||options[0];
 const tabs=[
  {key:'image',icon:Images,label:tr('Image','Imagem','Imagen')},
  {key:'video',icon:Film,label:tr('Video','Vídeo','Vídeo')},
  {key:'motion',icon:Clapperboard,label:'K4K Motion'}
 ];
 return <section className="kqc-wrap" aria-labelledby="kqc-title">
  <div className="kqc-inner">
   <div className="kqc-heading"><span>K4K APP / CREATE</span><h2 id="kqc-title">{tr('Make your next idea real.','Dê vida à sua próxima ideia.','Haz realidad tu próxima idea.')}</h2><p>{tr('Select your creative tool, choose a model and open the right studio.','Escolha a ferramenta, selecione um modelo e abra o estúdio certo.','Elige la herramienta, selecciona un modelo y abre el estudio adecuado.')}</p></div>
   <div className="kqc-console">
    <div className="kqc-tabs" role="tablist" aria-label={tr('Creation type','Tipo de criação','Tipo de creación')}>{tabs.map(t=><button key={t.key} type="button" role="tab" aria-selected={kind===t.key} className={kind===t.key?'active':''} onClick={()=>{setKind(t.key);setSelected(choices[t.key][0].label)}}><t.icon size={18}/>{t.label}</button>)}</div>
    <div className="kqc-fields">
     <div className="kqc-picker"><label htmlFor="kqc-model">{tr('Choose a model','Escolha um modelo','Elige un modelo')}</label><select id="kqc-model" value={active.label} onChange={e=>setSelected(e.target.value)}>{options.map(o=><option key={o.label} value={o.label}>{o.label}</option>)}</select><small>{active.description}</small></div>
     <div className="kqc-next"><span>{tr('Ready to create?','Pronto para criar?','¿Listo para crear?')}</span><Link href={active.url}>{kind==='motion'?tr('Open Motion','Abrir Motion','Abrir Motion'):tr('Open studio','Abrir estúdio','Abrir estudio')}<ArrowUpRight size={19}/></Link></div>
    </div>
    <div className="kqc-footer"><span><Play size={13}/>{tr('Explore videos and templates before you generate.','Explore vídeos e templates antes de gerar.','Explora vídeos y plantillas antes de generar.')}</span><Link href="/k4k-app/motion/explore">{tr('Explore templates','Explorar templates','Explorar plantillas')} →</Link></div>
   </div>
  </div>
 </section>;
}
