import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGenjutsuPreflight} from '../lib/k4k-genjutsu-preflight.mjs';

const input=(overrides={})=>({destination:'website',videoSelected:true,imageCount:1,durationSeconds:12,...overrides});
test('website accepts 30 reference images',()=>assert.equal(checkGenjutsuPreflight(input({imageCount:30})).ok,true));
test('API Object Swap rejects 9 images while website accepts them',()=>{
 assert.equal(checkGenjutsuPreflight(input({destination:'api-object-swap',imageCount:9})).ok,false);
 assert.equal(checkGenjutsuPreflight(input({imageCount:9})).ok,true);
});
test('API Object Swap accepts 8 images and a 30 second clip',()=>assert.equal(checkGenjutsuPreflight(input({destination:'api-object-swap',imageCount:8,durationSeconds:30})).ok,true));
test('clips shorter than 4 seconds and longer than 30 seconds are flagged',()=>{
 assert.equal(checkGenjutsuPreflight(input({durationSeconds:3.9})).ok,false);
 assert.equal(checkGenjutsuPreflight(input({durationSeconds:30.1})).ok,false);
});
test('missing duration or video is not reported as ready',()=>{
 assert.equal(checkGenjutsuPreflight(input({durationSeconds:null})).ok,false);
 assert.equal(checkGenjutsuPreflight(input({videoSelected:false})).ok,false);
});
test('missing image and unsupported destination fail closed',()=>{
 assert.equal(checkGenjutsuPreflight(input({imageCount:0})).ok,false);
 assert.equal(checkGenjutsuPreflight(input({destination:'unknown'})).ok,false);
});
test('invalid numeric input fails closed',()=>{
 assert.equal(checkGenjutsuPreflight(input({imageCount:NaN})).ok,false);
 assert.equal(checkGenjutsuPreflight(input({durationSeconds:Infinity})).ok,false);
});
