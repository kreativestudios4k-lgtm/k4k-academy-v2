import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../app/api/creative/owner-qa/route.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/k4k-app/OwnerCreativeQA.js',import.meta.url),'utf8');
const studio=readFileSync(new URL('../app/k4k-app/create/page.js',import.meta.url),'utf8');
const internal=readFileSync(new URL('../app/k4k-app/owner-qa/page.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261117130000_owner_creative_qa_jobs.sql',import.meta.url),'utf8');
test('owner real-test route is token authenticated, single-owner and separately release gated',()=>{
 for(const v of ['auth.getUser(token)','HIGGSFIELD_PREVIEW_OWNER',"K4K_OWNER_CREATIVE_QA_ENABLED==='true'","!user||user.is_anonymous","FAL_KEY"])assert.ok(route.includes(v),v);
 assert.doesNotMatch(route,/NEXT_PUBLIC_FAL_KEY|stripe_webhook|k4k_live_credit_accounts|studio_credit_accounts/);
});
test('provider test uses only four small hardcoded text generation recipes and trusted fal queue endpoint',()=>{
 for(const v of ['seedance_2_5','kling4_0','nano_banana_2','flux_3_image'])assert.ok(route.includes(v));
 for(const v of ["duration:'5'","duration:5","resolution:'480p'","resolution:'720p'","num_images:1","resolution:'1K'","resolution:'1k'","https://queue.fal.run/"])assert.ok(route.includes(v),v);
 assert.match(route,/!uuid\.test\(input\.requestKey/);
 assert.match(route,/!reserved\?\.newly_reserved/);
 assert.match(route,/SUBMISSION_UNCERTAIN_DO_NOT_RETRY/);
});
test('private video and image output only from trusted fal CDN and signed private Supabase storage',()=>{
 assert.match(route,/hostname\.endsWith\('\.fal\.media'\)/);
 assert.match(route,/outputBucket\(job\.model_key\)\)\.upload/);
 assert.match(route,/studio-qa-images/);
 assert.match(route,/studio-generations/);
 assert.match(route,/createSignedUrl\(path,600\)/);
 assert.match(route,/boundedCreativeDownload/);
 assert.doesNotMatch(route,/upsert:true/);
});
test('owner QA wallet is independent, atomic, bounded and never exposes authenticated table grants',()=>{
 for(const v of ['pg_advisory_xact_lock','enable row level security','revoke all on public.k4k_owner_creative_qa_jobs from public,anon,authenticated','grant execute on function','QA_DAILY_LIMIT','QA_TOTAL_LIMIT','QA_ACTIVE_JOB'])assert.ok(migration.includes(v),v);
 assert.match(migration,/v_count>=10/);
 assert.match(migration,/v_today\+p_micros>10000000/);
 assert.match(migration,/v_total\+p_micros>25000000/);
 assert.match(migration,/if current_user<>'service_role'/);
});
test('real test button explicitly acknowledges paid provider cost and does not charge customer credits',()=>{
 assert.match(ui,/I authorize one billable provider test/);
 assert.match(ui,/not a guaranteed provider charge limit/);
 assert.match(ui,/credits are not charged/);
 assert.match(ui,/Run one real test/);
 assert.doesNotMatch(studio,/OwnerCreativeQA/);
 assert.match(internal,/OwnerCreativeQA/);
});
