import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

// Stage 4: DISPOSABLE PostgreSQL only; no production Supabase connection or Stripe payments.
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const job='33333333-3333-4333-8333-333333333333';
const originalPrice='price_1UbQB0L7fmdMaK0kr3CRE9bd';
const starterV2='price_1UdblmL7fmdMaK0kyknLHpoV';
const single='price_1UdaO5L7fmdMaK0kvyYSd3Fj';
const schema=readFileSync(new URL('../db/proposals/k4k-v2-credit-wallet-schema-review.sql',import.meta.url),'utf8');
const functions=readFileSync(new URL('../db/proposals/k4k-v2-credit-atomic-rpcs-review.sql',import.meta.url),'utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
  create schema auth;create table auth.users(id uuid primary key);
  insert into auth.users(id) values('${owner}'),('${other}');
  create table public.k4k_live_credit_accounts(user_id uuid primary key,balance integer not null check (balance>=0));
  insert into public.k4k_live_credit_accounts(user_id,balance) values('${owner}',80);
  grant usage on schema public to authenticated,service_role;
  grant select on public.k4k_live_credit_accounts to service_role;`);
 await db.exec(schema);
 await db.exec(functions);
 return db;
}
const grant=(event='stripe_evt_grant',user=owner,receipt='in_invoice_123',price=starterV2,amount=1599,credits=420,source='subscription_invoice',currency='GBP')=>
 `select public.k4k_v2_grant_paid('${event}','${user}','${receipt}','${source}','${price}',${amount},'${currency}',${credits}) as v`;
const reserve=(event='stripe_evt_job_reserve',user=owner,credits=140,id=job,hash='a'.repeat(64))=>
 `select public.k4k_v2_reserve_generation('${event}','${user}','${id}','${hash}',2100000,${credits}) as v`;
const finish=(event='stripe_evt_job_finish',user=owner,outcome='settled',id=job)=>
 `select public.k4k_v2_finish_generation('${event}','${user}','${id}','${outcome}') as v`;
const refund=(event='stripe_evt_refund',user=owner,receipt='in_invoice_123')=>
 `select public.k4k_v2_refund_paid('${event}','${user}','${receipt}') as v`;
const wallet=async db=>(await db.query(`select available,reserved,reversal_debt,billing_hold from public.k4k_v2_credit_accounts where user_id='${owner}'`)).rows[0];

test('atomic paid receipt grants new Starter V2 credits only once, never legacy wallet',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  const first=(await db.query(grant())).rows[0].v;
  const dupe=(await db.query(grant('stripe_evt_repeat'))).rows[0].v;
  assert.equal(first.credited,true);assert.equal(dupe.credited,false);
  assert.equal((await wallet(db)).available,420);
  assert.equal((await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance,80);
  assert.equal((await db.query('select count(*)::integer as n from public.k4k_v2_credit_receipts')).rows[0].n,1);
 }finally{await db.close()}
});
test('old Stripe LIVE Starter price cannot grant new V2 credits and cross-owner replay fails',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  await assert.rejects(db.query(grant('stripe_evt_old',owner,'in_old_123',originalPrice)),/V2_PRICE_ENTITLEMENT_MISMATCH/);
  await db.query(grant());
  await assert.rejects(db.query(grant('stripe_evt_other_owner',other)),/V2_RECEIPT_REPLAY_CONFLICT/);
  assert.equal((await wallet(db)).available,420);
 }finally{await db.close()}
});
test('failed grant is atomic: a conflicting event key leaves no receipt and no wallet debit',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  await db.query(grant());
  await assert.rejects(db.query(grant('stripe_evt_grant',owner,'in_second',starterV2,1599,420)),/duplicate key/);
  assert.equal((await wallet(db)).available,420);
  assert.equal((await db.query('select count(*)::integer as n from public.k4k_v2_credit_receipts')).rows[0].n,1);
 }finally{await db.close()}
});
test('single video GBP one-time payment credits 140 with unique payment intent',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  const receipt=(await db.query(grant('stripe_evt_single',owner,'pi_single_123',single,599,140,'single_video_payment'))).rows[0].v;
  assert.equal(receipt.credits,140);
  assert.equal((await wallet(db)).available,140);
  await assert.rejects(db.query(grant('stripe_evt_wrong_source',owner,'pi_not_invoice',single,599,140,'subscription_invoice')),/V2_RECEIPT_INVALID/);
 }finally{await db.close()}
});
test('generation reserve/settle and duplicate retries are atomic and idempotent',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  await db.query(grant('stripe_evt_single',owner,'pi_single_123',single,599,140,'single_video_payment'));
  assert.equal((await db.query(reserve())).rows[0].v.reserved,true);
  assert.equal((await db.query(reserve('job_reserve_duplicate'))).rows[0].v.reserved,false);
  assert.equal((await wallet(db)).available,0);
  assert.equal((await wallet(db)).reserved,140);
  assert.equal((await db.query(finish())).rows[0].v.changed,true);
  assert.equal((await db.query(finish('job_finish_duplicate'))).rows[0].v.changed,false);
  assert.equal((await wallet(db)).reserved,0);
  await assert.rejects(db.query(finish('job_wrong',owner,'released')),/V2_JOB_ALREADY_FINAL/);
 }finally{await db.close()}
});
test('failed generation releases once; wrong owner, quote or overdraw are rejected',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  await db.query(grant('stripe_evt_single',owner,'pi_single_123',single,599,140,'single_video_payment'));
  await assert.rejects(db.query(reserve('bad_owner',other)),/V2_ACCOUNT_MISSING/);
  await assert.rejects(db.query(reserve('overdraw',owner,141)),/INSUFFICIENT_V2_CREDITS/);
  await db.query(reserve());
  await assert.rejects(db.query(reserve('bad_quote',owner,140,job,'b'.repeat(64))),/V2_JOB_REPLAY_CONFLICT/);
  assert.equal((await db.query(finish('released_evt',owner,'released'))).rows[0].v.changed,true);
  assert.equal((await wallet(db)).available,140);
 }finally{await db.close()}
});
test('full refund after spent credits creates debt and billing hold; subsequent paid invoices pay debt',async()=>{
 const db=await fixture();try{
  await db.exec('set role service_role');
  await db.query(grant('stripe_evt_single',owner,'pi_single_123',single,599,140,'single_video_payment'));
  await db.query(reserve());await db.query(finish());
  const first=(await db.query(refund('evt_charge_refund',owner,'pi_single_123'))).rows[0].v;
  assert.equal(first.debt_added,140);
  assert.equal((await wallet(db)).billing_hold,true);
  assert.equal((await db.query(refund('evt_retry_refund',owner,'pi_single_123'))).rows[0].v.refunded,false);
  await assert.rejects(db.query(reserve('new_job_reject',owner,1,'44444444-4444-4444-8444-444444444444')),/BILLING_REVIEW_REQUIRED/);
  await db.query(grant('evt_new_invoice',owner,'in_invoice_new',starterV2,1599,420));
  assert.equal((await wallet(db)).reversal_debt,0);
  assert.equal((await wallet(db)).available,280);
  assert.equal((await wallet(db)).billing_hold,true);
 }finally{await db.close()}
});
test('authenticated/anon callers cannot execute financial RPCs or read V2 balances',async()=>{
 const db=await fixture();try{
  await db.exec('set role authenticated');
  await assert.rejects(db.query(grant()),/permission denied/);
  await assert.rejects(db.query('select * from public.k4k_v2_credit_accounts'),/permission denied/);
  await db.exec('set role anon');
  await assert.rejects(db.query(refund()),/permission denied/);
 }finally{await db.close()}
});
