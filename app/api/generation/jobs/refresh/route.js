import {generationEnvironmentAllowed} from '../../../../../lib/server/generation-policy.mjs';
import {generationContext,generationError} from '../../../../../lib/server/generation-route-context.mjs';
import {reconcileGenerationJob} from '../../../../../lib/server/generation-reconcile-service.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request){
 try{
  const {job,database}=await generationContext(request);
  if(!generationEnvironmentAllowed())throw Error('GENERATION_DISABLED');
  return Response.json(await reconcileGenerationJob({database,job}),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return generationError(error)}
}
