import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const catalogue=JSON.parse(read('app/k4k-app/template-catalogue.json'));

test('public catalogue contains only ten uploaded K4K Originals',()=>{
 assert.equal(catalogue.trending.length,0,'retired celebrity/legacy clips must not be displayed');
 assert.equal(catalogue.discoveryPreviews.length,10);
 const ids=new Set;
 for(const item of catalogue.discoveryPreviews){
  assert.equal(item.collection,'K4K Originals');
  assert.match(item.id,/^k4k-1\d\d$/);
  assert.ok(!ids.has(item.id));ids.add(item.id);
  const url=new URL(item.videoUrl);
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,'d2ol7oe51mr4n9.cloudfront.net');
  assert.ok(item.durationSeconds>=4&&item.durationSeconds<30);
  assert.equal(item.previewOnly,item.durationSeconds>15);
 }
});

test('Motion Library and landing use the supplied originals, not legacy trending clips',()=>{
 const page=read('app/k4k-app/motion/page.js');
 const studio=read('app/k4k-app/higgsfield-preview/page.js');
 const home=read('app/k4k-app/CreativeHome.js');
 assert.ok(page.includes("t.collection==='K4K Originals'"));
 assert.ok(studio.includes('selectedPreviewOnly'));
 assert.ok(studio.includes('khm-lib-card-status'));
 assert.ok(studio.includes('khm-motion-library'));
 assert.ok(home.includes('K4K ORIGINALS'));
 assert.ok(home.includes('featured.slice(0,10)'));
});
