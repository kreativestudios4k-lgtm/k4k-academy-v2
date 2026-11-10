import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/k4k-app/videos/page.js',import.meta.url),'utf8');
test('video preview requires completed job and authenticated signed link',()=>{
 assert.match(page,/job\.status==='completed'/);
 assert.match(page,/getSession\(\)/);
 assert.match(page,/\/api\/generation\/jobs\/download\?jobId=/);
 assert.match(page,/typeof downloads\[job\.id\]==='string'&&<>/);
 assert.match(page,/<video controls playsInline preload="metadata" src=\{downloads\[job\.id\]\}/);
});
test('does not expose storage paths or provider identifiers in playback',()=>{
 assert.doesNotMatch(page,/provider_job_id|output_path|SUPABASE_SERVICE_ROLE_KEY/);
});
