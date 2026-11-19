// Stripe TEST-only reader. All endpoints use GET and a test secret on the server;
// webhook JSON or success-return query parameters can NEVER serve as paid evidence.
// The injected fetch allows isolated test fixtures without real network calls.
const idMatches=(v,p)=>typeof v==='string'&&new RegExp('^'+p+'[A-Za-z0-9_]{7,}$').test(v);
export function createStripeTestReader({secret,fetchImpl=fetch,baseUrl='https://api.stripe.com'}={}){
 if(typeof secret!=='string'||!/^([sr]k_test_)[A-Za-z0-9]+$/.test(secret))
  throw Error('STRIPE_TEST_SECRET_REQUIRED');
 if(baseUrl!=='https://api.stripe.com')
  throw Error('STRIPE_TEST_BASE_URL_INVALID');
 async function get(path,params=[]){
  const url=new URL(path,baseUrl);
  for(const [key,value] of params)url.searchParams.append(key,value);
  const response=await fetchImpl(url.toString(),{
   method:'GET',headers:{Authorization:'Bearer '+secret,Accept:'application/json'},
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error('STRIPE_TEST_FETCH_FAILED');
  const payload=await response.json();
  if(!payload||payload.livemode!==false||payload.object==='error')
   throw Error('STRIPE_TEST_MODE_MISMATCH');
  return payload;
 }
 return Object.freeze({
  async getInvoice(id){
   if(!idMatches(id,'in_'))throw Error('INVALID_STRIPE_TEST_INVOICE');
   const invoice=await get('/v1/invoices/'+encodeURIComponent(id),
     [['expand[]','lines.data.price']]);
   if(invoice.id!==id)throw Error('STRIPE_TEST_RECEIPT_CHANGED');
   return invoice;
  },
  async getSession(id){
   if(!idMatches(id,'cs_test_')&&!idMatches(id,'cs_'))
    throw Error('INVALID_STRIPE_TEST_SESSION');
   const session=await get('/v1/checkout/sessions/'+encodeURIComponent(id),
     [['expand[]','line_items'],['expand[]','payment_intent.latest_charge']]);
   if(session.id!==id)throw Error('STRIPE_TEST_RECEIPT_CHANGED');
   return session;
  },
  async getCharge(id){
   if(!idMatches(id,'ch_'))throw Error('INVALID_STRIPE_TEST_CHARGE');
   const charge=await get('/v1/charges/'+encodeURIComponent(id));
   if(charge.id!==id)throw Error('STRIPE_TEST_RECEIPT_CHANGED');
   return charge;
  }
 });
}
