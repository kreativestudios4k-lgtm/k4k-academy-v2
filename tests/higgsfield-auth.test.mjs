import test from 'node:test';
import assert from 'node:assert/strict';
import {higgsfieldAuthorization} from '../lib/server/higgsfield-auth.mjs';
import {createVideoProvider} from '../lib/server/higgsfield-video.mjs';
import {createHiggsfieldStatusLookup} from '../lib/server/higgsfield-status-lookup.mjs';
test('opaque complete keys work with or without a colon without transformation',()=>{
 for(const key of ['copied_api_key_123','copied:key_123'])assert.equal(higgsfieldAuthorization(key),`Key ${key}`);
});
test('rejects missing keys and unsafe header values without including credentials in errors',()=>{
 for(const key of [undefined,null,'',' ',' key','key ','Key copied','key\r\nInjected: yes','key\0', 'x'.repeat(8193)])assert.throws(()=>higgsfieldAuthorization(key),{message:'Invalid Higgsfield API key'});
});
test('submission accepts opaque key and sends Key scheme to fixed API origin',async()=>{
 const calls=[];
 const provider=createVideoProvider({credentials:'complete_copied_key',fetchImpl:async(url,options)=>{
  calls.push({url,options});return {ok:true,json:async()=>({request_id:'job',status_url:'https://api.higgsfield.ai/requests/job/status'})};
 }});
 await provider.submit({},'stable_job_key_123');
 assert.equal(calls[0].url,'https://api.higgsfield.ai/higgsfield/genjutsu/motion-transfer/v1.0');
 assert.equal(calls[0].options.headers.Authorization,'Key complete_copied_key');
});
test('polling rejects unsafe credentials before any network call',async()=>{
 let calls=0;
 const lookup=createHiggsfieldStatusLookup({apiKey:'bad\nkey',enabled:true,fetchImpl:async()=>{calls++}});
 await assert.rejects(()=>lookup({providerJobId:'job'}),{message:'Invalid Higgsfield API key'});
 assert.equal(calls,0);
});
