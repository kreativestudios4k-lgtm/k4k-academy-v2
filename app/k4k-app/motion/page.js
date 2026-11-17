import MotionEditor from './MotionEditor';
import MotionStudio from '../higgsfield-preview/page';
import catalogue from '../template-catalogue.json';
import {generationReference} from '../../../lib/template-generation.mjs';
import {higgsfieldFlowEnabled} from '../../../lib/server/higgsfield-release-policy.mjs';
export const dynamic='force-dynamic';
export const metadata={title:'K4K Motion — Director Studio | K4K APP',description:'Choose a motion template or upload your video, assign your characters and generate with K4K Motion.'};
export default function MotionPage(){
 if(!higgsfieldFlowEnabled())return <MotionEditor/>;
 const templates=[...new Map([...catalogue.trending,...catalogue.discoveryPreviews,...catalogue.topPerforming].filter(t=>{const r=generationReference(t);return r.supported&&r.seconds>=4&&!t.generationPaused;}).map(t=>[t.id,t])).values()];
 return <MotionStudio customer templates={templates} maxUsd={Number(process.env.K4K_GENERATION_MAX_USD)||1.60} usdPerCredit={Number(process.env.K4K_PROVIDER_USD_PER_CREDIT)||0.10}/>;
}
