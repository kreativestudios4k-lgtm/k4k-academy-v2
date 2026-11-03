import test from 'node:test';
import assert from 'node:assert/strict';
import {issueQuoteToken} from '../lib/server/generation-quote-token.mjs';
import {quoteGeneration} from '../lib/server/generation-quote.mjs';
import {verifyCurrentGenerationQuote,reserveVerifiedGeneration} from '../lib/server/generation-reservation-gate.mjs';
const userId='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65',requestKey='d7411f09-a330-49b4-a953-2838b75eb99a',secret='z'.repeat(64),now=100000;
const model={verified:true,enabled:true,currency:'GBP',durations:[5],resolutions:['720p'],maxAllInCostPence:{'720p':{'5':50}},quoteVersion:'verified-v1'};
const catalog={genjutsu:model},q=quoteGeneration({modelId:'genjutsu',durationSeconds:5,resolution:'720p'},catalog);
const token=issueQuoteToken({userId,quote:q,secret,now});
const args={token,userId,secret,catalog,now:now+1000,requestKey,input:{videoPath:'owned/verified.mp4'}};
test('recomputes current server price before reserving and ignores browser credits',async()=>{
 let calls=0;
 const result=await reserveVerifiedGeneration({...args,input:{...args.input,credits:1,modelId:'evil'},authorize:async()=>true,store:{reserve:async(...a)=>{calls++;assert.equal(a[3],36);assert.equal(a[2].modelId,'genjutsu');return {id:'job'};}}});
 assert.equal(result.id,'job');assert.equal(calls,1);
});
test('changed cost or catalog version fails before any store call',async()=>{
 let calls=0;
 const store={reserve:async()=>calls++},authorize:async()=>true;
 for(const patch of [{maxAllInCostPence:{'720p':{'5':51}}},{quoteVersion:'verified-v2'},{enabled:false}]){
 await assert.rejects(reserveVerifiedGeneration({...args,catalog:{genjutsu:{...model,...patch}},store,authorize}));
 }
 assert.equal(calls,0);
});
test('wrong account, expired token and denied media fail closed',async()=>{
 let calls=0;const store={reserve:async()=>calls++};
 await assert.rejects(reserveVerifiedGeneration({...args,userId:'7c92fe60-10eb-4185-9b2d-36a8f23ab3d3',store,authorize:async()=>true}));
 await assert.rejects(reserveVerifiedGeneration({...args,now:now+120000,store,authorize:async()=>true}));
 await assert.rejects(reserveVerifiedGeneration({...args,store,authorize:async()=>false}));
 await assert.rejects(reserveVerifiedGeneration({...args,store}));
 assert.equal(calls,0);
});
test('invalid idempotency key and malformed input are rejected',async()=>{
 await assert.rejects(reserveVerifiedGeneration({...args,requestKey:'bad',authorize:async()=>true,store:{reserve:async()=>null}}));
 await assert.rejects(reserveVerifiedGeneration({...args,input:[],authorize:async()=>true,store:{reserve:async()=>null}}));
 assert.equal(verifyCurrentGenerationQuote(args).credits,36);
});
