import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const motion=read('app/k4k-app/higgsfield-preview/page.js');
const checkout=read('app/k4k-app/higgsfield-preview/customer-generation.js');
const rates=read('lib/server/higgsfield-genjutsu-motion.mjs');
test('quality options reveal approximate credits before upload without estimate request',()=>{
 assert.match(motion,/const billableSeconds=/);
 assert.match(motion,/const priceFor=quality=>/);
 assert.match(motion,/khm-quality-choice/);
 assert.match(motion,/khm-credit-summary/);
 assert.match(motion,/credits\+\x27 credits\x27/);
 assert.doesNotMatch(motion,/Calculate estimated cost/);
 assert.doesNotMatch(motion,/customer-preview-estimate/);
 assert.match(rates,/GENJUTSU_RATE_USD/);
});
test('private media verification and signed final credit confirmation still gate paid generation',()=>{
 assert.match(motion,/verifyUploads/);
 assert.match(motion,/verifiedInputStorage/);
 assert.match(motion,/estimatedCredits=\{credits\}/);
 assert.match(checkout,/request\('prepare'/);
 assert.match(checkout,/request\('submit'/);
 assert.match(checkout,/quote\.credits/);
 assert.match(checkout,/exact confirmed charge/);
 assert.match(checkout,/busy\?'Checking files…':'Generate · '/);
 assert.match(checkout,/Confirm & Generate ·/);
 assert.doesNotMatch(checkout,/Prepare verified quote/);
});
test('completed jobs remain in Library only, not repeated inside the creation form',()=>{
 assert.match(checkout,/\{libraryOnly&&<>/);
 assert.match(checkout,/View my generations in Library/);
 assert.match(checkout,/Refresh library/);
 assert.match(checkout,/Download MP4/);
});
