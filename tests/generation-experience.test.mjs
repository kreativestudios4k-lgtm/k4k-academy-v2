import test from 'node:test';
import assert from 'node:assert/strict';
import {motionCreditPreview,maySubmitDisplayedQuote,libraryJobsWithActive} from '../lib/generation-experience.mjs';

test('local estimate includes reference and output and rounds duration conservatively',()=>{
 for(const [model,seconds,credits] of [['lite',5,14],['pro',5,28],['lite',10,28],['pro',10,56],['lite',5.01,17],['pro',15,84]]){
  const result=motionCreditPreview(model,seconds);
  assert.equal(result.credits,credits);
  assert.equal(result.outputSeconds,Math.ceil(seconds));
  assert.equal(result.resolution,model==='lite'?'720p':'1080p');
 }
 for(const seconds of [0,1.99,15.01,Infinity,NaN])assert.throws(()=>motionCreditPreview('lite',seconds));
 assert.throws(()=>motionCreditPreview('unknown',5));
});

test('automatic submission requires fresh server authorization within the displayed credit amount',()=>{
 const quote={generationEnabled:true,quoteToken:'server-signed',customerCredits:14,reviewedAt:1000};
 assert.equal(maySubmitDisplayedQuote(quote,14,1001),true);
 assert.equal(maySubmitDisplayedQuote(quote,20,1001),true);
 assert.equal(maySubmitDisplayedQuote(quote,13,1001),false);
 for(const amount of [null,undefined,0,-1,14.1,'14',NaN])assert.equal(maySubmitDisplayedQuote(quote,amount,1001),false);
 for(const changed of [{generationEnabled:false},{quoteToken:''},{blocker:'INSUFFICIENT_CREDITS'},{customerCredits:15}])assert.equal(maySubmitDisplayedQuote({...quote,...changed},14,1001),false);
 assert.equal(maySubmitDisplayedQuote(quote,14,301000),false);
});

test('active generation stays first while real terminal status replaces optimistic loading',()=>{
 const older={id:'active',status:'completed',created_at:'2026-11-10T00:00:00Z'};
 const newer={id:'other',status:'processing',created_at:'2026-11-11T00:00:00Z'};
 const source=[newer,older];
 const result=libraryJobsWithActive(source,'active',{id:'active',status:'processing'});
 assert.deepEqual(result,[older,newer]);
 assert.deepEqual(source,[newer,older]);
 assert.equal(libraryJobsWithActive([{...older,status:'failed'}],'active',{id:'active',status:'processing'})[0].status,'failed');
 assert.deepEqual(libraryJobsWithActive([newer],'active',{id:'active',status:'processing'}).map(j=>j.id),['active','other']);
 assert.deepEqual(libraryJobsWithActive([newer],null,{id:'active',status:'processing'}),[newer]);
});
