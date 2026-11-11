import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {waitlistInput,waitlistRateKey} from '../lib/server/waitlist.mjs';
import {generationEnvironmentAllowed,generationUserAllowed} from '../lib/server/generation-policy.mjs';
test('waitlist requires explicit consent, validates email and normalizes identity',()=>{
 assert.deepEqual(waitlistInput({email:' CREATOR@Example.com ',consent:true,locale:'pt'}),{email:'creator@example.com',locale:'pt'});
 for(const email of ['bad','a@b','a b@example.com','a@b@c.com'])assert.throws(()=>waitlistInput({email,consent:true}),/INVALID_EMAIL/);
 assert.throws(()=>waitlistInput({email:'a@example.com',consent:false}),/CONSENT_REQUIRED/);
 assert.deepEqual(waitlistInput({website:'spam'}),{bot:true});
 assert.equal(waitlistRateKey('192.0.2.1','test-secret').length,64);
 assert.notEqual(waitlistRateKey('192.0.2.1','test-secret'),waitlistRateKey('192.0.2.2','test-secret'));
});
test('waitlist mode prevents generation even when other production gates are enabled',()=>{
 const env={VERCEL_ENV:'production',K4K_WAITLIST_ONLY:'true',K4K_ENABLE_PRODUCTION_GENERATION:'true',K4K_PROVIDER_USE_APPROVED:'true',HIGGSFIELD_GENJUTSU_ENABLED:'true',K4K_CUSTOMER_CREDIT_PRICING_APPROVED:'true'};
 assert.equal(generationEnvironmentAllowed(env),false);assert.equal(generationUserAllowed('owner',env),false);
});
test('waitlist signup stores one consent receipt, limits spam and denies public data access',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;');
 await db.exec(readFileSync(new URL('../db/proposals/waitlist.sql',import.meta.url),'utf8'));
 await db.exec('set role service_role');
 const join=(email)=>db.query('select public.k4k_join_waitlist($1,$2,$3)',[email,'en','a'.repeat(64)]);
 await join('creator@example.com');await join('creator@example.com');
 assert.equal((await db.query('select count(*)::integer as n from public.k4k_launch_waitlist')).rows[0].n,1);
 const row=(await db.query('select * from public.k4k_launch_waitlist')).rows[0];assert.equal(row.consent_version,'launch-updates-2026-11-11');assert.ok(row.consent_at);
 for(let i=0;i<3;i++)await join(`creator${i}@example.com`);
 await assert.rejects(join('limited@example.com'),/RATE_LIMITED/);
 await db.exec("update public.k4k_waitlist_rate_limits set window_start=now()-interval '2 hours'");await join('later@example.com');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.k4k_launch_waitlist'),/permission denied/);await assert.rejects(join('private@example.com'),/permission denied/);await db.exec('reset role')}
 }finally{await db.close()}
});
