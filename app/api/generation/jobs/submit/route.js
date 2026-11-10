import {generationContext,prepareGenerationInput,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {createHiggsfieldRest} from '../../../../../lib/server/higgsfield-rest.mjs';
import {createGenerationSubmitService} from '../../../../../lib/server/generation-submit-service.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{
  const {user,body,job,database}=await generationContext(request);
  const submit=createGenerationSubmitService({database,provider:createHiggsfieldRest({credentials:process.env.HF_CREDENTIALS}),prepare:(draft,resolution)=>prepareGenerationInput(database,draft,resolution)});
  const result=await submit({userId:user.id,job,quoteToken:body.quoteToken,requestKey:body.requestKey});
  return Response.json(result,{status:202,headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
