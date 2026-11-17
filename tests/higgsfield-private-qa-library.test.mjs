import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api=readFileSync(new URL('../app/api/higgsfield/qa-library/route.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/k4k-app/higgsfield-connection/page.js',import.meta.url),'utf8');
test('private archive is owner-only, preview-only and based on the exact completed paid QA request',()=>{
 for(const s of ["VERCEL_ENV!=='preview'","K4K_HIGGSFIELD_OWNER_PAID_QA_ENABLED","auth.getUser(token)","user.id!==OWNER","state!=='completed'","provider_request_id!==REQUEST","safeProviderUrl","01a1e884-0fb7-70e0-bf45-b42cfd747410","studio-generations","k4k_hf_qa_claim_output"])assert.ok(api.includes(s),s);
 assert.match(api,/request\.headers\.get\('origin'\)/);
 assert.match(api,/ARCHIVE_EXISTING_SUCCESS_ONLY/);
 assert.match(api,/ingestion_state!=='not_started'/);
 assert.match(api,/upsert:false/);
 assert.match(api,/needs_review/);
});
test('archive validates content and bounded file, signs links only for owner, no customer credit mutation',()=>{
 assert.match(api,/MAX_BYTES=40\*1024\*1024/);
 assert.match(api,/response\.status!==200\|\|mime!=='video\/mp4'/);
 assert.match(api,/verifyGenerationOutputBytes\(bytes,'video\/mp4'\)/);
 assert.match(api,/createSignedUrl\(OUTPUT_PATH,120/);
 assert.match(api,/download:'K4K-Higgsfield-QA\.mp4'/);
 assert.doesNotMatch(api,/provider\.submit|api\.higgsfield\.ai|k4k_apply_invoice|credit_accounts|stripe/);
 assert.match(page,/Save existing video privately/);
 assert.match(page,/Save \/ Download MP4/);
 assert.match(page,/downloadPrivateMp4/);
 assert.match(page,/navigator\.share/);
 assert.match(page,/URL\.createObjectURL/);
 assert.match(page,/link\.download=filename/);
 assert.doesNotMatch(page,/window\.location\.assign\(payload\.downloadUrl\)/);
});

test('iPhone download is owner-scoped MP4 attachment, not a cross-origin media navigation',()=>{
 assert.match(api,/searchParams\.get\('file'\)==='1'/);
 assert.match(api,/downloadableMp4\(a\.db\)/);
 assert.match(api,/object\.download\(OUTPUT_PATH\)/);
 assert.match(api,/verifyGenerationOutputBytes\(bytes,'video\/mp4'\)/);
 assert.match(api,/Content-Disposition':'attachment; filename="K4K-Higgsfield-QA\.mp4"'/);
 assert.match(api,/Content-Length':String\(bytes\.byteLength\)/);
 assert.match(api,/Cache-Control':'private, no-store'/);
 assert.match(page,/fetch\('\/api\/higgsfield\/qa-library\?file=1'/);
 assert.match(page,/navigator\.canShare\(\{files:\[file\]\}\)/);
});
