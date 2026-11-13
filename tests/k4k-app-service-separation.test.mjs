import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const u='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('isolated K4K APP purchase preserves existing Academy membership, grants credits once and enforces ownership',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to service_role,authenticated;grant execute on function auth.role(),auth.uid() to service_role,authenticated;
 create table auth.users(id uuid primary key);insert into auth.users values('${u}'),('${other}');
 create table public.memberships(user_id uuid primary key,status text,plan text,stripe_customer_id text,stripe_subscription_id text,current_period_end timestamptz,last_event_created bigint,updated_at timestamptz default now());
 insert into public.memberships(user_id,status,plan,stripe_customer_id,stripe_subscription_id,last_event_created) values('${u}','active','k4k_monthly','cus_academy','sub_academy',50);
 create table public.studio_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz default now());
 create table public.stripe_webhook_events(event_id text primary key,type text,processed_at timestamptz default now());
 grant all on all tables in schema public to service_role;grant usage on schema public to service_role;`);
 await db.exec(read('db/proposals/2026-11-07_subscription_credit_grants.sql'));
 // Mirror the verified production grants on this pre-existing ledger.
 await db.exec('grant select,insert on public.k4k_credit_grants to service_role');
 await db.exec(read('docs/sql/soft-launch-admission.sql'));
 await db.exec(read('docs/sql/k4k-app-service-separation.sql'));
 await db.exec(`set role service_role;set request.jwt.claim.role='service_role';`);
 const claim=(await db.query(`select public.k4k_app_launch_claim_paid('${u}','starter','price_starterGBP','GBP',25,2400) as result`)).rows[0].result;
 assert.equal(claim.credits,80);
 await db.exec(`insert into public.k4k_app_memberships(user_id,status,plan,stripe_customer_id,stripe_subscription_id,last_event_created) values('${u}','inactive','starter','cus_app','sub_app',10),('${other}','active','creator','cus_other','sub_other',10)`);
 const invoice=(event,customer='cus_app',subscription='sub_app')=>db.query(`select public.k4k_app_apply_invoice_event('${event}','invoice.paid',20,'${u}','${customer}','${subscription}','in_app','active',to_timestamp(100),80) as result`);
 await assert.rejects(invoice('evt_wrong','cus_academy','sub_academy'),/UNKNOWN_CUSTOMER/);
 await invoice('evt_app');await invoice('evt_app');await invoice('evt_app_retry');
 assert.equal((await db.query('select balance from public.studio_credit_accounts')).rows[0].balance,80);
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_credit_grants')).rows[0].n,1);
 const academy=(await db.query('select status,plan,stripe_customer_id,stripe_subscription_id,last_event_created from public.memberships')).rows[0];
 assert.deepEqual(academy,{status:'active',plan:'k4k_monthly',stripe_customer_id:'cus_academy',stripe_subscription_id:'sub_academy',last_event_created:50});
 const app=(await db.query(`select status,plan,stripe_subscription_id from public.k4k_app_memberships where user_id='${u}'`)).rows[0];
 assert.deepEqual(app,{status:'active',plan:'starter',stripe_subscription_id:'sub_app'});
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${u}';`);
 assert.equal((await db.query('select user_id from public.k4k_app_memberships')).rows.length,1);
 await assert.rejects(db.query("update public.k4k_app_memberships set status='active'"),/permission denied/);
 await assert.rejects(invoice('evt_customer'),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from public.k4k_app_memberships'),/permission denied/);
 }finally{await db.close()}
});
