import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {launchLimits,openLaunchCheckout} from '../lib/server/soft-launch.mjs';
const id=n=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
test('live admission locks seats and credit commitments, refunds no credits, and grants exactly five one-time tester allowances',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;grant usage on schema auth to service_role;grant execute on function auth.role() to service_role;create table auth.users(id uuid primary key);insert into auth.users values ${Array.from({length:8},(_,i)=>"('"+id(i+1)+"')").join(',')};create table public.memberships(user_id uuid primary key,stripe_subscription_id text,status text);create table public.studio_credit_accounts(user_id uuid primary key references auth.users(id),balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz default now());grant usage on schema public to service_role;grant all on all tables in schema public to service_role;grant select on auth.users to service_role;`);
 await db.exec(readFileSync(new URL('../docs/sql/soft-launch-admission.sql',import.meta.url),'utf8'));
 await db.exec("set role service_role;set request.jwt.claim.role='service_role'");
 const claim=(n,plan='starter',seats=2,credits=240)=>db.query(`select public.k4k_launch_claim_paid('${id(n)}','${plan}','price_${plan}','USD',${seats},${credits}) as result`);
 const c=(await claim(1)).rows[0].result;assert.equal(c.credits,80);assert.equal((await claim(1)).rows[0].result.id,c.id);
 await assert.rejects(claim(1,'creator'),/LAUNCH_CHECKOUT_PENDING/);await assert.rejects(claim(2,'studio'),/LAUNCH_CREDIT_CAPACITY/);await claim(2,'creator');await assert.rejects(claim(3),/LAUNCH_SOLD_OUT/);
 const session='cs_live_abc123456789';await db.query(`select public.k4k_launch_checkout_update('${c.id}','${id(1)}','${session}','bind')`);await assert.rejects(db.query(`select public.k4k_launch_checkout_update('${c.id}','${id(1)}','cs_live_different123','expired')`),/LAUNCH_SESSION_INVALID/);
 await db.query(`select public.k4k_launch_checkout_update('${c.id}','${id(1)}','${session}','expired')`);assert.notEqual((await claim(1)).rows[0].result.id,c.id);
 for(let n=1;n<=5;n++)assert.equal((await db.query(`select public.k4k_launch_grant_tester('${id(n)}') as result`)).rows[0].result.granted,true);
 assert.equal((await db.query(`select public.k4k_launch_grant_tester('${id(1)}') as result`)).rows[0].result.granted,false);
 await assert.rejects(db.query(`select public.k4k_launch_grant_tester('${id(6)}')`),/TESTER_LIMIT/);
 assert.equal((await db.query('select sum(balance)::integer as total from public.studio_credit_accounts')).rows[0].total,400);
 await db.exec('reset role;set role authenticated');await assert.rejects(claim(7),/permission denied/);
 }finally{await db.close()}
});
test('launch config fails closed and Stripe session uses one durable idempotency key',async()=>{
 assert.throws(()=>launchLimits({}),/LAUNCH_NOT_OPEN/);
 assert.deepEqual(launchLimits({K4K_SOFT_LAUNCH_ENABLED:'true',K4K_LAUNCH_PAID_SEATS:'25',K4K_LAUNCH_PAID_CREDIT_BUDGET:'2400'}),{seats:25,credits:2400});
 const claim={id:id(1),user_id:id(2),state:'reserved',expires_epoch:10000,stripe_session_id:null};
 const session={id:'cs_live_abc123456789',mode:'subscription',livemode:true,status:'open',client_reference_id:id(2),metadata:{k4k_launch_claim:id(1)},url:'https://checkout.stripe.com/c/pay/cs_live_abc123456789'};
 const calls=[];const database={rpc:async(name,args)=>{calls.push({name,args});return {data:{id:id(1)}}}};
 const fetchImpl=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>session}};
 assert.equal(await openLaunchCheckout({database,claim,secret:'sk_live_test',form:new URLSearchParams(),now:6500,fetchImpl}),session.url);
 assert.equal(calls[0].options.headers['Idempotency-Key'],'k4k-launch-'+claim.id);assert.equal(calls[1].args.p_outcome,'bind');
 await assert.rejects(openLaunchCheckout({database,claim:{...claim,expires_epoch:8000},secret:'sk_live_test',form:new URLSearchParams(),now:6500,fetchImpl}),/LAUNCH_CHECKOUT_REVIEW/);
});
