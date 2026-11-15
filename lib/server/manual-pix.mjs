export {manualPixEnabled,manualPixUserAllowed,manualPixLiveTestOnly} from './manual-pix-policy.mjs';
import {PLAN_PRICES} from '../k4k-plan-prices.mjs';
import {PLAN_CREDITS} from './stripe-membership.mjs';
import {configuredLivePrices} from './live-price-config.mjs';
import {BRAZIL_PIX_STRIPE_VERSION} from './brazil-pix.mjs';
export const MANUAL_PIX_KIND='k4k_manual_pix';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const idOf=x=>typeof x==='string'?x:x?.id;
export function manualPixPlan(plan,{liveMode=false,env=process.env}={}){
 if(!Object.hasOwn(PLAN_PRICES,plan))throw Error('INVALID_PLAN');
 return {key:plan,amount:PLAN_PRICES[plan].BRL,credits:PLAN_CREDITS[plan],sourcePrice:liveMode?configuredLivePrices('plans',env)[plan].BRL:PLAN_PRICES[plan].stripePriceIds.BRL};
}
export const manualPixHeaders=()=>({'Stripe-Version':BRAZIL_PIX_STRIPE_VERSION});
export function assertManualPixSource(price,plan,liveMode){
 if(price?.id!==plan.sourcePrice||price.livemode!==liveMode||price.active!==true||price.currency!=='brl'||price.unit_amount!==plan.amount||price.tax_behavior!=='inclusive'||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||!/^prod_[A-Za-z0-9]+$/.test(idOf(price.product)||''))throw Error('MANUAL_PIX_PRICE_INVALID');
 return idOf(price.product);
}
export function buildManualPixCheckout({order,plan,userId,origin,now=Math.floor(Date.now()/1000)}){
 if(!uuid.test(order?.id||'')||order.user_id!==userId||order.plan_key!==plan.key||order.state!=='reserved'||order.source_price_id!==plan.sourcePrice||order.amount!==plan.amount||!/^prod_[A-Za-z0-9]+$/.test(order.product_id||''))throw Error('MANUAL_PIX_ORDER_INVALID');
 const expiry=Math.floor(new Date(order.expires_at).getTime()/1000);
 if(!Number.isSafeInteger(expiry)||expiry<now+1800||expiry>now+86400)throw Error('MANUAL_PIX_ORDER_EXPIRED');
 const form=new URLSearchParams({mode:'payment','managed_payments[enabled]':'false','allowed_payment_method_types[0]':'pix',locale:'pt-BR',client_reference_id:userId,'line_items[0][quantity]':'1','line_items[0][price_data][product]':order.product_id,'line_items[0][price_data][currency]':'brl','line_items[0][price_data][unit_amount]':String(plan.amount),'line_items[0][price_data][tax_behavior]':'inclusive','automatic_tax[enabled]':'true','tax_id_collection[enabled]':'true',expires_at:String(expiry),success_url:origin+'/k4k-app/creator?checkout=success&session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/k4k-app/credits?plan='+plan.key+'&checkout=cancelled','custom_text[submit][message]':'Pagamento único por Pix. Sem assinatura e sem renovação automática. Créditos após confirmação do pagamento. Volte ao K4K para renovar manualmente.'});
 for(const [key,value] of Object.entries({kind:MANUAL_PIX_KIND,order_id:order.id,user_id:userId,plan_key:plan.key})){
  form.set('metadata['+key+']',value);form.set('payment_intent_data[metadata]['+key+']',value);
 }
 // No setup_future_usage, customer saving, mandate, recurring price or subscription.
 return form;
}
export function verifiedManualPix(session,order,{liveMode=false,env=process.env}={}){
 if(session?.metadata?.kind!==MANUAL_PIX_KIND||session.mode!=='payment'||session.livemode!==liveMode)throw Error('MANUAL_PIX_SESSION_INVALID');
 const expectedPrefix=liveMode?'cs_live_':'cs_test_';
 if(!session.id?.startsWith(expectedPrefix)||!uuid.test(order?.id||'')||session.metadata.order_id!==order.id||session.client_reference_id!==order.user_id||session.metadata.user_id!==order.user_id||session.metadata.plan_key!==order.plan_key||order.credit_mode!==(liveMode?'live':'test')||(order.stripe_session_id&&order.stripe_session_id!==session.id)||session.subscription)throw Error('MANUAL_PIX_OWNER_INVALID');
 const plan=manualPixPlan(order.plan_key,{liveMode,env});
 if(order.source_price_id!==plan.sourcePrice||order.amount!==plan.amount||order.credits!==plan.credits)throw Error('MANUAL_PIX_PRICE_INVALID');
 if(session.status!=='complete'||session.payment_status!=='paid')return {pending:true};
 const lines=session.line_items?.data,price=lines?.[0]?.price;
 if(session.line_items?.has_more!==false||lines?.length!==1||lines[0].quantity!==1||idOf(price?.product)!==order.product_id||price.recurring||price.type!=='one_time'||price.currency!=='brl'||price.unit_amount!==plan.amount||price.tax_behavior!=='inclusive'||session.currency!=='brl'||session.amount_subtotal!==plan.amount||session.amount_total!==plan.amount||session.total_details?.amount_discount)throw Error('MANUAL_PIX_PRICE_INVALID');
 if(session.automatic_tax?.enabled!==true||session.automatic_tax.status!=='complete')throw Error('TAX_NOT_VERIFIED');
 const intent=session.payment_intent,charge=intent?.latest_charge;
 if(!intent||typeof intent!=='object'||intent.status!=='succeeded'||intent.livemode!==liveMode||intent.currency!=='brl'||intent.amount!==plan.amount||intent.amount_received!==plan.amount||intent.setup_future_usage||charge?.paid!==true||charge.livemode!==liveMode||charge.payment_method_details?.type!=='pix'||idOf(charge.payment_intent)!==intent.id)throw Error('MANUAL_PIX_PAYMENT_UNVERIFIED');
 if(charge.refunded||charge.amount_refunded>0||charge.disputed)return {reversed:true};
 if(!Number.isSafeInteger(charge.created)||charge.created<session.created||charge.created>Math.floor(Date.now()/1000)+300)throw Error('MANUAL_PIX_PAYMENT_UNVERIFIED');
 return {orderId:order.id,userId:order.user_id,plan:plan.key,sessionId:session.id,intentId:intent.id,amount:plan.amount,credits:plan.credits,paidAt:new Date(charge.created*1000).toISOString()};
}
export async function fulfillManualPix({sessionId,eventId,eventType,store,liveMode=false,env=process.env,userId}={}){
 const session=await store.checkoutSession(sessionId);
 if(userId&&session.client_reference_id!==userId)throw Error('MANUAL_PIX_OWNER_INVALID');
 const orderId=session.metadata?.order_id;
 if(!uuid.test(orderId||''))throw Error('MANUAL_PIX_ORDER_INVALID');
 const order=await store.manualPixOrder(orderId);
 const payment=verifiedManualPix(session,order,{liveMode,env});
 if(payment.pending)return {handled:false,reconciled:false,reason:'PAYMENT_PENDING'};
 if(payment.reversed)return {handled:false,reconciled:false,reason:'PAYMENT_REVERSED'};
 const result=await store.applyManualPix({p_order:payment.orderId,p_event:eventId,p_type:eventType,p_session:payment.sessionId,p_intent:payment.intentId,p_paid_at:payment.paidAt});
 return {...result,reconciled:true,plan:payment.plan,renewalMode:'manual'};
}
