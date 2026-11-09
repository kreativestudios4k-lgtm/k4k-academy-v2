import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const creator=readFileSync(new URL('../app/k4k-app/creator/page.js',import.meta.url),'utf8');
test('creator saves all selected images and uses private reference storage',()=>{
 assert.match(creator,/const files=\[character\.file,\.\.\.extraImages\.map\(item=>item\.file\)\]/);
 assert.match(creator,/for\(const file of files\)/);
 assert.match(creator,/storage\.from\('studio-references'\)\.upload/);
 assert.match(creator,/reference_paths:savedReference\.paths/);
});
test('creator rejects stale attachments and keeps AI generation disabled',()=>{
 assert.match(creator,/extraImages\.some\(\(item,i\)=>item\.file!==savedReference\.extraFiles\[i\]\)/);
 assert.match(creator,/disabled aria-label="Generation not yet enabled"/);
 assert.match(creator,/credits_reserved:0/);
});
