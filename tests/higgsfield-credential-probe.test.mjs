import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHiggsfieldCredentialProbe} from '../lib/server/higgsfield-credential-probe.mjs';
const testUrl='https://api.higgsfield.ai/requests/k4k-connection-check-nonexistent-000/status';
test('nonbillable probe is GET-only, fixed-origin and sends complete secret only server side',async()=>{
 const requests=[];
 const probe=createHiggsfieldCredentialProbe({credentials:'id:secret',fetchImpl:async(url,options)=>{
  requests.push({url,options});return {status:404,ok:false};
 }});
 assert.deepEqual(await probe(),{state:'api_reachable',credentialVerified:false});
 assert.equal(requests.length,1);
 assert.equal(requests[0].url,testUrl);
 assert.equal(requests[0].options.method,'GET');
 assert.equal(requests[0].options.headers.Authorization,'Key id:secret');
 assert.equal(requests[0].options.redirect,'error');
 assert.equal(requests[0].options.body,undefined);
});
test('reports rejection/balance/rate limits without claiming credential validity',async()=>{
 for(const [code,state] of [[401,'rejected'],[402,'balance_required'],[403,'access_denied'],[429,'rate_limited'],[404,'api_reachable'],[503,'indeterminate']]){
  const result=await createHiggsfieldCredentialProbe({credentials:'opaque',fetchImpl:async()=>({status:code,ok:false})})();
  assert.equal(result.state,state);
  assert.notEqual(result.credentialVerified,true);
 }
 const unreachable=await createHiggsfieldCredentialProbe({credentials:'opaque',fetchImpl:async()=>{throw Error('network')}})();
 assert.equal(unreachable.state,'unreachable');
});
test('preview route is owner-bound and has no generation method',()=>{
 const text=readFileSync(new URL('../app/api/higgsfield/connection/route.js',import.meta.url),'utf8');
 assert.match(text,/VERCEL_ENV!=='preview'/);
 assert.match(text,/K4K_HIGGSFIELD_CONNECTION_PROBE_ENABLED!=='true'/);
 assert.match(text,/auth\.auth\.getUser\(token\)/);
 assert.match(text,/user\.id!==ownerId/);
 assert.match(text,/paidGenerationEnabled:false/);
 assert.doesNotMatch(text,/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/);
});
