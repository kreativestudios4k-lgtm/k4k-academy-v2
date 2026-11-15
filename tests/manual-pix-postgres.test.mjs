import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${user}'),('${other}');
 create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to service_role,authenticated;grant execute on function auth.role(),auth.uid() to service_role,authenticated;
 create table public.studio_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),billing_hold boolean default false,updated_at timestamptz default now());
 create table public.k4k_live_credit_accounts(like public.studio_credit_accounts including all);
 create table public.k4k_app_memberships(user_id uuid primary key,status text,stripe_subscription_id text);
 create table public.k4k_launch_paid_claims(id uuid primary key default gen_random_uuid(),user_id uuid,plan_key text,price_id text,currency text,credits integer,state text default 'reserved',created_at timestamptz default now());
 create table public.stripe_webhook_events(event_id text primary key,type text,processed_at timestamptz default now());
 grant all on all tables in schema public to service_role;
 insert into public.studio_credit_accounts(user_id,balance) values('${user}',999);
 `);
 await db.exec(readFileSync(new URL('../docs/sql/brazil-manual-pix-review.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../docs/sql/brazil-manual-pix-custom-products.sql',import.meta.url),'utf8'));
 await db.exec("set role service_role;set request.jwt.claim.role='service_role'");return db;
}
const reserve=(db,mode='live',who=user,cap=1600)=>db.query(`select public.k4k_manual_pix_reserve('${who}','${mode}','starter','price_starter','prod_starter',20,${cap}) as r`).then(r=>r.rows[0].r);
const apply=(db,o,event='evt_paid',session='cs_'+o.credit_mode+'_paid',intent='pi_paid')=>db.query(`select public.k4k_manual_pix_apply('${o.id}','${event}','checkout.session.completed','${session}','${intent}',now()) as r`);
const balance=async(db,live=true)=>(await db.query('select balance,billing_hold from public.'+(live?'k4k_live_credit_accounts':'studio_credit_accounts')+` where user_id='${user}'`)).rows[0];
test('manual Pix grants once across webhook and reconciliation and isolates Test/Live without membership writes',async()=>{
 const db=await setup();try{
  const o=await reserve(db);assert.equal((await reserve(db)).id,o.id);
  await Promise.all([apply(db,o),apply(db,o,'evt_copy')]);
  assert.equal((await balance(db)).balance,80);assert.equal((await balance(db,false)).balance,999);
  assert.equal((await db.query('select count(*)::int as n from public.k4k_app_memberships')).rows[0].n,0);
  await assert.rejects(reserve(db),/MANUAL_PIX_PERIOD_ACTIVE/);
  await db.exec(`update public.k4k_manual_pix_orders set period_end=now()-interval '1 second' where id='${o.id}'`);
  const renewal=await reserve(db);await apply(db,renewal,'evt_manual_renewal','cs_live_renewal','pi_renewal');
  assert.equal((await balance(db)).balance,160);
  const t=await reserve(db,'test');await apply(db,t,'evt_test','cs_test_paid','pi_test');
  assert.equal((await balance(db)).balance,160);assert.equal((await balance(db,false)).balance,1079);
 }finally{await db.close()}
});
test('database failure rolls back credit, order and event receipt and retry remains possible',async()=>{
 const db=await setup();try{
  const o=await reserve(db);await db.exec(`reset role;create function public.fail_grant() returns trigger language plpgsql as $$begin raise exception 'INJECTED_FAILURE';end$$;create trigger fail before update on public.k4k_live_credit_accounts for each row execute function public.fail_grant();set role service_role`);
  await assert.rejects(apply(db,o),/INJECTED_FAILURE/);
  assert.equal((await db.query('select count(*)::int as n from public.stripe_webhook_events')).rows[0].n,0);
  await db.exec('reset role;drop trigger fail on public.k4k_live_credit_accounts;set role service_role');await apply(db,o);
  assert.equal((await balance(db)).balance,80);
 }finally{await db.close()}
});
test('refunds debit only deltas, spent credits create a hold, and disputes before fulfillment cannot be lost',async()=>{
 const db=await setup();try{
  const o=await reserve(db);await apply(db,o);
  await db.query(`select public.k4k_manual_pix_review('${o.id}','evt_refund','charge.refunded','pi_paid',5500)`);
  await db.query(`select public.k4k_manual_pix_review('${o.id}','evt_refund_copy','charge.refunded','pi_paid',5500)`);
  assert.equal((await balance(db)).balance,39);
  await db.exec(`update public.k4k_live_credit_accounts set balance=3 where user_id='${user}'`);
  await db.query(`select public.k4k_manual_pix_review('${o.id}','evt_full','charge.refunded','pi_paid',10999)`);
  assert.equal((await balance(db)).balance,0);assert.equal((await balance(db)).billing_hold,true);
  const debt=(await db.query(`select reversal_debt from public.k4k_manual_pix_orders where id='${o.id}'`)).rows[0].reversal_debt;assert.equal(debt,36);
  const t=await reserve(db,'test');
  await db.query(`select public.k4k_manual_pix_review('${t.id}','evt_early_dispute','charge.dispute.created','pi_test',0)`);
  await apply(db,t,'evt_late_paid','cs_test_paid','pi_test');assert.equal((await balance(db,false)).billing_hold,true);
  await assert.rejects(reserve(db,'test'),/BILLING_REVIEW_REQUIRED/);
 }finally{await db.close()}
});
test('card and manual purchases share funding capacity and cannot overlap for the same user',async()=>{
 const db=await setup();try{
  await reserve(db,'live',user,80);
  await assert.rejects(db.query(`select public.k4k_app_launch_claim_paid('${other}','starter','price_card','BRL',20,80)`),/LAUNCH_CREDIT_CAPACITY/);
  await assert.rejects(db.query(`select public.k4k_app_launch_claim_paid('${user}','starter','price_card','BRL',20,1600)`),/LAUNCH_CHECKOUT_PENDING/);
  await db.exec("update public.k4k_manual_pix_orders set state='expired'");
  await db.query(`select public.k4k_app_launch_claim_paid('${other}','starter','price_card','BRL',20,80)`);
  await assert.rejects(reserve(db,'live',user,80),/LAUNCH_CREDIT_CAPACITY/);
 }finally{await db.close()}
});
test('customer roles cannot mutate orders or execute grant RPCs and owner-only RLS protects purchases',async()=>{
 const db=await setup();try{
  const o=await reserve(db);await apply(db,o);
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${other}'`);
  assert.equal((await db.query('select id from public.k4k_manual_pix_orders')).rows.length,0);
  await assert.rejects(apply(db,o,'forged'),/permission denied/);
  await assert.rejects(db.query('update public.k4k_manual_pix_orders set credits=9999'),/permission denied/);
  await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select id from public.k4k_manual_pix_orders')).rows.length,1);
  await assert.rejects(db.query('select stripe_payment_intent_id from public.k4k_manual_pix_orders'),/permission denied/);
 }finally{await db.close()}
});

