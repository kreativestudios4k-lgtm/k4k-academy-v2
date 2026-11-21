// K4K V3 PHASE43 — STRIPE TEST WEBHOOK ONLY.
// Deployed only to isolated Supabase project yhbhrkyihiyyfzqogyri.
// Never processes a LIVE Stripe event or touches production/legacy wallets.
// Secret is held in a service-role-only TEST database table, never in source.
const DB="https://yhbhrkyihiyyfzqogyri.supabase.co";
const PRICE="price_1Ue2WXL7fmdMaK0kstFPcl8A";
const QA="k4k_v3_signed_isolated_qa_20261121";
const noStore={"Content-Type":"application/json","Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff"};
const reply=(body:Record<string,unknown>,status=200)=>new Response(
 JSON.stringify(body),{status,headers:noStore});
const val=(x:unknown):Record<string,unknown>|null=>
 x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:null;
const id=(x:unknown,p:string)=>typeof x==="string"&&
 new RegExp("^"+p+"_[A-Za-z0-9]{8,120}$").test(x);
const safeMoney=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)&&
 x>=0&&x<=1000000000;
const safeSec=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)&&
 x>=1&&x<=4102444800;
const equalConst=(a:string,b:string)=>{
 if(a.length!==b.length)return false;
 let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);
 return x===0;
};
const serviceHeaders=(key:string)=>({
 apikey:key,...(key.startsWith("eyJ")?{Authorization:"Bearer "+key}:{}),
 Accept:"application/json"
});
async function fetchSecret(service:string):Promise<string|null>{
 try{
  const url=DB+"/rest/v1/k4k_v3_phase43_webhook_test_secrets"+
   "?select=value&name=eq.stripe_webhook_signing_secret&limit=1";
  const r=await fetch(url,{method:"GET",headers:serviceHeaders(service),
   redirect:"error",cache:"no-store",signal:AbortSignal.timeout(6500)});
  if(!r.ok)return null;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length===1&&
   typeof rows[0]?.value==="string"&&rows[0].value.startsWith("whsec_")
   ?rows[0].value:null;
 }catch{return null;}
}
async function verifiedSignature(raw:string,header:string,secret:string):Promise<boolean>{
 if(raw.length>262144||header.length>4096)return false;
 const parts=header.split(",").map(x=>x.trim().split("="));
 const t=parts.find(x=>x[0]==="t")?.[1];
 const signed=parts.filter(x=>x[0]==="v1").map(x=>x[1]);
 const epoch=Number(t);
 if(!t||!Number.isSafeInteger(epoch)||Math.abs(Date.now()/1000-epoch)>300||
    signed.length===0||signed.length>4)return false;
 try{
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),
   {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const mac=await crypto.subtle.sign("HMAC",key,encoder.encode(t+"."+raw));
  const hex=Array.from(new Uint8Array(mac))
   .map(x=>x.toString(16).padStart(2,"0")).join("");
  return signed.some(s=>typeof s==="string"&&equalConst(s,hex));
 }catch{return false;}
}
function paidTestInvoiceArgs(event:Record<string,unknown>):Record<string,unknown>|null{
 if(event.type!=="invoice.paid"||event.livemode!==false||!id(event.id,"evt"))
  return null;
 const invoice=val(val(event.data)?.object);
 const lines=val(invoice?.lines);
 if(!invoice||invoice.object!=="invoice"||invoice.livemode!==false||
  invoice.status!=="paid"||invoice.paid_out_of_band===true||
  invoice.collection_method!=="charge_automatically"||
  !["subscription_create","subscription_cycle","subscription_update"].includes(String(invoice.billing_reason))||
  invoice.currency!=="gbp"||invoice.subtotal!==1599||
  invoice.total!==1599||invoice.amount_paid!==1599||invoice.amount_due!==1599||
  invoice.amount_remaining!==0||
  (Array.isArray(invoice.discounts)&&invoice.discounts.length>0)||
  (invoice.discount!==undefined&&invoice.discount!==null)||
  !id(invoice.id,"in")||!id(invoice.customer,"cus")||
  !lines||lines.has_more!==false||!Array.isArray(lines.data)||
  lines.data.length!==1)return null;
 const parent=val(invoice.parent),subDetails=val(parent?.subscription_details);
 const subscriptionId=subDetails?.subscription;
 const meta=val(subDetails?.metadata);
 const l=val(lines.data[0]);
 const pricing=val(l?.pricing),priceDetails=val(pricing?.price_details);
 const lineParent=val(l?.parent);
 const itemDetails=val(lineParent?.subscription_item_details);
 const period=val(l?.period);
 const autoTax=val(invoice.automatic_tax);
 if(!id(subscriptionId,"sub")||meta?.k4k_qa!==QA||
  !l||priceDetails?.price!==PRICE||l.quantity!==1||
  l.amount!==1599||l.currency!=="gbp"||
  l.proration===true||itemDetails?.proration===true||
  itemDetails?.subscription!==subscriptionId||
  !safeSec(period?.start)||!safeSec(period?.end)||
  (period?.end as number)<=(period?.start as number)||
  (Array.isArray(l.discount_amounts)&&l.discount_amounts.length>0)||
  (Array.isArray(l.taxes)&&l.taxes.some(t=>val(t)?.amount!==0))||
  (Array.isArray(invoice.total_taxes)&&invoice.total_taxes.some(t=>val(t)?.amount!==0))||
  (autoTax?.enabled===true&&autoTax.status!=="complete"))
  return null;
 return {
  p_invoice_id:invoice.id,p_event_id:event.id,p_customer_id:invoice.customer,
  p_subscription_id:subscriptionId,p_price_id:PRICE,
  p_period_start:period?.start,p_currency:"GBP",
  p_price_minor:1599,p_paid:true,p_net_minor:1599,
  p_tax_minor:0,p_gross_minor:1599,p_tax_behavior:"exclusive"
 };
}
Deno.serve(async request=>{
 if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 if(Deno.env.get("SUPABASE_URL")?.replace(/\/$/,"")!==DB)
  return reply({error:"ISOLATED_PROJECT_ONLY"},503);
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(key.length<35||key.startsWith("sb_publishable_"))
  return reply({error:"ISOLATED_AUTH_UNAVAILABLE"},503);
 const len=Number(request.headers.get("content-length")||"0");
 if(!safeMoney(len)||len>262144)return reply({error:"INVALID_SIZE"},413);
 let raw:string;
 try{raw=await request.text();}catch{return reply({error:"INVALID_BODY"},400);}
 if(raw.length<10||raw.length>262144)return reply({error:"INVALID_SIZE"},400);
 const whsec=await fetchSecret(key);
 if(!whsec)return reply({error:"ISOLATED_SIGNING_SECRET_UNAVAILABLE"},503);
 if(!await verifiedSignature(raw,request.headers.get("stripe-signature")||"",whsec))
  return reply({error:"INVALID_STRIPE_SIGNATURE"},400);
 let event:Record<string,unknown>;
 try{const e=JSON.parse(raw);if(!val(e))throw Error();event=e;}
 catch{return reply({error:"INVALID_JSON"},400);}
 if(event.livemode!==false)return reply({error:"LIVE_EVENT_REJECTED"},400);
 if(event.type!=="invoice.paid")
  return reply({received:true,handled:false,creditsAdded:0},200);
 const invoice=val(val(event.data)?.object);
 const eventLines=val(invoice?.lines);
 const l=val(Array.isArray(eventLines?.data)?eventLines.data[0]:null);
 const p=val(val(l?.pricing)?.price_details);
 if(!safeMoney(invoice?.amount_paid)||invoice?.amount_paid===0||
    p?.price!==PRICE)
  return reply({received:true,handled:false,creditsAdded:0},200);
 const args=paidTestInvoiceArgs(event);
 if(!args){
  console.warn("K4K_V3_PHASE43_TEST_PROOF_REJECTED");
  return reply({error:"SIGNED_INVOICE_PROOF_UNVERIFIED"},503);
 }
 try{
  const result=await fetch(DB+"/rest/v1/rpc/k4k_v3_test_phase43_grant_signed_invoice",{
   method:"POST",cache:"no-store",redirect:"error",
   headers:{...serviceHeaders(key),"Content-Type":"application/json"},
   body:JSON.stringify(args),signal:AbortSignal.timeout(9000)
  });
  if(!result.ok)return reply({error:"ISOLATED_LEDGER_RETRY"},503);
  const data=await result.json();
  const granted=data?.result==="granted"&&data.creditsAdded===420&&
   Number.isSafeInteger(data.newAvailable)&&data.newAvailable>=0;
  const duplicate=data?.result==="duplicate"&&data.creditsAdded===0;
  if(!granted&&!duplicate)return reply({error:"ISOLATED_LEDGER_RECONCILE"},503);
  console.log("K4K_V3_PHASE43_TEST_LEDGER",granted?"granted":"duplicate");
  return reply({received:true,handled:true,
   status:granted?"granted":"duplicate",creditsAdded:granted?420:0},200);
 }catch{return reply({error:"ISOLATED_LEDGER_UNAVAILABLE"},503);}
});
