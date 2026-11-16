import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {earlyFreeQuoteAllowed,earlyFreeSubmissionAllowed} from '../lib/server/early-free-generation.mjs';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';
import {maySubmitDisplayedQuote} from '../lib/generation-experience.mjs';
const valid={production:true,verifiedEmail:true,sourceSeconds:5,usd:.7,entitlement:{status:'available',attempts:0}};
test('early gift is limited to verified existing accounts, 2-5 seconds and $0.70',()=>{
 assert.equal(earlyFreeQuoteAllowed(valid),true);
 for(const change of [{production:false},{verifiedEmail:false},{sourceSeconds:5.001},{sourceSeconds:1.9},{usd:.71},{entitlement:null},{entitlement:{status:'reserved',attempts:1}},{entitlement:{status:'consumed',attempts:1}},{entitlement:{status:'available',attempts:2}}])assert.equal(earlyFreeQuoteAllowed({...valid,...change}),false);
 assert.equal(earlyFreeSubmissionAllowed({...valid,sourceSeconds:6}),false);
});
test('free reservation uses only live service RPC, never falls back to paid credits',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{newly_reserved:true,status:'reserved'},error:null}}};
 const budget={provider:'fal',quoteMicros:700000,dailyBudgetMicros:2000000,maxActive:1,totalBudgetMicros:70000000};
 const ledger=createGuardedGenerationLedger(client,{enabled:true,liveMode:true});
 await ledger.reserve('user','job','key',7,budget,{earlyFree:true,sourceMillis:5000});
 assert.equal(calls[0].name,'k4k_reserve_early_free_generation');assert.equal(calls[0].args.p_source_millis,5000);
 await ledger.reserve('user','job','key',7,budget);assert.equal(calls[1].name,'k4k_generation_reserve_live_budgeted');
 await assert.rejects(createGuardedGenerationLedger(client,{enabled:true}).reserve('user','job','key',7,budget,{earlyFree:true,sourceMillis:5000}),/FREE_GENERATION_LIMIT/);
});
test('free quotes require explicit confirmation and do not charge ordinary credits',()=>{
 const quote={freeGeneration:true,customerCredits:7,generationEnabled:true,quoteToken:'signed',reviewedAt:Date.now()};
 assert.equal(maySubmitDisplayedQuote(quote,7),false);
 const q=readFileSync('app/api/generation/jobs/quote/route.js','utf8');assert.match(q,/freeGeneration\?0:credits/);
 const s=readFileSync('lib/server/generation-submit-service.mjs','utf8');assert.match(s,/quote.freeGeneration===true/);assert.match(s,/earlyFreeSubmissionAllowed/);assert.match(s,/freeGeneration\?\{earlyFree:true/);
});
