import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
// Isolated PostgreSQL runtime. Install pinned PGlite in a separate validation
// directory; provide its absolute dist/index.js path. No hosted DB connection.
const {PGlite}=await import(process.env.K4K_PGLITE_MODULE ? pathToFileURL(process.env.K4K_PGLITE_MODULE).href : '@electric-sql/pglite');
const sql=await readFile(new URL('../db/proposals/generation-credit-ledger.sql',import.meta.url),'utf8');
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';
const key=n=>`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
async function setup(){const db=new PGlite();await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create table public.studio_credit_accounts(user_id uuid primary key,balance integer not null check(balance>=0),updated_at timestamptz default now()); grant select,update on public.studio_credit_accounts to service_role; insert into public.studio_credit_accounts values('${a}',100,now()),('${b}',100,now());`);await db.exec(sql);await db.exec('set role service_role');return db;}
async function reserve(db,n=1,cost=30,user=a,input={model:'test',reference:'owned/test'}){return (await db.query('select public.k4k_generation_reserve($1,$2,$3,$4) as job',[user,key(n),input,cost])).rows[0].job;}
async function balance(db,user=a){return (await db.query('select balance from public.studio_credit_accounts where user_id=$1',[user])).rows[0].balance;}
async function attach(db,j){await db.query('select public.k4k_generation_submitting($1,$2)',[j.user_id,j.id]);await db.query('select public.k4k_generation_attach($1,$2,$3,$4)',[j.user_id,j.id,`provider_${j.id}`,`https://api.higgsfield.ai/requests/provider_${j.id}/status`]);}
async function settle(db,j,status='failed',url=null,user=j.user_id,id=`provider_${j.id}`){return db.query('select public.k4k_generation_settle($1,$2,$3,$4,$5)',[user,j.id,id,status,url]);}
test('duplicate request charges once; changed payload or price is rejected',async()=>{const db=await setup();try{const j=await reserve(db);assert.equal((await reserve(db)).id,j.id);assert.equal(await balance(db),70);await assert.rejects(reserve(db,1,31));await assert.rejects(reserve(db,1,30,a,{different:true}));assert.equal(await balance(db),70);}finally{await db.close();}});
test('insufficient credits and active-job limit leave balance unchanged',async()=>{const db=await setup();try{await assert.rejects(reserve(db,1,101));assert.equal(await balance(db),100);await reserve(db,1,30);await reserve(db,2,30);await assert.rejects(reserve(db,3,10));assert.equal(await balance(db),40);await assert.rejects(reserve(db,4,0));}finally{await db.close();}});
test('failed, moderated and canceled jobs refund exactly once',async()=>{const db=await setup();try{for(const [i,status] of ['failed','nsfw','canceled'].entries()){const j=await reserve(db,i+1);await attach(db,j);await settle(db,j,status);await settle(db,j,status);assert.equal(await balance(db),100);await assert.rejects(settle(db,j,'completed','https://media.example/out.mp4'));}assert.equal((await db.query("select count(*)::int as n from k4k_generation.ledger where kind='refund'")).rows[0].n,3);}finally{await db.close();}});
test('completion charges once, requires output and rejects wrong owner/provider',async()=>{const db=await setup();try{const j=await reserve(db);await attach(db,j);await assert.rejects(settle(db,j,'completed'));await assert.rejects(settle(db,j,'failed',null,b));await assert.rejects(settle(db,j,'failed',null,a,'other'));await settle(db,j,'completed','https://media.example/out.mp4');await settle(db,j,'completed','https://media.example/out.mp4');await assert.rejects(settle(db,j,'failed'));assert.equal(await balance(db),70);assert.equal(await balance(db,b),100);}finally{await db.close();}});
test('unknown outcomes retain reservation and cannot be marked successful',async()=>{const db=await setup();try{const j=await reserve(db);await db.query('select public.k4k_generation_submitting($1,$2)',[a,j.id]);await assert.rejects(settle(db,j,'failed'));await attach(db,j);await assert.rejects(settle(db,j,'timeout'));assert.equal(await balance(db),70);}finally{await db.close();}});
test('anonymous and authenticated clients cannot mutate ledger or invoke RPCs',async()=>{const db=await setup();try{const j=await reserve(db);for(const role of ['anon','authenticated']){await db.exec(`reset role; set role ${role}`);await assert.rejects(reserve(db));await assert.rejects(db.query('select public.k4k_generation_submitting($1,$2)',[a,j.id]));await assert.rejects(db.query('select public.k4k_generation_attach($1,$2,$3,$4)',[a,j.id,'bad','https://api.higgsfield.ai/requests/bad/status']));await assert.rejects(settle(db,j));await assert.rejects(db.query('select * from k4k_generation.jobs'));}}finally{await db.close();}});
test('whole transaction rolls back reservation and ledger together',async()=>{const db=await setup();try{await db.exec('begin');await reserve(db);await db.exec('rollback');assert.equal(await balance(db),100);assert.equal((await db.query('select count(*)::int n from k4k_generation.ledger')).rows[0].n,0);}finally{await db.close();}});
test('coordinator and store use actual SQL to submit and settle once',async()=>{
 const {createGenerationStore}=await import('../lib/server/generation-store.mjs');
 const {createGenerationCoordinator}=await import('../lib/server/generation-coordinator.mjs');
 const db=await setup();try{
 const client={rpc:async(name,params)=>{
  // Names and parameters come from the repository adapter, not user input.
  assert.match(name,/^k4k_generation_[a-z]+$/);
  const entries=Object.entries(params);try{return {data:(await db.query(`select public.${name}(${entries.map(([k],i)=>`${k} => $${i+1}`).join(',')}) as result`,entries.map(([,v])=>v))).rows[0].result,error:null};}catch(error){return {data:null,error};}
 }};
 let submits=0;
 const coordinator=createGenerationCoordinator({store:createGenerationStore(client),provider:{submit:async(input,id)=>{submits++;return {requestId:id,statusUrl:`https://api.higgsfield.ai/requests/${id}/status`};},status:async({requestId})=>({requestId,status:'completed',videoUrl:'https://media.example/out.mp4'})}});
 const args={userId:a,requestKey:key(7),input:{model:'test'},credits:20};
 const job=await coordinator.submit(args);assert.equal(job.state,'queued');assert.equal(await balance(db),80);
 await coordinator.submit(args);assert.equal(submits,1);
 assert.equal((await coordinator.refresh({userId:a,jobId:job.id})).state,'completed');
 await coordinator.refresh({userId:a,jobId:job.id});assert.equal(await balance(db),80);
 await assert.rejects(coordinator.refresh({userId:b,jobId:job.id}));
 }finally{await db.close();}
});
