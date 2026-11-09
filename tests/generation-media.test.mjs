import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedMediaPath,validateReferenceList} from '../lib/server/generation-media.mjs';
const alice='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65';
const bob='7c92fe60-10eb-4185-9b2d-36a8f23ab3d3';
const job='d7411f09-a330-49b4-a953-2838b75eb99a';
const image=alice+'/'+job+'.webp'';
test('accepts strictly owned image and video paths',()=>{
 assert.equal(ownedMediaPath(alice,image,'image').path,image);
 assert.equal(ownedMediaPath(alice,alice+'/'+job+'.mp4'','video').path,alice+'/'+job+'.mp4'');
 assert.equal(validateReferenceList(alice,[image]).length,1);
});
test('rejects cross-user references and traversal',()=>{
 for(const path of [bob+'/'+job+'.webp'',alice+'/../image_12345678.webp',alice+'/'+job+'/../secret.webp'',alice+'/'+job+'.webp'%2fextra',alice+'\\'+job+'.webp']){
  assert.throws(()=>ownedMediaPath(alice,path,'image'));
 }
});
test('rejects wrong type, duplicates and excessive references',()=>{
 assert.throws(()=>ownedMediaPath(alice,alice+'/'+job+'.mp4'','image'));
 assert.throws(()=>ownedMediaPath(alice,image,'video'));
 assert.throws(()=>validateReferenceList(alice,[image,image]));
 assert.throws(()=>validateReferenceList(alice,[]));
 assert.throws(()=>validateReferenceList(alice,Array(9).fill(image)));
});
