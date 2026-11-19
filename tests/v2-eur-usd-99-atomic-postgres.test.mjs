// CI disposable PGlite only. SQL proposal is NOT a LIVE migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {
 V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,V2_PRIOR_EUR_USD_PLAN_PRICES,
 V2_PRIOR_EUR_USD_PLAN_MINOR,V2_SINGLE_VIDEO,V2_PRIOR_EUR_USD_SINGLE_VIDEO,
 V2_MONTHLY_CREDITS,PRESERVED_LIVE_PLAN_PRICES
} from '../lib/server/v2-live-price-policy.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
async function setup(){
 const pg=new PGlite();
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users values('${owner}');
 create table public.k4k_live_credit_accounts(user_id uuid primary key,balance int not null);
 insert into public.k4k_live_credit_accounts values('${owner}',80);
 grant usage on schema public to service_role;
 grant select on public.k4k_live_credit_accounts to service_role;`);
 await pg.exec(read('../db/proposals/k4k-v2-credit-wallet-schema-review.sql'));
 await pg.exec(read('../db/proposals/k4k-v2-credit-atomic-rpcs-review.sql'));
 await pg.exec('set role service_role');
 return pg;
}
function cases(){
 const cases=[];
 for(const [map,amounts,tag] of [
  [V2_LIVE_PLAN_PRICES,V2_LIVE_PLAN_MINOR,'new'],
  [V2_PRIOR_EUR_USD_PLAN_PRICES,V2_PRIOR_EUR_USD_PLAN_MINOR,'prior']
 ]){
  for(const [plan,prices] of Object.entries(map))
   for(const [currency,id] of Object.entries(prices)){
    if(!['EUR','USD'].includes(currency))continue;
    cases.push({id,currency,amount:amounts[plan][currency],
     credits:V2_MONTHLY_CREDITS[plan],kind:'subscription_invoice',tag,plan});
   }
 }
 for(const [catalog,tag] of [[V2_SINGLE_VIDEO,'new'],[V2_PRIOR_EUR_USD_SINGLE_VIDEO,'prior']]){
  const currencies=tag==='new'?['EUR','USD']:['EUR','USD'];
  for(const currency of currencies)
   cases.push({id:catalog.prices[currency],currency,amount:catalog.minor[currency],
    credits:140,kind:'single_video_payment',tag,plan:'single_video'});
 }
 return cases;
}
test('all ten current and ten prior V2 EUR/USD prices atomically grant exact entitlements once',async()=>{
 const pg=await setup();
 try{
  const all=cases();
  assert.equal(all.length,20);
  let totalCredits=0;
  for(const [i,item] of all.entries()){
   const receipt=`${item.kind==='single_video_payment'?'pi':'in'}_eurusd_99_${i+100}`;
   const args=[`evt_eurusd_99_${i+100}`,owner,receipt,item.kind,item.id,item.amount,item.currency,item.credits];
   const r=await pg.query('select public.k4k_v2_grant_paid($1,$2,$3,$4,$5,$6,$7,$8) as v',args);
   assert.equal(r.rows[0].v.credited,true,`${item.tag} ${item.id}`);
   const duplicate=await pg.query(
    'select public.k4k_v2_grant_paid($1,$2,$3,$4,$5,$6,$7,$8) as v',
    [`evt_eurusd_99_retry_${i+100}`,...args.slice(1)]);
   assert.equal(duplicate.rows[0].v.credited,false,item.id);
   totalCredits+=item.credits;
  }
  const balances=await pg.query('select available,reserved,reversal_debt from public.k4k_v2_credit_accounts where user_id=$1',[owner]);
  assert.equal(balances.rows[0].available,totalCredits);
  assert.equal(balances.rows[0].reserved,0);
  assert.equal(balances.rows[0].reversal_debt,0);
  const legacy=await pg.query('select balance from public.k4k_live_credit_accounts where user_id=$1',[owner]);
  assert.equal(legacy.rows[0].balance,80);
  const receipts=await pg.query('select count(*)::integer as c from public.k4k_v2_credit_receipts');
  assert.equal(receipts.rows[0].c,20);
 }finally{await pg.close();}
});
test('old legacy Starter IDs cannot credit V2 even when amount equals new €18.99 or $20.99',async()=>{
 const pg=await setup();
 try{
  for(const [currency,amount] of [['EUR',1899],['USD',2099]]){
   const old=PRESERVED_LIVE_PLAN_PRICES.starter[currency];
   await assert.rejects(pg.query('select public.k4k_v2_grant_paid($1,$2,$3,$4,$5,$6,$7,$8)',[
    'evt_legacy_99_'+currency,owner,'in_legacy_99_'+currency,'subscription_invoice',
    old,amount,currency,420
   ]),/V2_PRICE_ENTITLEMENT_MISMATCH/);
  }
  const count=await pg.query('select count(*)::integer as c from public.k4k_v2_credit_receipts');
  assert.equal(count.rows[0].c,0);
 }finally{await pg.close();}
});
test('V2 Price IDs are immutable for payment proof: a matching plan with wrong amounts is rejected',async()=>{
 const pg=await setup();
 try{
  for(const item of cases()){
   await assert.rejects(pg.query('select public.k4k_v2_grant_paid($1,$2,$3,$4,$5,$6,$7,$8)',[
    'evt_wrong_minor_123456',owner,
    item.kind==='subscription_invoice'?'in_wrong_minor_123456':'pi_wrong_minor_123456',
    item.kind,item.id,item.amount+1,item.currency,item.credits
   ]),/V2_PRICE_ENTITLEMENT_MISMATCH/);
  }
  const n=await pg.query('select count(*)::integer as c from public.k4k_v2_credit_accounts');
  assert.equal(n.rows[0].c,0);
 }finally{await pg.close();}
});
