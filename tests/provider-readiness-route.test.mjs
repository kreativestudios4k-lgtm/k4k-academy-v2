import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/generation/provider-readiness/route.js',import.meta.url),'utf8');
test('provider readiness never enables generation from credentials alone',()=>{
 assert.match(route,/generationEnabled:false/);
 assert.match(route,/testReady:false/);
 assert.match(route,/GENERATION_FEATURE_DISABLED/);
});
test('readiness does not expose credentials or submit billable work',()=>{
 assert.doesNotMatch(route,/return NextResponse\.json\(\{\s*credentials\b/);
 assert.doesNotMatch(route,/fetch\(|\.submit\(|service_role/i);
 assert.match(route,/Cache-Control':'no-store/);
});
