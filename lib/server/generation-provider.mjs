import {createFalWanRest} from './fal-wan.mjs';
import {createHiggsfieldRest} from './higgsfield-rest.mjs';
export function generationProviderName(job){
 const name=job?.provider??'higgsfield';
 if(!['fal','higgsfield'].includes(name))throw Error('UNSUPPORTED_PROVIDER');
 return name;
}
export function generationSigningSecret(env=process.env,provider='higgsfield'){
 return env.K4K_GENERATION_QUOTE_SECRET||(provider==='fal'?env.FAL_KEY:env.HF_CREDENTIALS);
}
export function createGenerationProvider(job,env=process.env){
 return generationProviderName(job)==='fal'?createFalWanRest({credentials:env.FAL_KEY,env}):createHiggsfieldRest({credentials:env.HF_CREDENTIALS});
}
