// Fixed public-sample estimate only. Never submits a generation.
const diagnostics=new Map();
export async function higgsfieldDiagnostic(tier='pro'){
 if(process.env.VERCEL_ENV!=='preview')return {authenticated:false,error:'PREVIEW_ONLY'};
 if(!['pro','lite'].includes(tier))throw Error('UNSUPPORTED_MODEL');
 const diagnostic=diagnostics.get(tier);
 if(diagnostic&&diagnostic.until>Date.now())return diagnostic.promise;
 const promise=(async()=>{
  try{
   const {createHiggsfieldRest}=await import('./higgsfield-rest.mjs');
   const quote=await createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS}).estimate(tier,{
    video_url:'https://kreativestudios4k.com/videos/template-1.mp4',
    image_urls:['https://kreativestudios4k.com/videos/template-1.webp'],resolution:'720p',prompt:''
   });
   return {authenticated:true,probeCompleted:true,providerQuoteVerified:true,quoteUsd:quote.usd,billableGenerationSubmitted:false};
  }catch(error){
   const known=['PROVIDER_CREDENTIALS_REJECTED','PROVIDER_ACCESS_OR_BALANCE_BLOCKED','PROVIDER_UNREACHABLE','PROVIDER_QUOTE_INVALID','PROVIDER_REQUEST_REJECTED'];
   return {authenticated:error.authenticated===true,providerQuoteVerified:false,pricingType:error.pricingType??null,pricingDescription:error.pricingDescription??null,probeCompleted:true,error:known.includes(error.message)?error.message:'CREDENTIAL_INVALID',httpStatus:error.httpStatus??null,quoteShape:error.quoteShape??null,reportedUsd:error.reportedUsd??null,billableGenerationSubmitted:false};
  }
 })();
 diagnostics.set(tier,{until:Date.now()+60000,promise});
 return promise;
}
