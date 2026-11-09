import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedMediaPath,validateReferenceList} from '../lib/server/generation-media.mjs';
const alice='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65';
const bob='7c92fe60-10eb-4185-9b2d-36a8f23ab3d3';
const file='d7411f09-a330-49b4-a953-2838b75eb99a';
const image=alice+'/'+file+'.webp';
const video=alice+'/'+file+'.mp4';
test('accepts owned Studio image and video paths',()=>{
 assert.deepEqual(ownedMediaPath(alice,image,'image'),{bucket:'studio-references',path:image});
 assert.deepEqual(ownedMediaPath(alice,video,'video'),{bucket:'studio-videos',path:video});
 assert.equal(validateReferenceList(alice,[image]).length,1);
});
test('rejects cross-user paths, traversal and encoded separators',()=>{
 for(const path of [bob+'/'+file+'.webp',alice+'/../secret.webp',alice+'/'+file+'/../secret.webp',image+'%2fextra',alice+'\\'+file+'.webp']){
  assert.throws(()=>ownedMediaPath(alice,path,'image'));
 }
});
test('rejects incorrect types and invalid reference counts',()=>{
 assert.throws(()=>ownedMediaPath(alice,video,'image'));
 assert.throws(()=>ownedMediaPath(alice,image,'video'));
 assert.throws(()=>validateReferenceList(alice,[image,image]));
 assert.throws(()=>validateReferenceList(alice,[]));
 assert.throws(()=>validateReferenceList(alice,Array(9).fill(image)));
});
