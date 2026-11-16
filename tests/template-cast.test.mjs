import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {templateCast,castReady} from '../lib/template-cast.mjs';
const cat=JSON.parse(readFileSync('app/k4k-app/template-catalogue.json','utf8'));
test('confirmed template counts are exact, and provisional or unknown counts are never presented as verified',()=>{
 const meeting=cat.trending.find(t=>t.id==='k4k-019');
 assert.deepEqual(templateCast(meeting),{count:4,verified:true,initialCount:4,needsConfirmation:false});
 assert.equal(templateCast(cat.trending.find(t=>t.id==='k4k-006')).count,1);
 assert.equal(templateCast(cat.trending.find(t=>t.id==='k4k-003')).verified,false);
 assert.equal(templateCast(cat.trending.find(t=>t.id==='k4k-011')).verified,false);
 for(const clip of cat.discoveryPreviews){assert.equal(templateCast(clip).verified,false);assert.equal(templateCast(clip).initialCount,0)}
});
test('all four numbered slots must have a photo and source-person description before quoting',()=>{
 const files=[{},{},{},{}],targets=['first speaker','second speaker','third speaker','fourth speaker'];
 assert.equal(castReady({count:4,files,targets,confirmed:true}),true);
 assert.equal(castReady({count:4,files:[{},null,{},{}],targets,confirmed:true}),false);
 assert.equal(castReady({count:4,files:files.slice(0,3),targets,confirmed:true}),false);
 assert.equal(castReady({count:4,files,targets:['first speaker','','third speaker','fourth speaker'],confirmed:true}),false);
 assert.equal(castReady({count:4,files,targets,confirmed:false}),false);
});
