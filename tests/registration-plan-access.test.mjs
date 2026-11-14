import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {planRegistration,retiredCustomerDestination} from '../lib/customer-routes.mjs';

// Exercise the actual routing code with auth responses; no hosted users or payments.
function setup(claims,{configured=true,refresh=false}={}){
 const response=(status=200,location)=>{const r=new Response(null,{status,headers:location?{Location:location}:{}});const cookies=[];r.cookies={getAll:()=>cookies,set:(...args)=>cookies.push(args.length===1?args[0]:{name:args[0],value:args[1],...args[2]})};return r;};
 const NextResponse=Object.assign(function(...args){return new Response(...args)},{next:()=>response(),redirect:url=>response(307,String(url))});
 const source=readFileSync(new URL('../proxy.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export async function proxy','async function proxy').replace('export const config','const config')+'\nproxy;';
 const createServerClient=(_url,_key,{cookies})=>({auth:{getClaims:async()=>{
  if(refresh)cookies.setAll([{name:'session',value:'refreshed',options:{httpOnly:true}}]);
  return {data:{claims}};
 }}});
 return runInNewContext(source,{URL,Headers,Date,NextResponse,planRegistration,retiredCustomerDestination,createServerClient,process:{env:configured?{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.test',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture'}:{}}});
}
function request(path){const nextUrl=new URL(path,'https://preview.test');nextUrl.clone=()=>new URL(nextUrl);return {url:nextUrl.href,nextUrl,headers:new Headers(),cookies:{getAll:()=>[],set:()=>{}}};}

test('signed-out and anonymous visitors register before accessing plans',async()=>{
 for(const claims of [null,{sub:'anonymous',is_anonymous:true}]){
  const result=await setup(claims)(request('/k4k-app/credits?plan=starter'));
  assert.equal(result.status,307);
  assert.equal(result.headers.get('location'),'https://preview.test/k4k-app/register?plan=starter');
  assert.equal(result.headers.get('cache-control'),'no-store');
 }
});
test('registration redirect drops injected destinations and invalid plans',async()=>{
 const result=await setup(null)(request('/k4k-app/credits?plan=bad&next=https://evil.test'));
 assert.equal(result.headers.get('location'),'https://preview.test/k4k-app/register');
});
test('signed-in accounts can choose a plan before having a membership',async()=>{
 const result=await setup({sub:'customer',is_anonymous:false})(request('/k4k-app/credits?plan=creator'));
 assert.equal(result.status,200);assert.equal(result.headers.get('location'),null);
});
test('auth refresh cookies survive redirect to registration',async()=>{
 const result=await setup(null,{refresh:true})(request('/k4k-app/credits'));
 assert.deepEqual(JSON.parse(JSON.stringify(result.cookies.getAll())),[{name:'session',value:'refreshed',httpOnly:true}]);
});
test('missing auth configuration refuses access rather than showing purchase controls',async()=>{
 assert.equal((await setup(null,{configured:false})(request('/k4k-app/credits'))).status,503);
});
