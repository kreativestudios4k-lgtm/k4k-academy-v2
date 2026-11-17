import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const schema=readFileSync(new URL('../supabase/migrations/20261117090000_k4k_higgsfield_sandbox_billing.sql',import.meta.url),'utf8');
const owner='11111111-1111-4111-8111-111111111111';
const other='44444444-4444-4444-8444-444444444444';
const job='22222222-2222-4222-8222-222222222222';
const key='33333333-3333-4333-8333-333333333333';
const fp='a'.repeat(64);
const reserve=(args={})=>{
 const {user=owner,id=job,request=key,credits=16,quote=1590000,daily=5000000,total=20000000,active=2,fingerprint=fp}=args;
 return "select public.k4k_hf_preview_reserve('"+user+"','"+id+"','"+request+"','"+fingerprint+"',"+quote+","+credits+","+daily+","+total+","+active+") as v";
};
const record=(id=job,user=owner,request='provider-id-1')=>"select public.k4k_hf_preview_record_provider('"+user+"','"+id+"','"+request+"') as v";
const finish=(outcome='failed',id=job,user=owner,request='provider-id-1')=>"select public.k4k_hf_preview_finish('"+user+"','"+id+"','"+request+"','"+outcome+"') as v";
async function fixture(){
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users(id) values('"+owner+"'),('"+other+"');grant usage on schema auth to service_role;grant select on auth.users to service_role;");
 await db.exec(schema);
 await db.exec("insert into public.k4k_hf_preview_wallets(user_id,sandbox_credits) values('"+owner+"',32),('"+other+"',12);");
 await db.exec('set role service_role');
 return db;
}
const balance=async db=>(await db.query("select sandbox_credits from public.k4k_hf_preview_wallets where user_id='"+owner+"'")).rows[0].sandbox_credits;
test('idempotent sandbox reservation debits once; replay cannot change quote or identity',async()=>{
 const db=await fixture();try{
  assert.equal((await db.query(reserve())).rows[0].v.newly_reserved,true);
  assert.equal((await db.query(reserve())).rows[0].v.newly_reserved,false);
  assert.equal(await balance(db),16);
  await assert.rejects(db.query(reserve({credits:17})),/IDEMPOTENCY_CONFLICT/);
  await assert.rejects(db.query(reserve({fingerprint:'b'.repeat(64)})),/IDEMPOTENCY_CONFLICT/);
  assert.equal((await db.query('select count(*)::integer as n from public.k4k_hf_preview_billing_jobs')).rows[0].n,1);
 }finally{await db.close()}
});
test('completed provider job settles exactly once, cannot be refunded afterward',async()=>{
 const db=await fixture();try{
  await db.query(reserve());
  assert.equal((await db.query(record())).rows[0].v.newly_recorded,true);
  assert.equal((await db.query(record())).rows[0].v.newly_recorded,false);
  await assert.rejects(db.query(finish('completed',job,owner,'wrong-request')),/PROVIDER_REQUEST_MISMATCH/);
  assert.equal((await db.query(finish('completed'))).rows[0].v.state,'settled');
  assert.equal((await db.query(finish('completed'))).rows[0].v.newly_finished,false);
  assert.equal((await db.query(finish('failed'))).rows[0].v.state,'settled');
  assert.equal(await balance(db),16);
 }finally{await db.close()}
});
test('confirmed failure refunds once; later completion cannot charge again',async()=>{
 const db=await fixture();try{
  await db.query(reserve());await db.query(record());
  assert.equal((await db.query(finish('failed'))).rows[0].v.newly_finished,true);
  assert.equal((await db.query(finish('failed'))).rows[0].v.newly_finished,false);
  assert.equal((await db.query(finish('completed'))).rows[0].v.state,'refunded');
  assert.equal(await balance(db),32);
 }finally{await db.close()}
});
test('unrecorded paid-request ambiguity never refunds automatically',async()=>{
 const db=await fixture();try{
  await db.query(reserve());
  await assert.rejects(db.query(finish('failed')),/PROVIDER_REQUEST_MISMATCH/);
  assert.equal(await balance(db),16);
 }finally{await db.close()}
});
test('budget caps, billing hold, insufficient funds and active-job limits fail closed',async()=>{
 const db=await fixture();try{
  await assert.rejects(db.query(reserve({daily:1000000})),/DAILY_BUDGET_BLOCKED/);
  await assert.rejects(db.query(reserve({total:1000000})),/TOTAL_BUDGET_BLOCKED/);
  await db.exec("update public.k4k_hf_preview_wallets set billing_hold=true where user_id='"+owner+"'");
  await assert.rejects(db.query(reserve()),/INSUFFICIENT_SANDBOX_CREDITS_OR_HOLD/);
  await db.exec("update public.k4k_hf_preview_wallets set billing_hold=false,sandbox_credits=5 where user_id='"+owner+"'");
  await assert.rejects(db.query(reserve()),/INSUFFICIENT_SANDBOX_CREDITS_OR_HOLD/);
  assert.equal((await db.query('select count(*)::integer as n from public.k4k_hf_preview_billing_jobs')).rows[0].n,0);
  await db.exec("update public.k4k_hf_preview_wallets set sandbox_credits=100 where user_id='"+owner+"'");
  await db.query(reserve({active:1}));
  await assert.rejects(db.query(reserve({id:'55555555-5555-4555-8555-555555555555',request:'66666666-6666-4666-8666-666666666666',active:1})),/ACTIVE_JOB_LIMIT/);
 }finally{await db.close()}
});
test('wrong owner cannot attach provider request or settle another account',async()=>{
 const db=await fixture();try{
  await db.query(reserve());
  await assert.rejects(db.query(record(job,other)),/JOB_NOT_FOUND/);
  await db.query(record());
  await assert.rejects(db.query(finish('failed',job,other)),/PROVIDER_REQUEST_MISMATCH/);
  assert.equal(await balance(db),16);
 }finally{await db.close()}
});
test('anon and authenticated cannot read balances or execute billing RPC',async()=>{
 const db=await fixture();try{
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(db.query(reserve()),/permission denied/);
   await assert.rejects(db.query('select * from public.k4k_hf_preview_wallets'),/permission denied/);
   await assert.rejects(db.query('select * from public.k4k_hf_preview_billing_jobs'),/permission denied/);
   await db.exec('reset role');
  }
 }finally{await db.close()}
});
test('migration does not mutate production wallets or submit provider jobs',()=>{
 assert.doesNotMatch(schema,/update public\.k4k_live_credit_accounts|update public\.studio_credit_accounts|insert into public\.studio_generation_jobs|api\.higgsfield\.ai|stripe/);
 assert.match(schema,/enable row level security/g);
 assert.match(schema,/security invoker/g);
});
