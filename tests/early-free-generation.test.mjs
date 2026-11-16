import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {earlyFreeQuoteAllowed,earlyFreeSubmissionAllowed} from '../lib/server/early-free-generation.mjs';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';
import {maySubmitDisplayedQuote} from '../lib/generation-experience.mjs';
const valid={production:true,verifiedEmail:true,sourceSeconds:15,usd:2.1,entitlement:{status:'available',attempts:0}};
test('early gift is limited to verified existing accounts, 2-15 seconds and $2.10',()=>{
 assert.equal(earlyFreeQuoteAllowed(valid),true);
 for(const change of [{production:false},{verifiedEmail:false},{sourceSeconds:15.001},{sourceSeconds:1.9},{usd:2.11},{entitlement:null},{entitlement:{status:'reserved',attempts:1}},{entitlement:{status:'consumed',attempts:1}},{entitlement:{status:'available',attempts:2}}])assert.equal(earlyFreeQuoteAllowed({...valid,...change}),false);
 assert.equal(earlyFreeSubmissionAllowed({...valid,sourceSeconds:16}),false);
});
test('free reservation uses only live service RPC, never falls back to paid credits',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{newly_reserved:true,status:'reserved'},error:null}}};
 const budget={provider:'fal',quoteMicros:2100000,dailyBudgetMicros:200000000,maxActive:1,totalBudgetMicros:200000000};
 const ledger=createGuardedGenerationLedger(client,{enabled:true,liveMode:true});
 await ledger.reserve('user','job','key',7,budget,{earlyFree:true,sourceMillis:15000});
 assert.equal(calls[0].name,'k4k_reserve_early_free_generation');assert.equal(calls[0].args.p_source_millis,15000);
 await ledger.reserve('user','job','key',7,budget);assert.equal(calls[1].name,'k4k_generation_reserve_live_budgeted');
 await assert.rejects(createGuardedGenerationLedger(client,{enabled:true}).reserve('user','job','key',7,budget,{earlyFree:true,sourceMillis:15000}),/FREE_GENERATION_LIMIT/);
});
test('free quotes require explicit confirmation and do not charge ordinary credits',()=>{
 const quote={freeGeneration:true,customerCredits:7,generationEnabled:true,quoteToken:'signed',reviewedAt:Date.now()};
 assert.equal(maySubmitDisplayedQuote(quote,7),false);
 const q=readFileSync('app/api/generation/jobs/quote/route.js','utf8');assert.match(q,/freeGeneration\?0:credits/);
 const s=readFileSync('lib/server/generation-submit-service.mjs','utf8');assert.match(s,/quote.freeGeneration===true/);assert.match(s,/earlyFreeSubmissionAllowed/);assert.match(s,/freeGeneration\?\{earlyFree:true/);
});
