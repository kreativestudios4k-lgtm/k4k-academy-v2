import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(x,"utf8");
test("each new application must meet creator requirements server-side",()=>{
 const route=read("app/api/affiliates/apply/route.js");
 for(const key of ["followersCount","contentNiche","motivation","age18","publicProfile","recentOriginalContent","authenticAudience","agreeToReview"])assert.ok(route.includes(key),key);
 assert.match(route,/followers<1000/);
 assert.match(route,/motivation.length<30/);
 assert.match(route,/AFFILIATE_ELIGIBILITY_NOT_MET/);
 assert.match(route,/eligibility_confirmed_at/);
 assert.match(route,/ignoreDuplicates:true/);
 assert.match(route,/user_id:user.id/);
});
test("existing affiliate admin displays evaluation evidence",()=>{
 const route=read("app/api/admin/affiliates/route.js");
 const admin=read("app/admin/affiliates/page.js");
 for(const field of ["followers_count","content_niche","application_motivation","eligibility_confirmed_at"]) {
  assert.ok(route.includes(field),field);
  assert.ok(admin.includes(field),field);
 }
 assert.match(route,/k4k_admins/);
 assert.match(route,/k4k_approve_affiliate/);
 assert.match(admin,/Aprove somente após confirmar a identidade/);
});
test("original site's browser form also submits eligibility declarations",()=>{
 const form=read("app/affiliates/AffiliateForm.js");
 assert.match(form,/Number\(followersCount\)<1000/);
 assert.match(form,/Object.values\(eligibility\).every\(Boolean\)/);
 assert.match(form,/followersCount:Number\(followersCount\),contentNiche,motivation,eligibility/);
});
test("schema migration adds fields without requiring historical applicants to reapply",()=>{
 const sql=read("supabase/migrations/20261119131500_k4k_affiliate_eligibility_requirements.sql");
 assert.match(sql,/add column if not exists followers_count integer/);
 assert.match(sql,/add column if not exists application_motivation text/);
 assert.doesNotMatch(sql,/delete from|drop table|truncate table|alter column.*not null/i);
});
