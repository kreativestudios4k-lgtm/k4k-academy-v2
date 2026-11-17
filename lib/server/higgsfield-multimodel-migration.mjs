// Read-only Higgsfield migration registry for K4K APP.
// IMPORTANT: An API endpoint existing does not authorize billable customer dispatch.
// Current fal.ai customer routes remain authoritative until a separately reviewed
// signed-quote + atomic-reservation + status + private-delivery implementation passes QA.
const candidates={
 'wan-prime':{
  name:'Wan 3.0 Prime',kind:'video',source:'fal',
  apiPath:'alibaba/wan-3.0-prime/reference-to-video',
  capability:'reference-to-video',
  documentation:'https://open.higgsfield.ai/models/alibaba/wan-3.0-prime/reference-to-video/api-reference',
  gap:'Reference media roles, customer credit quote, output reconciliation and job migration must be implemented'
 },
 seedance_2_5:{
  name:'Seedance 2.5',kind:'video',source:'fal',
  apiPath:'bytedance/seedance-2.5/text-to-video',
  capability:'text-to-video',
  documentation:'https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference',
  gap:'Verify 5s 480p no-audio rate, async completion, budget settlement and private download before cutover'
 },
 kling4_0:{
  name:'Kling 4.0',kind:'video',source:'fal',
  apiPath:'kling-video/v4.0/text-to-video',
  capability:'text-to-video',
  documentation:'https://open.higgsfield.ai/models/kling-video/v4.0/text-to-video/api-reference',
  gap:'Verify 5s 720p price, async completion, budget settlement and private download before cutover'
 },
 nano_banana_2:{
  name:'Nano Banana 2.1',kind:'image',source:'fal',
  apiPath:null,capability:'text-to-image',
  documentation:null,
  gap:'Higgsfield connected catalog has this model; exact public REST endpoint, schema, price and output must be verified'
 },
 flux_3_image:{
  name:'FLUX 3 Image',kind:'image',source:'fal',
  apiPath:null,capability:'text-to-image',
  documentation:null,
  gap:'Higgsfield connected catalog has this model; exact public REST endpoint, schema, price and output must be verified'
 }
};
export const HIGGSFIELD_MIGRATION_CANDIDATES=Object.freeze(
 Object.fromEntries(Object.entries(candidates).map(([id,value])=>[id,Object.freeze({...value,live:false})]))
);
export function higgsfieldMigrationStatus(modelId){
 const model=HIGGSFIELD_MIGRATION_CANDIDATES[modelId];
 if(!model)return {status:'not-mapped',canDispatch:false};
 return {
  id:modelId,name:model.name,kind:model.kind,
  currentProvider:model.source,targetProvider:'higgsfield',
  documentedApiPath:model.apiPath,capability:model.capability,
  status:model.apiPath?'endpoint-documented-awaiting-live-validation':'endpoint-not-verified',
  canDispatch:false,documentation:model.documentation,remainingWork:model.gap
 };
}
// Fail closed even if environment variables are set. No paying user or owner
// can launch these candidates until billing and provider lifecycle code is shipped.
export function assertHiggsfieldMigrationDispatchReady(modelId){
 if(!Object.hasOwn(HIGGSFIELD_MIGRATION_CANDIDATES,modelId))throw Error('HIGGSFIELD_MODEL_UNMAPPED');
 throw Error('HIGGSFIELD_MIGRATION_NOT_LIVE');
}
