import {billingMode} from './billing-policy.mjs';
import {configuredLivePrices} from './live-price-config.mjs';
import {CREDIT_PACKS} from '../k4k-credit-proposal.mjs';
import {TOPUP_PRICE_IDS} from '../k4k-topup-prices.mjs';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function creditPack(pack,currency,{liveMode=billingMode()==='live',env=process.env}={}){
 const p=CREDIT_PACKS.find(item=>item.id===pack);
 if(!p||!['GBP','EUR','USD','BRL'].includes(currency))throw Error('INVALID_PACK');
 const priceId=(liveMode?configuredLivePrices('packs',env):TOPUP_PRICE_IDS)[p.id]?.[currency];
 if(!priceId)throw Error('PACK_NOT_CONFIGURED');
 return {...p,priceId,amount:p[currency],currency};
}
export function verifiedTopup(session,{liveMode=billingMode()==='live',env=process.env}={}){
 if(session?.mode!=='payment'||session?.metadata?.kind!=='k4k_credit_pack')return null;
 if(session.livemode!==liveMode)throw Error('BILLING_MODE_MISMATCH');
 if(session.payment_status!=='paid')return {pending:true};
 const userId=session.client_reference_id;
 if(!uuid.test(userId||'')||session.metadata.user_id!==userId)throw Error('TOPUP_OWNER_INVALID');
 const pack=creditPack(session.metadata.pack_key,session.currency?.toUpperCase(),{liveMode,env});
 const lines=session.line_items?.data;
 if(!Array.isArray(lines)||lines.length!==1||lines[0].quantity!==1||lines[0].price?.id!==pack.priceId||session.amount_subtotal!==pack.amount||!Number.isSafeInteger(session.amount_total)||session.amount_total<pack.amount||session.total_details?.amount_discount)throw Error('TOPUP_PRICE_MISMATCH');
 const intent=session.payment_intent;
 if(!intent||typeof intent!=='object'||intent.status!=='succeeded'||typeof intent.id!=='string')throw Error('TOPUP_PAYMENT_UNVERIFIED');
 if(intent.latest_charge?.refunded||intent.latest_charge?.disputed||intent.latest_charge?.amount_refunded>0)return {reversed:true};
 if(session.automatic_tax?.enabled!==true||session.automatic_tax?.status!=='complete')throw Error('TAX_NOT_VERIFIED');
 return {userId,pack,intentId:intent.id,sessionId:session.id,total:session.amount_total};
}
export function buildTopupCheckout({pack,userId,origin}){
 const form=new URLSearchParams({mode:'payment','line_items[0][price]':pack.priceId,'line_items[0][quantity]':'1',client_reference_id:userId,success_url:origin+'/k4k-app/credits?topup=success',cancel_url:origin+'/k4k-app/credits?topup=cancelled','metadata[kind]':'k4k_credit_pack','metadata[pack_key]':pack.id,'metadata[user_id]':userId,'payment_intent_data[metadata][kind]':'k4k_credit_pack','automatic_tax[enabled]':'true','tax_id_collection[enabled]':'true'});
 return form;
}
