import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('paid lesson data stays in server modules and protected pages check access before rendering',()=>{
 assert.match(read('lib/k4k-course-v3.js'),/import 'server-only'/);
 assert.match(read('lib/k4k-viral-workflow.js'),/import 'server-only'/);
 assert.doesNotMatch(read('app/academy/LearningProgress.js'),/k4k-course-v3/);
 assert.doesNotMatch(read('app/prompts/page.js'),/['"]use client['"]/);
 for(const p of ['app/academy/page.js','app/academy/lessons/[slug]/page.js','app/academy/studio/page.js','app/academy/method/page.js','app/academy/gallery/page.js','app/prompts/page.js']){
  const source=read(p);assert.match(source,/await requireAcademyAccess\(\)/);assert.match(source,/force-dynamic/);
 }
 const gate=read('lib/server/academy-access.js');assert.match(gate,/auth\.getUser\(\)/);assert.match(gate,/Academy temporarily unavailable/);assert.match(gate,/membership\.error/);
});
