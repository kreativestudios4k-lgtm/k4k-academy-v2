import test from "node:test";
import assert from "node:assert/strict";

test("K4K V2 proxy is off unless explicitly approved",async()=>{
 const previous=process.env.K4K_V2_MULTI_ZONE_ENABLED;
 try{
  delete process.env.K4K_V2_MULTI_ZONE_ENABLED;
  const {default:off}=await import("../next.config.mjs?closed");
  assert.deepEqual(await off.rewrites(),[]);
  process.env.K4K_V2_MULTI_ZONE_ENABLED="true";
  const {default:on}=await import("../next.config.mjs?enabled");
  const rules=await on.rewrites();
  assert.equal(rules.beforeFiles.length,2);
  assert.deepEqual(rules.beforeFiles.map(x=>x.source),["/k4k-app","/k4k-app/:path*"]);
  for(const rule of rules.beforeFiles){
   assert.ok(rule.destination.startsWith("https://k4k-v2-no-customer-api-popup.vercel.app/k4k-app"));
  }
  assert.deepEqual(rules.afterFiles,[]);
  assert.deepEqual(rules.fallback,[]);
  // The company /, /api, /auth, /academy and /pricing routes are untouched.
  assert.ok(rules.beforeFiles.every(x=>x.source.startsWith("/k4k-app")));
 }finally{
  if(previous===undefined)delete process.env.K4K_V2_MULTI_ZONE_ENABLED;
  else process.env.K4K_V2_MULTI_ZONE_ENABLED=previous;
 }
});
