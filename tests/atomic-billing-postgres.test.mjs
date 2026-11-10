import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const user='11111111-1111-4111-8111-111111111111';
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${user}');create table public.studio_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),updated_at timestamptz default now());create table public.memberships(user_id uuid primary key,status text,plan text,stripe_customer_id text,stripe_subscription_id text,current_period_end timestamptz,last_event_created bigint,updated_at timestamptz default now());create table public.stripe_webhook_events(event_id text primary key,type text,processed_at timestamptz default now());insert into public.memberships(user_id,status,plan,stripe_customer_id,stripe_subscription_id,last_event_created) values('${user}','incomplete','starter','cus_mock','sub_mock',10);grant all on all tables in schema public to service_role;grant usage on schema public to service_role;`);
 await db.exec(readFileSync(new URL('../db/proposals/2026-11-07_subscription_credit_grants.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../db/proposals/atomic-billing.sql',import.meta.url),'utf8'));
 await db.exec(`grant select,insert on public.k4k_credit_grants to service_role;`);
 return db;
}
const invoice=(event='evt_paid',created=20,sub='sub_mock')=>`select public.k4k_apply_invoice_event('${event}','invoice.paid',${created},'${user}','cus_mock','${sub}','in_mock','active',to_timestamp(100),80) as result`;
const topup=(event='evt_topup',session='cs_mock',amount=499)=>`select public.k4k_apply_topup_event('${event}','checkout.session.completed','${session}','${user}','pi_mock','boost20',20,${amount},'GBP') as result`;
test('invoice failure rolls back membership, credit grant and processed receipt, then retry grants once',async()=>{const db=await setup();try{
 await db.exec(`insert into public.studio_credit_accounts(user_id,balance) values('${user}',0);create function public.inject_failure() returns trigger language plpgsql as $$begin if current_setting('k4k.fail',true)='on' and new.balance>old.balance then raise exception 'INJECTED_FAILURE';end if;return new;end$$;create trigger fail_grant before update on public.studio_credit_accounts for each row execute function public.inject_failure();set k4k.fail='on';set role service_role;`);
 await assert.rejects(db.query(invoice()),/INJECTED_FAILURE/);
 assert.equal((await db.query('select last_event_created from public.memberships')).rows[0].last_event_created,10);
 assert.equal((await db.query('select count(*)::integer as n from public.stripe_webhook_events')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_credit_grants')).rows[0].n,0);
 await db.exec("set k4k.fail='off'");await db.query(invoice());await db.query(invoice());await db.query(invoice('evt_same_invoice'));
 assert.equal((await db.query('select balance from public.studio_credit_accounts')).rows[0].balance,80);
 }finally{await db.close()}});
test('stale and foreign subscription invoices never grant',async()=>{const db=await setup();try{await db.exec('set role service_role');await db.query(invoice('evt_stale',5));await db.query(invoice('evt_foreign',20,'sub_other'));assert.equal((await db.query('select count(*)::integer as n from public.k4k_credit_grants')).rows[0].n,0)}finally{await db.close()}});
test('a valid same-second invoice is accepted and deduplicated',async()=>{const db=await setup();try{await db.exec('set role service_role');await db.query(invoice('evt_equal',10));assert.equal((await db.query('select balance from public.studio_credit_accounts')).rows[0].balance,80)}finally{await db.close()}});
test('top-up grants once per Checkout Session across different event deliveries',async()=>{const db=await setup();try{await db.exec('set role service_role');await Promise.all([db.query(topup()),db.query(topup('evt_topup_2'))]);assert.equal((await db.query('select balance from public.studio_credit_accounts')).rows[0].balance,20)}finally{await db.close()}});
test('wrong top-up amount fails with no balance or receipt',async()=>{const db=await setup();try{await db.exec('set role service_role');await assert.rejects(db.query(topup('evt_bad','cs_bad',1)),/INVALID_TOPUP_PRICE/);assert.equal((await db.query('select count(*)::integer as n from public.stripe_webhook_events')).rows[0].n,0)}finally{await db.close()}});
test('refund deltas cannot double-debit and spent credit reversals hold further generation',async()=>{const db=await setup();try{await db.exec('set role service_role');await db.query(topup());await db.exec(`update public.studio_credit_accounts set balance=3 where user_id='${user}'`);await db.query("select public.k4k_reverse_topup('evt_refund','charge.refunded','pi_mock',499)");await db.query("select public.k4k_reverse_topup('evt_refund_again','charge.refunded','pi_mock',499)");const row=(await db.query('select balance,billing_hold from public.studio_credit_accounts')).rows[0];assert.equal(row.balance,0);assert.equal(row.billing_hold,true);assert.equal((await db.query('select reversal_debt from public.k4k_topup_purchases')).rows[0].reversal_debt,17)}finally{await db.close()}});
test('customer roles cannot execute financial functions',async()=>{const db=await setup();try{for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query(invoice()),/permission denied/);await assert.rejects(db.query(topup()),/permission denied/);await db.exec('reset role')}}finally{await db.close()}});

test('billing hold rejects generation before the existing reserve function runs',async()=>{const db=await setup();try{
 await db.exec(`create function public.k4k_generation_reserve_draft(p_user uuid,p_job uuid,p_key uuid,p_credits integer,p_enabled boolean) returns jsonb language sql as $$select '{"reserved":true}'::jsonb$$;insert into public.studio_credit_accounts(user_id,balance,billing_hold) values('${user}',20,true);grant execute on function public.k4k_generation_reserve_draft(uuid,uuid,uuid,integer,boolean) to service_role;set role service_role;`);
 const query=`select public.k4k_generation_reserve_checked('${user}','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',2,true) as result`;
 await assert.rejects(db.query(query),/BILLING_REVIEW_REQUIRED/);
 await db.exec(`update public.studio_credit_accounts set billing_hold=false where user_id='${user}'`);
 assert.equal((await db.query(query)).rows[0].result.reserved,true);
 }finally{await db.close()}});
