import {createFalWanRest} from './fal-wan.mjs';
export function generationProviderName(job){
 const name=job?.provider??'fal';
 if(name==='higgsfield')throw Error('LEGACY_PROVIDER_RETIRED');
 if(name!=='fal')throw Error('UNSUPPORTED_PROVIDER');
 return name;
}
export function generationSigningSecret(env=process.env,provider='fal'){
 if(provider!=='fal')throw Error('UNSUPPORTED_PROVIDER');
 return env.K4K_GENERATION_QUOTE_SECRET||env.FAL_KEY;
}
export function createGenerationProvider(job,env=process.env){
 generationProviderName(job);
 return createFalWanRest({credentials:env.FAL_KEY,env});
}
