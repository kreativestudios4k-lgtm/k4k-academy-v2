import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app/api/billing/webhook/route.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/export const runtime/,'const runtime').replace('export async function POST','async function POST');
function harness(){
 let calls=0;
 const sandbox={process:{env:{VERCEL_ENV:'preview',STRIPE_SECRET_KEY:'sk_test_example',STRIPE_WEBHOOK_SECRET:'whsec_example',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake'}},NextResponse:{json:(body,opts)=>({body,status:opts.status})},assertTestModeKey:()=>{},verifyStripeSignature:()=>true,createMembershipStore:()=>({}),handleStripeEvent:async()=>{calls++;return {handled:true}}};
 vm.createContext(sandbox);vm.runInContext(source+'\nglobalThis.post=POST;',sandbox);
 return {get calls(){return calls},post:event=>sandbox.post({text:async()=>JSON.stringify(event),headers:{get:()=> 'signature'}})};
}
test('signed live and malformed events never reach preview membership storage',async()=>{
 const h=harness();
 for(const event of [null,{id:'evt_live',type:'invoice.paid',livemode:true},{id:'evt_missing',type:'invoice.paid'},{livemode:false,type:'invoice.paid'}]){
 const r=await h.post(event);assert.equal(r.status,400);assert.equal(r.body.error,'TEST_EVENT_REQUIRED');
 }
 assert.equal(h.calls,0);
});
test('signed test subscription event reaches injected handler',async()=>{
 const h=harness();const r=await h.post({id:'evt_test',livemode:false,type:'invoice.paid',data:{object:{subscription:'sub_test'}}});assert.equal(r.status,200);assert.equal(h.calls,1);
});
