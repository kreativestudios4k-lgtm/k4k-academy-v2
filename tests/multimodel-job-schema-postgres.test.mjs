import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const ddl=readFileSync(new URL('../supabase/migrations/20261116230000_k4k_multimodel_job_drafts.sql',import.meta.url),'utf8');
const uid='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const input=JSON.stringify({prompt:'An illuminated street',resolution:'720p',aspect_ratio:'9:16',duration:5});
async function setup(){
 const db=new PGlite();
 await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);");
 await db.exec("insert into auth.users(id) values ('"+uid+"')");
 await db.exec(ddl);
 return db;
}
const insert=(kind='video',model='kling-flash-t2v')=>`insert into public.k4k_multimodel_jobs (id,user_id,model,media_kind,prompt,normalized_input,input_fingerprint) values ('${id}','${uid}','${model}','${kind}','An illuminated street','${input}'::jsonb,'${'a'.repeat(64)}')`;
test('service role can create only valid isolated job drafts, not billing rows',async()=>{
 const db=await setup();
 try {
  await db.exec('set role service_role');
  await db.exec(insert());
  const {rows}=await db.query("select status,provider,credits_quoted,provider_request_id from public.k4k_multimodel_jobs");
  assert.equal(rows[0].status,'draft');
  assert.equal(rows[0].provider,'fal');
  assert.equal(rows[0].credits_quoted,null);
  assert.equal(rows[0].provider_request_id,null);
  assert.equal((await db.query("select count(*)::int as n from public.k4k_multimodel_jobs")).rows[0].n,1);
 }finally{await db.close();}
});
test('rejects model-to-media mismatches and invalid credit quotes',async()=>{
 const db=await setup();
 try {
  await db.exec('set role service_role');
  await assert.rejects(db.exec(insert('image','kling-flash-t2v')),/multimodel_kind_match/);
  await db.exec(insert());
  await assert.rejects(db.exec("update public.k4k_multimodel_jobs set credits_quoted=12 where id='"+id+"'"),/multimodel_quote_complete/);
  await assert.rejects(db.exec("update public.k4k_multimodel_jobs set output_mime='image/png',output_path='fake.png' where id='"+id+"'"),/multimodel_output_kind/);
  await assert.rejects(db.exec("update public.k4k_multimodel_jobs set provider_request_id='bogus' where status='draft'"),/multimodel_draft_not_dispatched/);
 }finally{await db.close();}
});
test('anonymous and ordinary authenticated roles have no direct read or write access',async()=>{
 const db=await setup();
 try {
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(db.query('select * from public.k4k_multimodel_jobs'),/permission denied/);
   await assert.rejects(db.exec(insert()),/permission denied/);
   await db.exec('reset role');
  }
 }finally{await db.close();}
});
