import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationLifecycle} from '../lib/server/generation-lifecycle.mjs';
import {createGuardedGenerationLedger} from '../lib/server/guarded-generation-ledger.mjs';

const identity={userId:'11111111-1111-4111-8111-111111111111',jobId:'22222222-2222-4222-8222-222222222222',requestKey:'33333333-3333-4333-8333-333333333333',tier:'lite',input:{}};
function harness({balance=20,failProvider=false}={}){
 const state={balance,reservations:new Map(),calls:[],submissions:0,refunds:0};
 const rpc=async(name,args)=>{
  state.calls.push(name);
  if(name==='k4k_generation_reserve_draft'){
   const existing=state.reservations.get(args.p_key);
   if(existing){
    if(existing.job!==args.p_job||existing.credits!==args.p_credits)return {data:null,error:{message:'IDEMPOTENCY_CONFLICT'}};
    return {data:{status:existing.status,newly_reserved:false},error:null};
   }
   if(state.balance<args.p_credits)return {data:null,error:{message:'INSUFFICIENT_CREDITS'}};
   state.balance-=args.p_credits;
   state.reservations.set(args.p_key,{job:args.p_job,credits:args.p_credits,status:'reserved'});
   return {data:{status:'reserved',newly_reserved:true},error:null};
  }
  if(name==='k4k_generation_finish'){
   const reservation=[...state.reservations.values()].find(x=>x.job===args.p_job);
   if(!reservation)return {data:null,error:{message:'RESERVATION_NOT_FOUND'}};
   if(reservation.status!=='reserved')return {data:{status:reservation.status},error:null};
   if(args.p_outcome==='failed'){
    state.balance+=reservation.credits;state.refunds++;reservation.status='refunded';
   }else{reservation.status='settled';}
   return {data:{status:reservation.status},error:null};
  }
  return {data:null,error:{message:'UNKNOWN_RPC'}};
 };
 const ledger=createGuardedGenerationLedger({rpc},{enabled:true});
 const provider={submit:async()=>{state.submissions++;if(failProvider)throw Error('mock provider rejected');return {request_id:'mock-request',status:'queued'};}};
 const lifecycle=createGenerationLifecycle({ledger,provider,priceCredits:()=>7,enabled:true,providerEnabled:true});
 return {state,ledger,lifecycle};
}
test('new reservation deducts exactly once; retries never submit twice',async()=>{
 const {state,lifecycle}=harness();
 const result=await lifecycle.run(identity);
 assert.equal(result.status,'submitted');assert.equal(state.balance,13);assert.equal(state.submissions,1);
 await assert.rejects(lifecycle.run(identity),/RESERVATION_NOT_NEW/);
 assert.equal(state.balance,13);assert.equal(state.submissions,1);
});
test('mocked provider failure refunds once even if finish retried',async()=>{
 const {state,ledger,lifecycle}=harness({failProvider:true});
 await assert.rejects(lifecycle.run(identity),/GENERATION_SUBMISSION_FAILED/);
 assert.equal(state.balance,20);assert.equal(state.refunds,1);
 await ledger.finish(identity.userId,identity.jobId,'failed');
 assert.equal(state.balance,20);assert.equal(state.refunds,1);
});
test('insufficient credits rejects before provider submission',async()=>{
 const {state,lifecycle}=harness({balance:2});
 await assert.rejects(lifecycle.run(identity),/GENERATION_LEDGER_UNAVAILABLE/);
 assert.equal(state.balance,2);assert.equal(state.submissions,0);
});
test('settlement does not refund, and subsequent failure cannot refund',async()=>{
 const {state,ledger,lifecycle}=harness();
 await lifecycle.run(identity);
 await ledger.finish(identity.userId,identity.jobId,'completed',identity.userId+'/44444444-4444-4444-8444-444444444444.mp4');
 await ledger.finish(identity.userId,identity.jobId,'failed');
 assert.equal(state.balance,13);assert.equal(state.refunds,0);
});
