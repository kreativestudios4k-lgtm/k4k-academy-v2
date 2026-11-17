// K4K pre-release doctor. Read-only checks: never touches accounts, provider APIs or credits.
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {generationReference} from '../lib/template-generation.mjs';
import {genjutsuEstimate,genjutsuCustomerMaxUsd} from '../lib/server/higgsfield-genjutsu-motion.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const errors=[];
function ensure(ok,message){if(!ok)errors.push(message);}
const catalogue=JSON.parse(read('app/k4k-app/template-catalogue.json'));
const originals=catalogue.discoveryPreviews.filter(item=>item.k4kOriginal===true);
ensure(originals.length===10,'Motion: expected ten K4K Originals');
for(const item of originals){
 const ref=generationReference(item);
 ensure(ref.supported&&ref.seconds>=4&&ref.seconds<=30,'Motion: invalid 4–30s generation source: '+item.id);
 ensure(item.previewOnly!==true,'Motion: valid original blocked as preview-only: '+item.id);
 ensure(/^https:\/\/(?:v3b\.fal\.media|d2ol7oe51mr4n9\.cloudfront\.net)\//.test(ref.url||''),'Motion: unsupported source host: '+item.id);
}
const env={K4K_GENERATION_MAX_USD:'5',K4K_MOTION_720P_APPROVED:'true'};
ensure(genjutsuEstimate({sourceSeconds:30,resolution:'480p'}).usd<=genjutsuCustomerMaxUsd('480p',env),'Motion: 30s at 480p must fit a $5 per-job provider limit');
ensure(genjutsuEstimate({sourceSeconds:30,resolution:'720p'}).usd>genjutsuCustomerMaxUsd('720p',env),'Motion: do not accidentally enable unfunded 720p 30s');
const studio=read('app/k4k-app/higgsfield-preview/page.js');
const checkout=read('app/k4k-app/higgsfield-preview/customer-generation.js');
const templateRoute=read('app/api/generation/template-reference/route.js');
ensure(templateRoute.includes('durationSeconds>30'),'Template import must independently validate a 30s ceiling');
ensure(studio.includes('canGenerate={castReady&&billableSeconds!==null&&withinBudget}'),'Motion: Generate must enforce quality budget and cast readiness');
ensure(studio.includes('onPrepareMedia={verifyUploads}'),'Motion: private media verification must occur before quote');
ensure(checkout.includes("request('prepare'"),'Motion: signed quote phase is missing');
ensure(checkout.includes("request('submit'"),'Motion: final confirmation phase is missing');
for(const forbidden of ['Verify files privately · No credits charged','Run one real test','Owner QA · Real provider generation']){
 ensure(!studio.includes(forbidden),'Customer Motion page contains old test/verification UI: '+forbidden);
}
const pkg=JSON.parse(read('package.json'));
ensure(!!pkg.scripts?.['test:all'],'Release: missing full test command');
ensure(!!pkg.scripts?.build,'Release: missing application build command');
ensure(existsSync(new URL('package-lock.json',root)),'Release: missing npm lockfile');
if(errors.length){console.error('K4K RELEASE DOCTOR FAILED:\n'+errors.map((e,i)=>'  '+(i+1)+'. '+e).join('\n'));process.exitCode=1;}
else console.log('K4K RELEASE DOCTOR OK: original 4–30s routes, protected credits and customer UI verified. No paid generation or customer mutation.');
