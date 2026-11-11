import {generationContext,prepareGenerationInput,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {createGenerationProvider} from '../../../../../lib/server/generation-provider.mjs';
import {createGenerationSubmitService} from '../../../../../lib/server/generation-submit-service.mjs';
export const runtime='nodejs';
export async function POST(request){
 try{
  const {user,body,job,database}=await generationContext(request);
  const submit=createGenerationSubmitService({database,provider:createGenerationProvider(job),prepare:(draft,resolution)=>prepareGenerationInput(database,draft,resolution)});
  const result=await submit({userId:user.id,job,quoteToken:body.quoteToken,requestKey:body.requestKey});
  return Response.json(result,{status:202,headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
