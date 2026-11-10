import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/k4k-app/VideoLibrary.js',import.meta.url),'utf8');
test('video preview requires completed job and authenticated signed link',()=>{
 assert.match(page,/job\.status==='completed'/);
 assert.match(page,/getSession\(\)/);
 assert.match(page,/\/api\/generation\/jobs\/download\?jobId=/);
 assert.match(page,/selected\.status==='completed'&&urls\[selected\.id\]/);
 assert.match(page,/controls autoPlay playsInline src=\{urls\[selected\.id\]\.url\}/);
});
test('does not expose storage paths or provider identifiers in playback',()=>{
 assert.doesNotMatch(page,/provider_job_id|output_path|SUPABASE_SERVICE_ROLE_KEY/);
});
