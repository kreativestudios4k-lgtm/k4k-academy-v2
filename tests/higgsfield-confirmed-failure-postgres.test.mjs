import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createHiggsfieldConfirmedFailureReconciler} from '../lib/server/higgsfield-confirmed-failure.mjs';
const user='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',key='33333333-3333-4333-8333-333333333333',rid='provider-request-123',fp='a'.repeat(64),evidence='b'.repeat(64);
const schemas=['20261116230000_k4k_multimodel_job_drafts.sql','20261116231000_k4k_multimodel_atomic_ledger.sql','20261116232000_k4k_multimodel_dispatch_claims.sql','20261117093000_k4k_multimodel_higgsfield_ledger_support.sql','20261117100000_k4k_multimodel_verified_terminal_refunds.sql'].map(f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
async function fixture(){
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.role() returns text language sql stable as $$select current_user::text$$;create table auth.users(id uuid primary key);insert into auth.users values('"+user+"');create table public.k4k_live_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz default now());insert into public.k4k_live_credit_accounts(user_id,balance) values('"+user+"',40);create table public.studio_generation_jobs(id uuid primary key,user_id uuid not null,status text not null);create table public.k4k_generation_budget_allocations(job_id uuid primary key references public.studio_generation_jobs(id),user_id uuid not null,provider text not null,quote_micros bigint not null,created_at timestamptz default now());grant usage on schema auth to service_role;grant execute on function auth.role() to service_role;grant usage on schema public to service_role;grant select,update on public.k4k_live_credit_accounts to service_role;grant select on public.studio_generation_jobs to service_role;grant select on public.k4k_generation_budget_allocations to service_role;");
 for(const s of schemas)await db.exec(s);
 await db.exec("insert into public.k4k_multimodel_jobs(id,user_id,provider,model,media_kind,prompt,normalized_input,input_fingerprint,quoted_usd_micros,credits_quoted,quote_expires_at) values('"+id+"','"+user+"','higgsfield','genjutsu-motion','video','Swap person','{\"resolution\":\"480p\"}', '"+fp+"',1590000,16,now()+interval '5 minutes');");
 await db.exec('set role service_role');
 await db.query("select public.k4k_multimodel_reserve_live('"+user+"','"+id+"','"+key+"','"+fp+"',1590000,16,true,10000000,20000000,2)");
 await db.query("select public.k4k_multimodel_claim_dispatch('"+user+"','"+id+"')");
 await db.query("select public.k4k_multimodel_record_provider_request('"+user+"','"+id+"','"+rid+"')");
 return db;
}
const bal=async db=>(await db.query("select balance from public.k4k_live_credit_accounts where user_id='"+user+"'")).rows[0].balance;
const refund=(status='failed',digest=evidence)=>"select public.k4k_multimodel_refund_confirmed_provider_failure('"+user+"','"+id+"','"+rid+"','"+status+"','"+digest+"') as v";
test('confirmed failure restores live credits once and preserves terminal evidence',async()=>{
 const db=await fixture();try{
  assert.equal(await bal(db),24);
  assert.equal((await db.query(refund())).rows[0].v.newly_finished,true);
  assert.equal((await db.query(refund())).rows[0].v.newly_finished,false);
  assert.equal(await bal(db),40);
  assert.equal((await db.query("select count(*)::integer as n from public.k4k_multimodel_terminal_evidence")).rows[0].n,1);
  assert.equal((await db.query("select status from public.k4k_multimodel_reservations where job_id='"+id+"'")).rows[0].status,'refunded');
  await assert.rejects(db.query(refund('failed','c'.repeat(64))),/EVIDENCE_CONFLICT/);
 }finally{await db.close()}
});
test('wrong request, unknown status, malformed evidence, anon role fail with no refund',async()=>{
 const db=await fixture();try{
  await assert.rejects(db.query(refund('queued')),/INVALID_VERIFIED_TERMINAL_EVIDENCE/);
  await assert.rejects(db.query(refund('failed','bad')),/INVALID_VERIFIED_TERMINAL_EVIDENCE/);
  await assert.rejects(db.query("select public.k4k_multimodel_refund_confirmed_provider_failure('"+user+"','"+id+"','different','failed','"+evidence+"')"),/PROVIDER_REQUEST_NOT_AUTHENTICATED/);
  assert.equal(await bal(db),24);
  await db.exec('set role authenticated');
  await assert.rejects(db.query(refund()),/permission denied/);
 }finally{await db.close()}
});
test('completed job never refunds; no late failure can undo settlement',async()=>{
 const db=await fixture();try{
  await db.query("select public.k4k_multimodel_finish_live('"+user+"','"+id+"','completed','video/mp4','"+user+"/"+id+".mp4')");
  assert.equal((await db.query(refund())).rows[0].v.status,'settled');
  assert.equal(await bal(db),24);
  assert.equal((await db.query("select count(*)::int as n from public.k4k_multimodel_terminal_evidence")).rows[0].n,0);
 }finally{await db.close()}
});
test('authenticated provider adapter refunds only terminal request-matched state',async()=>{
 let calls=0;const job={id,user_id:user,provider:'higgsfield',model:'genjutsu-motion',status:'processing',provider_request_id:rid};
 const adapter=createHiggsfieldConfirmedFailureReconciler({enabled:true,getOwnedJob:async()=>job,
  provider:{status:async request=>({request_id:request,status:'failed'})},
  ledger:{rpc:async(name,args)=>{calls++;assert.equal(name,'k4k_multimodel_refund_confirmed_provider_failure');assert.equal(args.p_terminal_status,'failed');assert.equal(args.p_evidence_digest.length,64);return {data:{job_id:id,status:'refunded',newly_finished:true},error:null};}}});
 assert.deepEqual(await adapter.reconcile({userId:user,jobId:id}),{status:'refunded',refunded:true});
 assert.equal(calls,1);
});
test('provider status mismatch, pending, success, disabled adapter and network errors cannot refund',async()=>{
 const job={id,user_id:user,provider:'higgsfield',model:'genjutsu-motion',status:'processing',provider_request_id:rid};
 for(const status of ['queued','in_progress','completed']){
  const adapter=createHiggsfieldConfirmedFailureReconciler({enabled:true,getOwnedJob:async()=>job,
   provider:{status:async()=>({request_id:rid,status})},ledger:{rpc:async()=>{throw Error('NO_REFUND')}}});
  assert.equal((await adapter.reconcile({userId:user,jobId:id})).refunded,false);
 }
 const adapter=createHiggsfieldConfirmedFailureReconciler({enabled:true,getOwnedJob:async()=>job,
  provider:{status:async()=>({request_id:'wrong',status:'failed'})},ledger:{rpc:async()=>{throw Error('NO_REFUND')}}});
 await assert.rejects(adapter.reconcile({userId:user,jobId:id}),/PROVIDER_STATUS_ID_MISMATCH/);
 const offline=createHiggsfieldConfirmedFailureReconciler({enabled:true,getOwnedJob:async()=>job,
  provider:{status:async()=>{throw Error('provider timeout')}},ledger:{rpc:async()=>{throw Error('NO_REFUND')}}});
 await assert.rejects(offline.reconcile({userId:user,jobId:id}),/provider timeout/);
 await assert.rejects(createHiggsfieldConfirmedFailureReconciler({enabled:false}).reconcile({userId:user,jobId:id}),/HIGGSFIELD_FAILURE_RECONCILIATION_DISABLED/);
});
