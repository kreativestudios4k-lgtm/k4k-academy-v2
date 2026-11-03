import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMp4Header} from '../lib/server/generation-video-container.mjs';
const header=Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,50,109,112,52,49]);
test('accepts bounded MP4 ftyp header without claiming full validation',()=>{
 const result=inspectMp4Header(header,1024);
 assert.equal(result.container,'mp4');assert.equal(result.headerChecked,true);
});
test('rejects misleading extension / wrong signature',()=>{
 const wrong=header.slice();wrong.set([74,85,78,75],4);
 assert.throws(()=>inspectMp4Header(wrong,1024));
});
test('rejects invalid, truncated and oversized ftyp boxes',()=>{
 const bad=header.slice();bad[3]=255;
 assert.throws(()=>inspectMp4Header(bad,1024));
 assert.throws(()=>inspectMp4Header(header.subarray(0,12),1024));
 assert.throws(()=>inspectMp4Header(header,10));
});
test('rejects unsupported brand, unsafe sizes and malformed input',()=>{
 const bad=header.slice();bad.set([113,116,32,32],8);bad.set([113,116,32,32],16);bad.set([113,116,32,32],20);
 assert.throws(()=>inspectMp4Header(bad,1024));
 assert.throws(()=>inspectMp4Header(header,251*1024*1024));
 assert.throws(()=>inspectMp4Header('not bytes',1024));
});
