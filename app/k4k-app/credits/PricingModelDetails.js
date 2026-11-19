'use client';
import Link from 'next/link';
import {publicCreationModels} from '../../../lib/creation-studio-catalog.mjs';
import './pricing-models.css';

const copy=(locale,en,pt,es)=>locale==='pt'?pt:locale==='es'?es:en;
const included=[
 ['Image and video model selector','Seletor de modelos de imagem e vídeo','Selector de modelos de imagen y vídeo'],
 ['K4K Motion templates and creator workspace','Templates do K4K Motion e estúdio criativo','Plantillas de K4K Motion y estudio creativo'],
 ['Private generation library and downloads','Biblioteca privada de criações e downloads','Biblioteca privada de creaciones y descargas']
];
const focus={
 starter:['For first projects and occasional posts','Para os primeiros projetos e posts ocasionais','Para primeros proyectos y publicaciones ocasionales'],
 creator:['For regular social content and viral ideas','Para conteúdos frequentes e tendências virais','Para contenido frecuente y tendencias virales'],
 pro:['For frequent video production and advanced projects','Para produção frequente de vídeos e projetos avançados','Para producción frecuente y proyectos avanzados'],
 studio:['For agencies, brands and high-volume campaigns','Para agências, marcas e campanhas frequentes','Para agencias, marcas y campañas frecuentes']
};
const groupCopy={
 image:{
  heading:['AI IMAGE','IMAGEM COM IA','IMAGEN CON IA'],
  description:['Create artwork, visual concepts and reference images.','Crie artes, conceitos visuais e imagens de referência.','Crea artes, conceptos visuales e imágenes de referencia.']
 },
 video:{
  heading:['AI VIDEO','VÍDEO COM IA','VÍDEO CON IA'],
  description:['Generate clips using familiar models and selectable quality.','Gere vídeos usando modelos conhecidos e opções de qualidade.','Genera vídeos con modelos conocidos y calidad seleccionable.']
 },
 motion:{
  heading:['K4K MOTION','K4K MOTION','K4K MOTION'],
  description:['Recreate movement and character-driven scenes with your references.','Recrie movimentos e cenas com personagens usando suas referências.','Recrea movimientos y escenas con personajes usando tus referencias.']
 },
 business:{
  heading:['BUSINESS STUDIO · SEEDANCE','BUSINESS STUDIO · SEEDANCE','BUSINESS STUDIO · SEEDANCE'],
  description:['Brand campaigns, commercial storytelling and premium video workflows.','Campanhas de marca, publicidade e produção de vídeos premium.','Campañas de marca, publicidad y vídeo premium.']
 }
};
const allVideos=publicCreationModels('video');
const groups=[
 {id:'image',models:publicCreationModels('image')},
 {id:'video',models:allVideos.filter(m=>m.category==='video-create'&&!m.id.startsWith('seedance'))},
 {id:'motion',models:allVideos.filter(m=>m.category==='premium-motion')},
 {id:'business',models:allVideos.filter(m=>m.id.startsWith('seedance'))}
].filter(group=>group.models.length>0);

export function PlanBenefits({plan,locale='en'}){
 const t=(en,pt,es)=>copy(locale,en,pt,es);
 return <div className="k4k-pricing-plan-detail">
  <strong className="k4k-pricing-includes">{t('EVERY PLAN INCLUDES','TODOS OS PLANOS INCLUEM','TODOS LOS PLANES INCLUYEN')}</strong>
  <ul>{included.map(item=><li key={item[0]}>{t(...item)}</li>)}</ul>
  <div className="k4k-pricing-fit"><b>{t('BEST FOR','IDEAL PARA','IDEAL PARA')}</b><span>{t(...focus[plan])}</span></div>
 </div>;
}
export default function PricingModelDetails({locale='en'}){
 const t=(en,pt,es)=>copy(locale,en,pt,es);
 return <section className="k4k-pricing-model-catalog" aria-labelledby="k4k-pricing-models-title">
  <div className="k4k-pricing-model-header">
   <span className="k4k-workspace-eyebrow">{t('YOUR CREATIVE TOOLKIT','SEU KIT DE FERRAMENTAS','TUS HERRAMIENTAS CREATIVAS')}</span>
   <h2 id="k4k-pricing-models-title">{t('Choose your model. Create your way.','Escolha seu modelo. Crie do seu jeito.','Elige tu modelo. Crea a tu manera.')}</h2>
   <p>{t('One credit balance for the K4K tools that are enabled for your account. A model listed here does not mean paid generation is enabled yet. See the Studio for each model’s actual availability and credit quote.','Um saldo de créditos para as ferramentas K4K habilitadas na sua conta. Um modelo nesta lista não significa geração paga ativa. Consulte o estúdio para verificar a disponibilidade e o custo de cada geração.','Un saldo de créditos para las herramientas K4K habilitadas en tu cuenta. Un modelo en esta lista no significa generación de pago activa. Consulta el estudio para ver disponibilidad y coste.')}</p>
  </div>
  <div className="k4k-pricing-model-groups">
   {groups.map(group=><article className="k4k-pricing-model-group" key={group.id}>
    <div className="k4k-pricing-model-group-heading">
     <div><h3>{t(...groupCopy[group.id].heading)}</h3><p>{t(...groupCopy[group.id].description)}</p></div>
     <span>{group.models.length} {t('models','modelos','modelos')}</span>
    </div>
    <div className="k4k-pricing-model-items">
     {group.models.map(model=><Link key={model.id} href={'/k4k-app/create?kind='+encodeURIComponent(model.kind)+'&model='+encodeURIComponent(model.id)} className="k4k-pricing-model-item">
      <div><b>{model.name}</b><small>{model.resolution.join(' · ')}{model.duration?' · '+model.duration[0]+(model.duration[1]!==model.duration[0]?'–'+model.duration[1]:'')+'s':''}</small></div>
      <span aria-hidden="true">↗</span>
     </Link>)}
    </div>
   </article>)}
  </div>
  <p className="k4k-pricing-model-caveat">{t('Premium models, resolutions and modes depend on the provider, account permissions and available credits. We do not offer unlimited generation or promise high-resolution modes that are not yet configured.','Modelos premium, resoluções e modos dependem do fornecedor, das permissões da conta e dos créditos disponíveis. Não oferecemos geração ilimitada nem prometemos resoluções ainda não configuradas.','Los modelos premium, resoluciones y modos dependen del proveedor, permisos de cuenta y créditos disponibles. No ofrecemos generación ilimitada ni prometemos resoluciones aún no configuradas.')}</p>
 </section>;
}
