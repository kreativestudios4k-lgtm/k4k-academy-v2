import catalogue from '../../../k4k-app/template-catalogue.json';
import {generationReference} from '../../../../lib/template-generation.mjs';
import {higgsfieldFlowEnabled} from '../../../../lib/server/higgsfield-release-policy.mjs';
import {genjutsuCustomerMaxUsd} from '../../../../lib/server/higgsfield-genjutsu-motion.mjs';

export const dynamic='force-dynamic';
export async function GET(){
 const gallery=catalogue.discoveryPreviews.filter(item=>item.k4kOriginal&&item.videoUrl);
 const templates=gallery.filter(item=>{
  const ref=generationReference(item,{maxSeconds:30});
  return ref.supported&&ref.seconds>=4&&!item.generationPaused&&!item.previewOnly;
 });
 const approvedLite=process.env.K4K_HIGGSFIELD_LIGHT_RATE_CARD_APPROVED==='true';
 const maxUsd=Number(process.env.K4K_GENERATION_MAX_USD);
 const usdPerCredit=Number(process.env.K4K_PROVIDER_USD_PER_CREDIT);
 const enabled=higgsfieldFlowEnabled()&&Number.isFinite(maxUsd)&&maxUsd>0&&maxUsd<=5&&Number.isFinite(usdPerCredit)&&usdPerCredit>0;
 let qualityCaps={};
 if(enabled){
  for(const quality of ['480p','720p','1080p']){
   try{qualityCaps[quality]=genjutsuCustomerMaxUsd(quality)}
   catch{qualityCaps[quality]=0}
  }
 }
 return Response.json({
  enabled,
  liteEnabled:enabled&&approvedLite,
  maxUsd:enabled?maxUsd:null,
  usdPerCredit:enabled?usdPerCredit:null,
  qualityCaps,
  templates:enabled?templates:[],
  gallery,
 },{headers:{'Cache-Control':'private, no-store'}});
}
