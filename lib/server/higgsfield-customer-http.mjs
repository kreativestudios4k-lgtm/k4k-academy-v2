const OWNER='0ef1af08-4df8-4858-967b-eac1a16f9f2c';
const ERRORS=new Set(['INVALID_REQUEST','INVALID_JOB','JOB_NOT_FOUND','DRAFT_ALREADY_EXISTS','PROVIDER_BUDGET_BLOCKED','REFERENCE_DURATION_OUT_OF_RANGE','REFERENCE_TRANSFER_UNAVAILABLE','REFERENCE_TRANSFER_FAILED','UNTRUSTED_UPLOAD_URL','MEDIA_NOT_FOUND','MEDIA_SIZE_INVALID','MEDIA_DIMENSIONS_TOO_SMALL','QUOTE_EXPIRED','QUOTE_CHANGED','QUOTE_INVALID','HIGGSFIELD_CUSTOMER_DISPATCH_DISABLED','HIGGSFIELD_CUSTOMER_QUOTE_DISABLED','CREDIT_PRICING_NOT_APPROVED','INSUFFICIENT_CREDITS','BILLING_REVIEW_REQUIRED','ACTIVE_JOB_LIMIT','PROVIDER_DAILY_BUDGET_BLOCKED','PROVIDER_TOTAL_BUDGET_BLOCKED','PROVIDER_SUBMISSION_UNCERTAIN','PROVIDER_RECORDING_REQUIRES_REVIEW','OUTPUT_INGESTION_REQUIRES_RECONCILIATION','OUTPUT_SETTLEMENT_REQUIRES_RECONCILIATION']);
export function createHiggsfieldCustomerHttp({env=process.env,authenticate,createService}){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
 return async request=>{
  if(env.VERCEL_ENV!=='preview'||env.K4K_HIGGSFIELD_CUSTOMER_FLOW_PREVIEW!=='true')return reply({error:'NOT_AVAILABLE'},404);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'INVALID_ORIGIN'},403);
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return reply({error:'UNAUTHENTICATED'},401);
  try{
   const user=await authenticate(token);
   if(!user||user.is_anonymous)return reply({error:'UNAUTHENTICATED'},401);
   if(user.id!==OWNER)return reply({error:'NOT_AVAILABLE'},404);
   if(Number(request.headers.get('content-length'))>20000)return reply({error:'INVALID_REQUEST'},413);
   const text=await request.text();if(text.length>20000)return reply({error:'INVALID_REQUEST'},413);
   let body;try{body=JSON.parse(text)}catch{return reply({error:'INVALID_REQUEST'},400)}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'INVALID_REQUEST'},400);
   const {action,...input}=body;
   if(!['prepare','submit','status','list','download'].includes(action))return reply({error:'INVALID_REQUEST'},400);
   if(action==='list'&&Object.keys(input).length)return reply({error:'INVALID_REQUEST'},400);
   const service=createService(token);
   const result=action==='list'?await service.list(user.id):await service[action](user.id,input);
   return reply(result);
  }catch(e){return reply({error:ERRORS.has(e?.message)?e.message:'HIGGSFIELD_UNAVAILABLE'},e?.message==='JOB_NOT_FOUND'?404:409)}
 };
}
