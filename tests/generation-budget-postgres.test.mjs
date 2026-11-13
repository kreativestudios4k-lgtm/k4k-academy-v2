import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Disposable in-memory PostgreSQL. These are the production reserve/finish
// definitions inspected on 13 Nov 2026, not a connection to customer data.
const baseFunctions="CREATE OR REPLACE FUNCTION public.k4k_generation_finish(p_user uuid, p_job uuid, p_outcome text, p_output_path text DEFAULT NULL::text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare v_res public.k4k_generation_reservations%rowtype;\nbegin\n if auth.role()<>'service_role' then raise exception 'FORBIDDEN'; end if;\n if p_outcome not in ('completed','failed') then raise exception 'INVALID_OUTCOME'; end if;\n select * into v_res from public.k4k_generation_reservations where job_id=p_job and user_id=p_user for update;\n if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;\n if v_res.status<>'reserved' then return jsonb_build_object('job_id',p_job,'status',v_res.status); end if;\n if p_outcome='completed' then\n   if p_output_path is distinct from (p_user::text || '/' || p_job::text || '.mp4') then raise exception 'INVALID_OUTPUT'; end if;\n   update public.studio_generation_jobs set status='completed',output_path=p_output_path,updated_at=now() where id=p_job and user_id=p_user and status in ('queued','processing');\n   if not found then raise exception 'INVALID_JOB_STATE'; end if;\n   update public.k4k_generation_reservations set status='settled',updated_at=now() where id=v_res.id;\n else\n   update public.studio_generation_jobs set status='failed',updated_at=now() where id=p_job and user_id=p_user and status in ('queued','processing');\n   if not found then raise exception 'INVALID_JOB_STATE'; end if;\n   update public.studio_credit_accounts set balance=balance+v_res.credits,updated_at=now() where user_id=p_user;\n   if not found then raise exception 'CREDIT_ACCOUNT_MISSING'; end if;\n   update public.k4k_generation_reservations set status='refunded',updated_at=now() where id=v_res.id;\n end if;\n return jsonb_build_object('job_id',p_job,'status',case when p_outcome='failed' then 'refunded' else 'settled' end);\nend $function$\n;\n\nCREATE OR REPLACE FUNCTION public.k4k_generation_reserve_checked(p_user uuid, p_job uuid, p_key uuid, p_credits integer, p_enabled boolean)\n RETURNS jsonb\n LANGUAGE plpgsql\n SET search_path TO ''\nAS $function$\ndeclare hold boolean;\nbegin\n select billing_hold into hold from public.studio_credit_accounts where user_id=p_user for update;\n if hold then raise exception 'BILLING_REVIEW_REQUIRED';end if;\n return public.k4k_generation_reserve_draft(p_user,p_job,p_key,p_credits,p_enabled);\nend;$function$\n;\n\nCREATE OR REPLACE FUNCTION public.k4k_generation_reserve_draft(p_user uuid, p_job uuid, p_key uuid, p_credits integer, p_enabled boolean DEFAULT false)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare v_job public.studio_generation_jobs%rowtype; v_res public.k4k_generation_reservations%rowtype;\nbegin\n if auth.role() <> 'service_role' then raise exception 'FORBIDDEN'; end if;\n if not p_enabled then raise exception 'GENERATION_DISABLED'; end if;\n if p_credits is null or p_credits < 1 or p_credits > 10000 then raise exception 'INVALID_CREDITS'; end if;\n select * into v_res from public.k4k_generation_reservations where user_id=p_user and request_key=p_key;\n if found then\n   if v_res.job_id<>p_job or v_res.credits<>p_credits then raise exception 'IDEMPOTENCY_CONFLICT'; end if;\n   return jsonb_build_object('job_id',v_res.job_id,'status',v_res.status,'credits',v_res.credits,'newly_reserved',false);\n end if;\n select * into v_job from public.studio_generation_jobs where id=p_job and user_id=p_user for update;\n if not found or v_job.status<>'draft' then raise exception 'JOB_NOT_DRAFT'; end if;\n if v_job.reference_video_path is null or cardinality(v_job.reference_paths) not between 1 and 8 or v_job.model not in ('lite','pro') then raise exception 'INVALID_JOB'; end if;\n update public.studio_credit_accounts set balance=balance-p_credits,updated_at=now()\n where user_id=p_user and balance>=p_credits;\n if not found then raise exception 'INSUFFICIENT_CREDITS'; end if;\n insert into public.k4k_generation_reservations(user_id,job_id,request_key,credits)\n values(p_user,p_job,p_key,p_credits);\n update public.studio_generation_jobs set status='queued',credits_reserved=p_credits,updated_at=now() where id=p_job;\n return jsonb_build_object('job_id',p_job,'status','reserved','credits',p_credits,'newly_reserved',true);\nend $function$\n;\n";
const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const id=n=>'33333333-3333-4333-8333-'+String(n).padStart(12,'0');
const key=n=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
test('real budget SQL protects atomic reservations, total/daily/active caps and refunds',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 grant usage on schema auth to service_role; grant execute on function auth.role() to service_role;
 create table public.studio_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz default now());
 create table public.studio_generation_jobs(id uuid primary key,user_id uuid not null,status text not null,provider text,model text,reference_video_path text,reference_paths text[],credits_reserved integer default 0,output_path text,updated_at timestamptz default now());
 create table public.k4k_generation_reservations(id uuid primary key default gen_random_uuid(),user_id uuid not null,job_id uuid unique not null,request_key uuid not null,credits integer not null,status text not null default 'reserved',updated_at timestamptz default now(),unique(user_id,request_key));
 grant usage on schema public to service_role;grant all on all tables in schema public to service_role;
 insert into public.studio_credit_accounts(user_id,balance) values('${user}',100),('${other}',100);
 insert into public.studio_generation_jobs(id,user_id,status,provider,model,reference_video_path,reference_paths) values ${[1,2,3,4,5,6,7].map(n=>`('${id(n)}','${n===5?other:user}','draft','fal','${n===7?'pro':'lite'}','video.mp4',array['image.jpg'])`).join(',')};
 `);
 await db.exec(baseFunctions);
 await db.exec(readFileSync(new URL('../docs/sql/generation-budget-guard-review.sql',import.meta.url),'utf8'));
 const reserve=(n,k=n,{who=user,quote=700000,daily=2100000,total=2800000,active=2}={})=>db.query(`select public.k4k_generation_reserve_budgeted('${who}','${id(n)}','${key(k)}',7,true,'fal',${quote},${daily},${active},${total}) as result`);
 const balance=async who=>(await db.query(`select balance from public.studio_credit_accounts where user_id='${who}'`)).rows[0].balance;
 const count=async()=>(await db.query('select count(*)::integer as n from public.k4k_generation_budget_allocations')).rows[0].n;
 await db.exec("set role service_role;set request.jwt.claim.role='service_role'");
 assert.equal((await reserve(1)).rows[0].result.newly_reserved,true);
 assert.equal((await reserve(1)).rows[0].result.newly_reserved,false);
 assert.equal((await reserve(1,99)).rows[0].result.newly_reserved,false);
 assert.equal(await balance(user),93);assert.equal(await count(),1);
 await assert.rejects(reserve(2,1),/IDEMPOTENCY_CONFLICT/);
 await assert.rejects(reserve(5),/JOB_NOT_DRAFT/);
 await assert.rejects(reserve(7),/INVALID_JOB/);
 await reserve(2);assert.equal(await balance(user),86);
 await assert.rejects(reserve(3),/ACTIVE_JOB_LIMIT/);
 await db.query(`select public.k4k_generation_finish('${user}','${id(1)}','failed',null)`);
 await db.query(`select public.k4k_generation_finish('${user}','${id(1)}','failed',null)`);
 assert.equal(await balance(user),93);assert.equal(await count(),2);
 await reserve(3);assert.equal(await count(),3);
 await assert.rejects(reserve(5,5,{who:other}),/PROVIDER_DAILY_BUDGET_BLOCKED/);
 await db.exec("reset role;update public.k4k_generation_budget_allocations set created_at=now()-interval '1 day';set role service_role");
 await reserve(5,5,{who:other});
 assert.equal(await balance(other),93);assert.equal(await count(),4);
 await db.query(`select public.k4k_generation_finish('${user}','${id(2)}','completed','${user}/${id(2)}.mp4')`);
 await assert.rejects(reserve(4),/PROVIDER_TOTAL_BUDGET_BLOCKED/);
 assert.equal(await count(),4);assert.equal(await balance(user),86);
 await db.exec('reset role;set role authenticated');
 await assert.rejects(reserve(6),/permission denied/);
 }finally{await db.close()}
});
