import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const owner='11111111-1111-4111-8111-111111111111';
const other='44444444-4444-4444-8444-444444444444';
const job='22222222-2222-4222-8222-222222222222';
const key='33333333-3333-4333-8333-333333333333';
const fp='a'.repeat(64);
const schemas=[
 '../supabase/migrations/20261116230000_k4k_multimodel_job_drafts.sql',
 '../supabase/migrations/20261116231000_k4k_multimodel_atomic_ledger.sql',
 '../supabase/migrations/20261116232000_k4k_multimodel_dispatch_claims.sql'
].map(p=>readFileSync(new URL(p,import.meta.url),'utf8'));
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.role() returns text language sql stable as $$select current_user::text$$;
 create table auth.users(id uuid primary key);
 insert into auth.users values('${owner}'),('${other}');
 create table public.k4k_live_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz default now());
 create table public.studio_generation_jobs(id uuid primary key,user_id uuid not null,status text not null);
 create table public.k4k_generation_budget_allocations(job_id uuid primary key references public.studio_generation_jobs(id) on delete restrict,user_id uuid not null,provider text not null,quote_micros bigint not null,created_at timestamptz default now());
 insert into public.k4k_live_credit_accounts(user_id,balance) values('${owner}',40);
 grant usage on schema auth to service_role;grant execute on function auth.role() to service_role;
 grant usage on schema public to service_role;grant all on all tables in schema public to service_role;`);
 for(const schema of schemas)await db.exec(schema);
 await db.exec(`grant select,update on public.k4k_live_credit_accounts to service_role;
 grant select on public.studio_generation_jobs to service_role;
 grant select,insert on public.k4k_generation_budget_allocations to service_role;
 insert into public.k4k_multimodel_jobs(id,user_id,model,media_kind,prompt,normalized_input,input_fingerprint,quoted_usd_micros,credits_quoted,quote_expires_at)
 values('${job}','${owner}','kling-flash-t2v','video','A mountain at dawn','{"prompt":"A mountain at dawn","duration":5,"resolution":"720p","aspect_ratio":"9:16"}','${fp}',470000,5,now()+interval '5 minutes');`);
 return db;
}
const reserve=(requestKey=key,credits=5,uid=owner)=>`select public.k4k_multimodel_reserve_live('${uid}','${job}','${requestKey}','${fp}',470000,${credits},true,100000000,200000000,1) as result`;
const finish=(outcome,mime=null,path=null)=>`select public.k4k_multimodel_finish_live('${owner}','${job}','${outcome}',${mime?"'"+mime+"'":'null'},${path?"'"+path+"'":'null'}) as result`;
async function asService(db){await db.exec('set role service_role');}
test('reserve debits live wallet exactly once, including request-key retries',async()=>{
 const db=await setup();try{
 await asService(db);
 const first=(await db.query(reserve())).rows[0].result;
 assert.equal(first.newly_reserved,true);
 const retry=(await db.query(reserve())).rows[0].result;
 assert.equal(retry.newly_reserved,false);
 const anotherKey=(await db.query(reserve('55555555-5555-4555-8555-555555555555'))).rows[0].result;
 assert.equal(anotherKey.newly_reserved,false);
 assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,35);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_multimodel_budget_allocations')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_generation_budget_allocations')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_multimodel_budget_allocations')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_multimodel_reservations')).rows[0].n,1);
 }finally{await db.close();}
});
test('failed generation refunds once, and cannot subsequently settle',async()=>{
 const db=await setup();try{
 await asService(db);await db.query(reserve());
 assert.equal((await db.query(finish('failed'))).rows[0].result.newly_finished,true);
 assert.equal((await db.query(finish('failed'))).rows[0].result.newly_finished,false);
 assert.equal((await db.query(finish('completed','video/mp4',owner+'/'+job+'.mp4'))).rows[0].result.status,'refunded');
 assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,40);
 }finally{await db.close();}
});
test('rejects completion without provider identity and without expected output path',async()=>{
 const db=await setup();try{
 await asService(db);await db.query(reserve());
 await assert.rejects(db.query(finish('completed','video/mp4',owner+'/'+job+'.mp4')),/PROVIDER_NOT_RECORDED/);
 await db.query(`select public.k4k_multimodel_claim_dispatch('${owner}','${job}')`);
 await db.query(`select public.k4k_multimodel_record_provider_request('${owner}','${job}','trusted-request-id')`);
 await assert.rejects(db.query(finish('completed','image/png',owner+'/'+job+'.png')),/INVALID_OUTPUT/);
 await assert.rejects(db.query(finish('completed','video/mp4',owner+'/wrong.mp4')),/INVALID_OUTPUT/);
 assert.equal((await db.query(finish('completed','video/mp4',owner+'/'+job+'.mp4'))).rows[0].result.status,'settled');
 assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,35);
 }finally{await db.close();}
});
test('invalid request, changed quote, credit shortage, and hold are side-effect free',async()=>{
 const db=await setup();try{
 await asService(db);
 await assert.rejects(db.query(reserve(key,6)),/QUOTE_CHANGED/);
 await assert.rejects(db.query(reserve(key,5,other)),/QUOTE_CHANGED/);
 await db.exec(`update public.k4k_live_credit_accounts set billing_hold=true where user_id='${owner}'`);
 await assert.rejects(db.query(reserve()),/BILLING_REVIEW_REQUIRED/);
 await db.exec(`update public.k4k_live_credit_accounts set billing_hold=false,balance=2 where user_id='${owner}'`);
 await assert.rejects(db.query(reserve()),/INSUFFICIENT_CREDITS/);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_multimodel_reservations')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_generation_budget_allocations')).rows[0].n,0);
 }finally{await db.close();}
});
test('anonymous/authenticated roles cannot call financial functions',async()=>{
 const db=await setup();try{
 for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 await assert.rejects(db.query(reserve()),/permission denied/);
 await assert.rejects(db.query(finish('failed')),/permission denied/);
 await db.exec('reset role');
 }
 }finally{await db.close();}
});

test('new budget ledger includes legacy allocations and fails closed when budget exhausted',async()=>{
 const db=await setup();try{
 await db.exec(`insert into public.studio_generation_jobs(id,user_id,status) values('55555555-5555-4555-8555-555555555555','${owner}','completed');
 insert into public.k4k_generation_budget_allocations(job_id,user_id,provider,quote_micros) values('55555555-5555-4555-8555-555555555555','${owner}','fal',900000);`);
 await asService(db);
 await assert.rejects(db.query(reserve().replace('100000000,200000000,1','1000000,200000000,1')),/PROVIDER_DAILY_BUDGET_BLOCKED/);
 assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,40);
 assert.equal((await db.query('select count(*)::int as n from public.k4k_multimodel_budget_allocations')).rows[0].n,0);
 }finally{await db.close();}
});
test('simultaneous reserve requests on one connection never double debit',async()=>{
 const db=await setup();try{
 await asService(db);
 const results=await Promise.all([db.query(reserve()),db.query(reserve()),db.query(reserve())]);
 assert.equal(results.filter(r=>r.rows[0].result.newly_reserved).length,1);
 assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,35);
 assert.equal((await db.query('select count(*)::int as n from public.k4k_multimodel_budget_allocations')).rows[0].n,1);
 }finally{await db.close();}
});

test('claimed paid dispatch cannot refund even if the HTTP outcome is uncertain',async()=>{
 const db=await setup();try{
 await asService(db);
 await db.query(reserve());
 const claim=await db.query(`select public.k4k_multimodel_claim_dispatch('${owner}','${job}') as result`);
 assert.equal(claim.rows[0].result.claimed,true);
 await assert.rejects(db.query(finish('failed')),/PROVIDER_DISPATCH_REVIEW_REQUIRED/);
 assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,35);
 assert.equal((await db.query(`select status from public.k4k_multimodel_reservations where job_id='${job}'`)).rows[0].status,'reserved');
 const repeat=await db.query(`select public.k4k_multimodel_claim_dispatch('${owner}','${job}') as result`);
 assert.equal(repeat.rows[0].result.claimed,false);
 }finally{await db.close();}
});
