import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createGenerationOutputIngestor} from '../lib/server/generation-output-ingestion.mjs';
import {createMultimodelPrivateDelivery} from '../lib/server/multimodel-private-delivery.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const jobId='22222222-2222-4222-8222-222222222222';
const requestKey='33333333-3333-4333-8333-333333333333';
const fp='a'.repeat(64);
const png=new Uint8Array(2048);
png.set([137,80,78,71,13,10,26,10],0);
png.set([73,72,68,82],12);
const migrationFiles=['20261116230000_k4k_multimodel_job_drafts.sql','20261116231000_k4k_multimodel_atomic_ledger.sql','20261116232000_k4k_multimodel_dispatch_claims.sql'];
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create function auth.role() returns text language sql stable as $$select current_user::text$$;
 create table auth.users(id uuid primary key);
 insert into auth.users values('${owner}');
 create table public.k4k_live_credit_accounts(user_id uuid primary key references auth.users(id),balance integer not null check(balance>=0),billing_hold boolean not null default false,updated_at timestamptz not null default now());
 insert into public.k4k_live_credit_accounts(user_id,balance) values('${owner}',10);
 create table public.studio_generation_jobs(id uuid primary key,user_id uuid not null,status text not null);
 create table public.k4k_generation_budget_allocations(job_id uuid primary key references public.studio_generation_jobs(id),user_id uuid not null,provider text not null,quote_micros bigint not null,created_at timestamptz default now());
 grant usage on schema auth to service_role;
 grant execute on function auth.role() to service_role;
 grant usage on schema public to service_role;
 grant select,update on public.k4k_live_credit_accounts to service_role;
 grant select on public.studio_generation_jobs to service_role;
 grant select on public.k4k_generation_budget_allocations to service_role;`);
 for(const file of migrationFiles){
  await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 }
 await db.exec(`insert into public.k4k_multimodel_jobs(id,user_id,model,media_kind,prompt,normalized_input,input_fingerprint,quoted_usd_micros,credits_quoted,quote_expires_at)
 values('${jobId}','${owner}','flux3-t2i','image','Mountain sunrise','{"prompt":"Mountain sunrise","resolution":"1k","aspect_ratio":"1:1","output_format":"png"}','${fp}',100000,1,now()+interval '5 minutes');`);
 await db.exec('set role service_role');
 return db;
}
const reserve=`select public.k4k_multimodel_reserve_live('${owner}','${jobId}','${requestKey}','${fp}',100000,1,true,200000,200000,1) as result`;
const balance=async db=>(await db.query(`select balance from public.k4k_live_credit_accounts where user_id='${owner}'`)).rows[0].balance;
test('isolated preview fixture: quote -> debit -> one dispatch -> complete -> private signed PNG',async()=>{
 const db=await fixture();
 const objects=new Map();
 const signed=[];
 const storage={from(bucket){
  assert.equal(bucket,'studio-generations');
  return {
   upload:async(path,bytes,{contentType,upsert})=>{
    if(objects.has(path)||upsert!==false)return {error:{message:'duplicate'}};
    objects.set(path,{bytes,contentType});return {error:null};
   },
   info:async path=>{
    const file=objects.get(path);
    return file?{data:{size:file.bytes.length,contentType:file.contentType},error:null}:{data:null,error:{message:'missing'}};
   },
   createSignedUrl:async(path,seconds,options)=>{
    signed.push({path,seconds,options});
    return {data:{signedUrl:'https://project.supabase.co/storage/v1/object/sign/studio-generations/'+path+'?token=mock'},error:null};
   }
  };
 }};
 try{
  const first=(await db.query(reserve)).rows[0].result;
  assert.equal(first.newly_reserved,true);
  const retry=(await db.query(reserve)).rows[0].result;
  assert.equal(retry.newly_reserved,false);
  assert.equal(await balance(db),9);
  const claim=(await db.query(`select public.k4k_multimodel_claim_dispatch('${owner}','${jobId}') as result`)).rows[0].result;
  assert.equal(claim.claimed,true);
  assert.equal((await db.query(`select public.k4k_multimodel_claim_dispatch('${owner}','${jobId}') as result`)).rows[0].result.claimed,false);
  await db.query(`select public.k4k_multimodel_record_provider_request('${owner}','${jobId}','fal_request_1')`);
  const ingest=createGenerationOutputIngestor({storage,enabled:true});
  const media=await ingest({userId:owner,jobId,providerJobId:'fal_request_1',bytes:png,contentType:'image/png'});
  assert.equal(media.outputPath,owner+'/'+jobId+'.png');
  const settled=(await db.query(`select public.k4k_multimodel_finish_live('${owner}','${jobId}','completed','image/png','${media.outputPath}') as result`)).rows[0].result;
  assert.equal(settled.status,'settled');
  assert.equal((await db.query(`select public.k4k_multimodel_finish_live('${owner}','${jobId}','completed','image/png','${media.outputPath}') as result`)).rows[0].result.newly_finished,false);
  assert.equal(await balance(db),9);
  const jobStore={getOwnedJob:async(userId,id)=>{
   const {rows}=await db.query('select id,user_id,model,media_kind,status,provider_request_id,output_path,output_mime from public.k4k_multimodel_jobs where id=$1 and user_id=$2',[id,userId]);
   return rows[0]??null;
  }};
  const delivery=createMultimodelPrivateDelivery({jobStore,storage,enabled:true});
  const downloaded=await delivery.getSignedUrl({userId:owner,jobId,download:true});
  assert.equal(downloaded.fileName,'K4K-'+jobId+'.png');
  assert.equal(downloaded.expiresIn,120);
  assert.equal(signed.length,1);
  assert.deepEqual(signed[0].options,{download:'K4K-'+jobId+'.png'});
  await assert.rejects(delivery.getSignedUrl({userId:'44444444-4444-4444-8444-444444444444',jobId}),/JOB_NOT_FOUND/);
  assert.equal(signed.length,1);
 }finally{await db.close();}
});
