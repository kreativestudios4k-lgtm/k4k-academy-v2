import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const create=read('app/k4k-app/create/page.js');
const css=read('app/k4k-app/create/create.css');
const sidebar=read('app/k4k-app/StudioSidebar.js');
const layout=read('app/k4k-app/workspace-dashboard.css');
const owner=read('app/k4k-app/owner-qa/page.js');
const customer=read('app/k4k-app/CustomerCreativeGeneration.js');

test('Image and Video menus are insulated from absolute positioned global site nav',()=>{
 assert.ok(sidebar.includes('role="navigation"'));
 assert.ok(!sidebar.includes('<nav'));
 assert.ok(create.includes('className="kcs-main-links" role="navigation"'));
 assert.ok(!create.includes('<nav'));
 assert.ok(css.includes('.kcs-root .kcs-nav .kcs-main-links'));
 assert.ok(layout.includes('position:static!important;inset:auto!important;'));
 assert.ok(layout.includes('grid-auto-flow:row'));
});
test('customer-facing generator keeps real signed quote and Generate button, no billable founder testing',()=>{
 assert.ok(create.includes('<CustomerCreativeGeneration'));
 assert.ok(!create.includes('OwnerCreativeQA'));
 assert.match(customer,/Generate/);
 assert.match(customer,/quoteToken:quote.quoteToken/);
 assert.match(customer,/action:'submit'/);
 assert.ok(owner.includes('<OwnerCreativeQA'));
 assert.ok(owner.includes('owner-qa'));
});
test('generator keeps black and white visual theme',()=>{
 assert.ok(!css.includes('#d6ff69'));
 assert.match(css,/\.kcs-root \.kcs-brand span\{color:#ededf0\}/);
 assert.match(css,/\.kcs-root \.kcs-flow-steps span.is-current/);
});
