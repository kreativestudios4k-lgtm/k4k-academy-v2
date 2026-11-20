// Disposable in-memory PostgreSQL; never connects to live Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const u1='11111111-1111-4111-8111-111111111111';
const u2='22222222-2222-4222-8222-222222222222';
const job='33333333-3333-4333-8333-333333333333';
const file=readFileSync(new URL('../db/proposals/k4k-v2-credit-wallet-schema-review.sql',import.meta.url),'utf8');
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users(id) values('${u1}'),('${u2}');
 create table public.k4k_live_credit_accounts(user_id uuid primary key,balance integer not null);
 insert into public.k4k_live_credit_accounts values('${u1}',80);
 grant usage on schema public to authenticated,service_role;`);
 await db.exec(file);
 return db;
}
test('V2 draft DDL parses and creates four RLS-enabled, service-role-only tables',async()=>{
 const db=await setup();try{
  const r=await db.query("select tablename,rowsecurity from pg_tables where schemaname='public' and tablename like 'k4k_v2_%' order by tablename");
  assert.equal(r.rows.length,4);
  assert.ok(r.rows.every(x=>x.rowsecurity===true));
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from public.k4k_v2_credit_accounts'),/permission denied/);
  await db.exec('reset role;set role service_role');
  assert.equal((await db.query('select count(*)::integer as n from public.k4k_v2_credit_accounts')).rows[0].n,0);
 }finally{await db.close();}
});
test('new V2 rows cannot mutate old K4K LIVE accounts',async()=>{
 const db=await setup();try{
  await db.exec(`insert into public.k4k_v2_credit_accounts(user_id,available) values('${u1}',420)`);
  const legacy=(await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${u1}'`)).rows[0];
  assert.equal(legacy.balance,80);
  const v2=(await db.query(`select available,reserved,reversal_debt from public.k4k_v2_credit_accounts where user_id='${u1}'`)).rows[0];
  assert.deepEqual([v2.available,v2.reserved,v2.reversal_debt],[420,0,0]);
 }finally{await db.close();}
});
test('V2 receipt and event uniqueness prevent duplicate invoice or payment-intent records',async()=>{
 const db=await setup();try{
  await db.exec(`insert into public.k4k_v2_credit_accounts(user_id) values('${u1}');
  insert into public.k4k_v2_credit_receipts(receipt_key,user_id,source_kind,stripe_price_id,amount_minor,currency,credited,first_paid_event)
  values('pi_01234567','${u1}','single_video_payment','price_1UdaO5L7fmdMaK0kvyYSd3Fj',599,'GBP',140,'evt_111111');
  insert into public.k4k_v2_credit_events(event_key,user_id,event_kind,payment_receipt,delta_available,delta_reserved,delta_reversal_debt,payload_sha256)
  values('stripe_evt_111111','${u1}','grant_paid','pi_01234567',140,0,0,'${'a'.repeat(64)}')`);
  await assert.rejects(db.query(`insert into public.k4k_v2_credit_receipts(receipt_key,user_id,source_kind,stripe_price_id,amount_minor,currency,credited,first_paid_event) values('pi_01234567','${u2}','single_video_payment','price_fake',599,'GBP',140,'evt_222222')`),/duplicate key/);
  await assert.rejects(db.query(`insert into public.k4k_v2_credit_events(event_key,user_id,event_kind,payment_receipt,delta_available,delta_reserved,delta_reversal_debt,payload_sha256) values('stripe_evt_111111','${u1}','grant_paid','pi_01234567',140,0,0,'${'a'.repeat(64)}')`),/duplicate key/);
 }finally{await db.close();}
});
test('invalid cross-version, negative balances and wrong Stripe source types cannot be inserted',async()=>{
 const db=await setup();try{
  await assert.rejects(db.query(`insert into public.k4k_v2_credit_accounts(user_id,credit_version) values('${u1}','legacy')`),/check constraint/);
  await assert.rejects(db.query(`insert into public.k4k_v2_credit_accounts(user_id,available) values('${u1}',-1)`),/check constraint/);
  await assert.rejects(db.query(`insert into public.k4k_v2_credit_receipts(receipt_key,user_id,source_kind,stripe_price_id,amount_minor,currency,credited,first_paid_event) values('pi_99999999','${u1}','subscription_invoice','price_12345',599,'GBP',140,'evt_222222')`),/check constraint/);
 }finally{await db.close();}
});
test('a V2 generation reservation belongs to one job and cannot be silently duplicated',async()=>{
 const db=await setup();try{
  await db.query(`insert into public.k4k_v2_generation_reservations(job_id,user_id,quote_sha256,provider_cost_micros,credits)
  values('${job}','${u1}','${'b'.repeat(64)}',2100000,140)`);
  await assert.rejects(db.query(`insert into public.k4k_v2_generation_reservations(job_id,user_id,quote_sha256,provider_cost_micros,credits)
  values('${job}','${u2}','${'b'.repeat(64)}',2100000,140)`),/duplicate key/);
  await assert.rejects(db.query(`insert into public.k4k_v2_generation_reservations(job_id,user_id,quote_sha256,provider_cost_micros,credits)
  values('44444444-4444-4444-8444-444444444444','${u1}','${'b'.repeat(64)}',2100000,0)`),/check constraint/);
 }finally{await db.close();}
});
