import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const sidebar=read('app/k4k-app/StudioSidebar.js');
const dashboard=read('app/k4k-app/account/page.js');
const create=read('app/k4k-app/create/page.js');
const image=read('app/k4k-app/image/page.js');
const video=read('app/k4k-app/video/page.js');
const styles=read('app/k4k-app/workspace-dashboard.css');

test('dashboard and both generation types share the same compact navigation',()=>{
 for(const route of ['/k4k-app/dashboard','/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/videos','/k4k-app/credits'])
  assert.ok(sidebar.includes(route),route);
 assert.match(dashboard,/StudioSidebar active="dashboard"/);
 assert.match(create,/StudioSidebar active=\{kind\}/);
 assert.match(image,/redirect\('\/k4k-app\/create\?kind=image&model='/);
 assert.match(video,/redirect\('\/k4k-app\/create\?kind=video&model='/);
});
test('dashboard shows only sourced account and latest-six-job metrics',()=>{
 assert.match(dashboard,/const \{balance,jobs,membership,bonus\}=current/);
 assert.match(dashboard,/Recent generations/);
 assert.match(dashboard,/Latest 6 records/);
 assert.match(dashboard,/recentCompleted=jobs\.filter/);
 assert.match(dashboard,/membership\?\.app\?\.status/);
 assert.match(dashboard,/k4k-dashboard-status-bars/);
 assert.doesNotMatch(dashboard,/680|267|150|John Doe/);
});
test('image and video keep model-specific availability and signed quote controls',()=>{
 assert.match(create,/CustomerCreativeGeneration/);
 assert.doesNotMatch(create,/OwnerCreativeQA/);
 assert.match(read('app/k4k-app/owner-qa/page.js'),/OwnerCreativeQA/);
 assert.match(create,/creationModels\(kind\)\.length/);
 assert.match(create,/model\.name/);
 assert.match(create,/selectedLive/);
 assert.match(create,/kcs-dashboard-metrics/);
 assert.ok(!create.includes('fakeCredits'));
});
test('dashboard follows reference dark visual system and remains responsive',()=>{
 assert.match(styles,/--k4kw-bg:#131416/);
 assert.match(styles,/\.k4k-workspace-sidebar \.k4k-workspace-nav/);
 assert.match(styles,/\.k4k-workspace-sidebar/);
 assert.match(styles,/\.k4k-dashboard-kpis/);
 assert.match(styles,/\.kcs-dashboard-metrics/);
 assert.match(styles,/@media\(max-width:920px\)/);
 assert.match(styles,/@media\(max-width:620px\)/);
});
