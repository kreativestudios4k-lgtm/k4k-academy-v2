import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const migrations=['20261116230000_k4k_multimodel_job_drafts.sql','20261116231000_k4k_multimodel_atomic_ledger.sql','20261116232000_k4k_multimodel_dispatch_claims.sql','20261117093000_k4k_multimodel_higgsfield_ledger_support.sql'].map(f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
const user='11111111-1111-4111-8111-111111111111',job='22222222-2222-4222-8222-222222222222',key='33333333-3333-4333-8333-333333333333',fingerprint='a'.repeat(64);
async function setup(){
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.role() returns text language sql stable as $$select current_user::text$$;create table auth.users(id uuid primary key);insert into auth.users values('"+user+"');create table public.k4k_live_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz default now());insert into public.k4k_live_credit_accounts(user_id,balance) values('"+user+"',40);create table public.studio_generation_jobs(id uuid primary key,user_id uuid not null,status text not null);create table public.k4k_generation_budget_allocations(job_id uuid primary key references public.studio_generation_jobs(id),user_id uuid not null,provider text not null,quote_micros bigint not null,created_at timestamptz default now());grant usage on schema auth to service_role;grant execute on function auth.role() to service_role;grant usage on schema public to service_role;grant select,update on public.k4k_live_credit_accounts to service_role;grant select on public.studio_generation_jobs to service_role;grant select on public.k4k_generation_budget_allocations to service_role;");
 for(const m of migrations)await db.exec(m);
 await db.exec("insert into public.k4k_multimodel_jobs(id,user_id,provider,model,media_kind,prompt,normalized_input,input_fingerprint,quoted_usd_micros,credits_quoted,quote_expires_at) values('"+job+"','"+user+"','higgsfield','genjutsu-motion','video','Swap central character','{\"resolution\":\"480p\",\"sourceSeconds\":4.76667}', '"+fingerprint+"',1590000,16,now()+interval '5 minutes');");
 await db.exec('set role service_role');
 return db;
}
const reserve=(daily=5000000,total=10000000)=>"select public.k4k_multimodel_reserve_live('"+user+"','"+job+"','"+key+"','"+fingerprint+"',1590000,16,true,"+daily+","+total+",2) as v";
const balance=async db=>(await db.query("select balance from public.k4k_live_credit_accounts where user_id='"+user+"'")).rows[0].balance;
test('higgsfield reserve uses same atomic live-wallet ledger once and correct provider budget',async()=>{
 const db=await setup();try{
  assert.equal((await db.query(reserve())).rows[0].v.newly_reserved,true);
  assert.equal((await db.query(reserve())).rows[0].v.newly_reserved,false);
  assert.equal(await balance(db),24);
  assert.equal((await db.query("select provider from public.k4k_multimodel_budget_allocations where job_id='"+job+"'")).rows[0].provider,'higgsfield');
  assert.equal((await db.query("select status from public.k4k_multimodel_reservations where job_id='"+job+"'")).rows[0].status,'reserved');
 }finally{await db.close()}
});
test('one-shot claim and authenticated provider request preserve no-retry guarantee',async()=>{
 const db=await setup();try{
  await db.query(reserve());
  assert.equal((await db.query("select public.k4k_multimodel_claim_dispatch('"+user+"','"+job+"') as v")).rows[0].v.claimed,true);
  assert.equal((await db.query("select public.k4k_multimodel_claim_dispatch('"+user+"','"+job+"') as v")).rows[0].v.claimed,false);
  await assert.rejects(db.query("select public.k4k_multimodel_finish_live('"+user+"','"+job+"','failed')"),/PROVIDER_DISPATCH_REVIEW_REQUIRED/);
  await db.query("select public.k4k_multimodel_record_provider_request('"+user+"','"+job+"','higgsfield_request_123')");
  assert.equal((await db.query("select public.k4k_multimodel_finish_live('"+user+"','"+job+"','completed','video/mp4','"+user+"/"+job+".mp4') as v")).rows[0].v.status,'settled');
  assert.equal(await balance(db),24);
 }finally{await db.close()}
});
test('failed before claiming provider refund is exactly once',async()=>{
 const db=await setup();try{
  await db.query(reserve());
  assert.equal((await db.query("select public.k4k_multimodel_finish_live('"+user+"','"+job+"','failed') as v")).rows[0].v.newly_finished,true);
  assert.equal((await db.query("select public.k4k_multimodel_finish_live('"+user+"','"+job+"','failed') as v")).rows[0].v.newly_finished,false);
  assert.equal(await balance(db),40);
 }finally{await db.close()}
});
test('daily and total global budgets and billing holds reject without credit mutations',async()=>{
 const db=await setup();try{
  await assert.rejects(db.query(reserve(1000000,10000000)),/PROVIDER_DAILY_BUDGET_BLOCKED/);
  await assert.rejects(db.query(reserve(5000000,1000000)),/PROVIDER_TOTAL_BUDGET_BLOCKED/);
  await db.exec("update public.k4k_live_credit_accounts set billing_hold=true where user_id='"+user+"'");
  await assert.rejects(db.query(reserve()),/BILLING_REVIEW_REQUIRED/);
  assert.equal(await balance(db),40);
 }finally{await db.close()}
});
test('model identity rejects attempting Genjutsu as fal or fal model as Higgsfield',async()=>{
 const db=await setup();try{
  await assert.rejects(db.query("update public.k4k_multimodel_jobs set provider='fal' where id='"+job+"'"),/multimodel_kind_match/);
  await assert.rejects(db.query("update public.k4k_multimodel_jobs set model='kling-flash-t2v' where id='"+job+"'"),/multimodel_kind_match/);
 }finally{await db.close()}
});
test('public roles cannot read or charge; checkout not enabled by migration',async()=>{
 const db=await setup();try{
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(db.query(reserve()),/permission denied/);
   await assert.rejects(db.query('select * from public.k4k_multimodel_jobs'),/permission denied/);
   await db.exec('reset role');
  }
  assert.equal((await db.query('select count(*)::integer as n from public.k4k_multimodel_dispatch_claims')).rows[0].n,0);
 }finally{await db.close()}
});
