import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {recordReferral,validReferralCode,referralsEnabled} from '../lib/server/referral-tracking.mjs';
const id=n=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('first-touch partner tracking preserves existing Academy accounts, forbids self-referrals, late attribution and client writes',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 create table auth.users(id uuid primary key);insert into auth.users values ${Array.from({length:7},(_,i)=>"('"+id(i+1)+"')").join(',')};
 create table public.memberships(user_id uuid primary key,status text,plan text);insert into public.memberships values('${id(3)}','active','academy_monthly');
 create table public.k4k_app_memberships(user_id uuid primary key,status text,stripe_subscription_id text,current_period_end timestamptz);
 create table public.k4k_launch_paid_claims(user_id uuid,state text);
 grant usage on schema auth to service_role;grant execute on function auth.role() to service_role;grant usage on schema public to service_role;grant select,insert,update on all tables in schema public to service_role;`);
 await db.exec(read('docs/sql/k4k-app-referral-tracking.sql'));
 await db.exec(`insert into public.k4k_app_partners(user_id,code,display_name,active) values('${id(1)}','partner-one','Partner One',true),('${id(2)}','partner-two','Partner Two',true),('${id(7)}','inactive','Inactive',false);
 insert into public.k4k_launch_paid_claims values('${id(5)}','reserved');
 insert into public.k4k_app_memberships values('${id(6)}','active','sub_already',now()+interval '1 month');
 set role service_role;set request.jwt.claim.role='service_role';`);
 const record=async(n,code)=>(await db.query("select public.k4k_app_record_referral($1,$2) as result",[id(n),code])).rows[0].result;
 assert.deepEqual(await record(3,'partner-one'),{attributed:true,code:'partner-one'});
 assert.deepEqual(await record(3,'partner-two'),{attributed:true,code:'partner-one'});
 assert.deepEqual(await record(3,null),{attributed:true,code:'partner-one'});
 assert.equal((await record(1,'partner-one')).reason,'SELF_REFERRAL');
 assert.equal((await record(4,'inactive')).reason,'INVALID_PARTNER');
 assert.equal((await record(5,'partner-one')).reason,'EXISTING_CHECKOUT');
 assert.equal((await record(6,'partner-one')).reason,'EXISTING_CHECKOUT');
 assert.equal((await record(4,'../../bad')).reason,'NO_REFERRAL');
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_app_referrals')).rows[0].n,1);
 await db.exec(`insert into public.k4k_launch_paid_claims values('${id(3)}','paid');insert into public.k4k_app_memberships values('${id(3)}','active','sub_new',now()+interval '1 month');`);
 const stats=(await db.query("select public.k4k_app_partner_stats($1) as result",[id(1)])).rows[0].result;
 assert.deepEqual(stats,{active:true,code:'partner-one',displayName:'Partner One',commissionBps:1000,referred:1,paid:1,activeSubscriptions:1});
 assert.equal((await db.query("select public.k4k_app_partner_stats($1) as result",[id(7)])).rows[0].result.active,false);
 await db.exec('reset role;set role authenticated');await assert.rejects(record(4,'partner-one'),/permission denied/);await assert.rejects(db.query('select * from public.k4k_app_referrals'),/permission denied/);
 }finally{await db.close()}
});
test('referral adapter ignores untrusted codes and fails closed if database tracking fails',async()=>{
 assert.equal(referralsEnabled({}),false);assert.equal(validReferralCode('matheusborrascah'),true);assert.equal(validReferralCode('https://evil.example'),false);
 let seen;const db={rpc:async(name,args)=>{seen={name,args};return {data:{attributed:true,code:'partner-one'}}}};
 assert.equal(await recordReferral(db,id(3),'bad/code'),'partner-one');assert.equal(seen.args.p_code,null);
 await assert.rejects(recordReferral({rpc:async()=>({error:{message:'failure'}})},id(3),'partner-one'),/REFERRAL_TRACKING_UNAVAILABLE/);
});
