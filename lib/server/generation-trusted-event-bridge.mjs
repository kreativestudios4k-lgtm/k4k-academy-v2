import {createInternalGenerationEventAuthenticator} from './generation-internal-event-auth.mjs';
import {createGenerationProviderEventHandler} from './generation-provider-event.mjs';

// Trusted internal adapter only. The upstream adapter must validate provider
// authenticity independently. No public webhook route is created here.
export function createTrustedGenerationEventBridge({secret,claimNonce,pipeline,enabled=false,now}={}){
 if(typeof window!=='undefined')throw Error('Server only');
 const authenticate=createInternalGenerationEventAuthenticator({secret,claimNonce,now});
 const handler=createGenerationProviderEventHandler({
  pipeline,enabled,
  authenticate:({headers,payload})=>authenticate({headers,rawBody:payload?.rawBody})
 });
 return Object.freeze({
  async handle({headers,rawBody}={}){
   if(!enabled)throw Error('PROVIDER_EVENTS_DISABLED');
   if(typeof rawBody!=='string'||rawBody.length>16384)throw Error('INVALID_EVENT_BODY');
   let payload;
   try{payload=JSON.parse(rawBody)}catch{throw Error('INVALID_EVENT_BODY')}
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('INVALID_EVENT_BODY');
   return handler.handle({headers,payload:{...payload,rawBody}});
  }
 });
}
