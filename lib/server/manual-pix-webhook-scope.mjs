import {MANUAL_PIX_KIND} from './manual-pix.mjs';
// A dedicated Preview endpoint must not process Academy or other QA payments.
// Signature and Test/Live validation happen in the route before this function.
export async function scopeManualPixTestEvent(event,store){
 if(event?.livemode!==false)throw Error('BILLING_MODE_MISMATCH');
 let object=event.data?.object;
 if(event.type==='charge.dispute.created'&&object?.object==='dispute'){
  const chargeId=typeof object.charge==='string'?object.charge:object.charge?.id;
  const charge=await store.stripeCharge(chargeId);
  if(charge.livemode!==false||charge.id!==chargeId)throw Error('BILLING_MODE_MISMATCH');
  const intent=typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id;
  const chargeIntent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
  if(intent&&intent!==chargeIntent)throw Error('MANUAL_PIX_ORDER_INVALID');
  object=charge;
 }
 if(object?.metadata?.kind!==MANUAL_PIX_KIND)return null;
 return {...event,data:{...event.data,object}};
}
