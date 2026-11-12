import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeHiggsfieldUserKey,decodeHiggsfieldUserKey,isValidCopiedHiggsfieldKey} from '../lib/server/higgsfield-user-key.mjs';

test('complete copied Higgsfield key is opaque and does not require a colon',()=>{
 assert.equal(isValidCopiedHiggsfieldKey('hf_live_opaque_api_key_123456'),true);
 assert.equal(isValidCopiedHiggsfieldKey('key:secret'),true);
 assert.equal(isValidCopiedHiggsfieldKey('Key hf_live_opaque_api_key'),false);
 assert.equal(isValidCopiedHiggsfieldKey('api key with spaces'),false);
 assert.equal(isValidCopiedHiggsfieldKey(''),false);
});
test('HTTP-only cookie payload is bound to the authenticated user',()=>{
 const cookie=encodeHiggsfieldUserKey({userId:'user-1',apiKey:'hf_opaque_key_without_colon'});
 assert.equal(decodeHiggsfieldUserKey(cookie,'user-1'),'hf_opaque_key_without_colon');
 assert.equal(decodeHiggsfieldUserKey(cookie,'user-2'),null);
 assert.equal(decodeHiggsfieldUserKey('not-base64-json','user-1'),null);
});
test('Connect API key UI uses one password field and exact setup instructions',()=>{
 const ui=readFileSync('app/k4k-app/HiggsfieldKeyManager.js','utf8');
 assert.match(ui,/Connect API key/);
 assert.match(ui,/Manage API key/);
 assert.match(ui,/Replace API key/);
 assert.match(ui,/Remove API key/);
 assert.match(ui,/Paste the API key copied from open\.higgsfield\.ai\. Paste it as-is\./);
 assert.match(ui,/type="password"/);
 assert.match(ui,/autoComplete="off"/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|indexedDB/);
});
test('key is stored only in an HTTP-only secure-in-preview cookie and never returned to client',()=>{
 const actions=readFileSync('app/k4k-app/higgsfield-key-actions.js','utf8');
 assert.match(actions,/httpOnly:true/);
 assert.match(actions,/sameSite:'lax'/);
 assert.match(actions,/path:'\\/'/);
 assert.match(actions,/VERCEL_ENV==='preview'/);
 assert.match(actions,/maxAge:60\*60\*24\*30/);
 assert.match(actions,/return \{ok:true,saved:true\}/);
 assert.doesNotMatch(actions,/console\.(log|error)|return \{[^}]*apiKey/);
});
