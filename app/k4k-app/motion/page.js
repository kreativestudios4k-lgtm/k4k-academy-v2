import MotionEditor from './MotionEditor';
import MotionStudio from '../higgsfield-preview/page';
import catalogue from '../template-catalogue.json';
import {generationReference} from '../../../lib/template-generation.mjs';
import {higgsfieldFlowEnabled} from '../../../lib/server/higgsfield-release-policy.mjs';
import {genjutsuCustomerMaxUsd} from '../../../lib/server/higgsfield-genjutsu-motion.mjs';
export const dynamic='force-dynamic';
export const metadata={title:'K4K Motion — Director Studio | K4K APP',description:'Choose a motion template or upload your video, assign your characters and generate with K4K Motion.'};
export default async function MotionPage({searchParams}){
 const params=await searchParams;
 const requestedTemplate=typeof params?.template==='string'&&/^k4k-\d{3}$/.test(params.template)?params.template:'';
 if(!higgsfieldFlowEnabled())return <MotionEditor initialTemplateId={requestedTemplate}/>;
 const originals=catalogue.discoveryPreviews.filter(t=>t.k4kOriginal&&t.videoUrl);
 const templates=originals.filter(t=>{const r=generationReference(t);return r.supported&&r.seconds>=4&&!t.generationPaused&&!t.previewOnly;});
 const initialTemplateId=templates.some(t=>t.id===requestedTemplate)?requestedTemplate:'';
 return <MotionStudio customer initialTemplateId={initialTemplateId} templates={templates} gallery={originals} maxUsd={Number(process.env.K4K_GENERATION_MAX_USD)||1.60} qualityCaps={{'480p':genjutsuCustomerMaxUsd('480p'),'720p':genjutsuCustomerMaxUsd('720p'),'1080p':genjutsuCustomerMaxUsd('1080p')}} usdPerCredit={Number(process.env.K4K_PROVIDER_USD_PER_CREDIT)||0.10}/>;
}
