import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioDestination} from '../lib/customer-routes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const dash=read('app/k4k-app/dashboard/Dashboard.js');
const css=read('app/k4k-app/dashboard/dashboard.css');
test('K4K Studio is default post-login route and preserves explicit destinations',()=>{
 assert.equal(studioDestination(null),'/k4k-app/dashboard');
 assert.equal(studioDestination('/k4k-app/dashboard'),'/k4k-app/dashboard');
 assert.equal(studioDestination('/academy'),'/academy');
 assert.equal(studioDestination('/affiliates'),'/affiliates');
 assert.equal(studioDestination('/k4k-app/credits?plan=starter'),'/k4k-app/credits?plan=starter');
 assert.equal(studioDestination('https://evil.test'),'/k4k-app/dashboard');
});
test('dashboard requires verified account and retrieves only customer-scoped generation data',()=>{
 assert.match(dash,/useVerifiedAccount\(\)/);
 assert.match(dash,/router\.replace\('\/login\?next=%2Fk4k-app%2Fdashboard'\)/);
 assert.match(dash,/session\.user\.id!==user\.id/);
 assert.match(dash,/Authorization:'Bearer '\+session\.access_token/);
 assert.match(dash,/action:'list'/);
 assert.match(dash,/creativeLibraryJobs\(data\.jobs\)/);
 assert.doesNotMatch(dash,/Math\.random\(/);
});
test('dashboard uses real navigation, model selection, private recent projects and responsive layout',()=>{
 for(const route of ['/k4k-app/image','/k4k-app/video','/k4k-app/motion','/k4k-app/credits','/k4k-app/account','/k4k-app/videos'])assert.ok(dash.includes(route),route);
 assert.match(dash,/Recent projects/);assert.match(dash,/Render queue/);
 assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/\.kd-sidebar-nav\{position:static!important/);
 assert.match(read('app/k4k-app/create/page.js'),/k4k-dashboard-draft/);
});