test('an unfulfilled dispute retains funding capacity and expiry updates are idempotent',async()=>{
 const db=await setup();try{
  const o=await reserve(db,'live',user,80);
  await db.query(`select public.k4k_manual_pix_review('${o.id}','evt_disputed_before_paid','charge.dispute.created','pi_pending',0)`);
  await assert.rejects(reserve(db,'live',other,80),/LAUNCH_CREDIT_CAPACITY/);
  await assert.rejects(reserve(db,'live',user,80),/BILLING_REVIEW_REQUIRED/);
  const t=await reserve(db,'test',other);
  const expire=`select public.k4k_manual_pix_bind('${t.id}','${other}','cs_test_expired',true)`;
  await db.query(expire);await db.query(expire);
  const next=await reserve(db,'test',other);assert.notEqual(next.id,t.id);
 }finally{await db.close()}
});

test('manual Pix accepts only the matching approved custom product and preserves duplicate reservation',async()=>{
 const db=await setup();try{
  const call=product=>db.query(`select public.k4k_manual_pix_reserve('${user}','live','starter','price_starter','${product}',20,1600) as r`);
  for(const product of ['k4k_app_studio_2026','k4k_academy_starter_2026','unapproved'])await assert.rejects(call(product),/MANUAL_PIX_CONFIG_INVALID/);
  const o=(await call('k4k_app_starter_2026')).rows[0].r;
  assert.equal(o.product_id,'k4k_app_starter_2026');
  assert.equal((await call('k4k_app_starter_2026')).rows[0].r.id,o.id);
  assert.equal(await balance(db),undefined);
 }finally{await db.close()}
});
