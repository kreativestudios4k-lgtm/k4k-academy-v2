import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=(path)=>readFileSync(join(process.cwd(),path),'utf8');
const green=/#c7ff36/i;
const sections=[
 ['app/k4k-app/studio.css','public site and mobile feed',/\.k4k-market/],
 ['app/k4k-app/preview.css','account and customer workspace',/\.k4k-light/],
 ['app/k4k-app/template/[id]/template.css','recreate template viewer',/\.k4k-template-workflow/],
 ['app/create/workspace.css','legacy motion workspace',/\.km/],
 ['app/k4k-app/register/register.css','account registration',/\.k4k-register/],
 ['app/k4k-app/landing.css','template-led homepage',/\.k4k-landing/],
];

test('K4K surfaces share the neon-green / black palette',()=>{
 for(const [path,name,scope] of sections){
  const css=source(path);
  assert.match(css,green,name+' must include neon green');
  assert.match(css,scope,name+' must be scoped');
 }
});

test('K4K signup imports its scoped stylesheet',()=>{
 assert.match(source('app/k4k-app/register/page.js'),/import '\.\/register\.css'/);
});

test('dark background and input themes are present in the account workspace',()=>{
 const css=source('app/k4k-app/preview.css');
 assert.match(css,/background:radial-gradient\(/);
 assert.match(css,/\.k4k-light input:not\(/);
 assert.match(css,/\.k4k-light \.k4k-card/);
});

test('K4K homepage provides original template discovery and customer routes',()=>{
 const landing=source('app/k4k-app/LandingExperience.js');
 const homepage=source('app/k4k-app/page.js');
 assert.match(homepage,/LandingExperience/);
 assert.doesNotMatch(homepage,/MobileTemplateFeed/);
 assert.match(source('app/k4k-app/landing.css'),/@media\(max-width:680px\)/);
 assert.match(landing,/template-catalogue\.json/);
 assert.match(landing,/href=\{'\/k4k-app\/template\/'/);
 assert.match(landing,/setFilter/);
 assert.match(landing,/\/k4k-app\/creator/);
});
test('template workflow does not trigger AI generation or credits',()=>{
 const template=source('app/k4k-app/template/[id]/TemplateCreator.js');
 assert.match(template,/k4k-template-disabled-generate/);
 assert.match(template,/disabled>\{uploaded===0/);
 assert.match(template,/MAX_PHOTOS=30/);
});

test('K4K pricing and studio views use dedicated responsive neon layouts',()=>{
 const pricing=source('app/k4k-app/credits/page.js');
 const creator=source('app/k4k-app/creator/page.js');
 assert.match(pricing,/k4k-pricing-grid/);
 assert.match(pricing,/Stripe test checkout/);
 assert.match(creator,/k4k-creator-layout/);
 assert.match(creator,/extraUrlRegistry/);
});
