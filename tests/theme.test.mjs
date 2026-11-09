import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=(path)=>readFileSync(join(process.cwd(),path),'utf8');
const green=/#c7ff36/i;
const sections=[
 ['app/k4k-app/studio.css','public site and mobile feed',/\.k4k-market/],
 ['app/k4k-app/preview.css','account and customer workspace',/\.k4k-light/],
 ['app/k4k-app/template/[id]/template.css','recreate template viewer',/\.k4k-recreate/],
 ['app/create/workspace.css','legacy motion workspace',/\.km/],
 ['app/k4k-app/register/register.css','account registration',/\.k4k-register/],
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
