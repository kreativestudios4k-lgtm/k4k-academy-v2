import test from 'node:test';
import assert from 'node:assert/strict';
import {isExpectedStripeTestPrice,isSafeStripeTestCheckoutSession} from '../lib/server/stripe-preview-guard.mjs';
const plan={id:'creator',gbpPence:1499};
const price={id:'price_test_123',livemode:false,active:true,currency:'gbp',type:'recurring',billing_scheme:'per_unit',unit_amount:1499,recurring:{interval:'month',interval_count:1,usage_type:'licensed',trial_period_days:null},transform_quantity:null};
test('accepts only exact monthly GBP test price for the selected tier',()=>{
 assert.equal(isExpectedStripeTestPrice(price,plan,price.id),true);
 for(const [field,value] of [['livemode',true],['active',false],['currency','usd'],['type','one_time'],['billing_scheme','tiered'],['unit_amount',999],['transform_quantity',{divide_by:2,round:'up'}]]){
   assert.equal(isExpectedStripeTestPrice({...price,[field]:value},plan,price.id),false,field);
 }
 assert.equal(isExpectedStripeTestPrice({...price,recurring:{...price.recurring,interval:'year'}},plan,price.id),false);
 assert.equal(isExpectedStripeTestPrice({...price,recurring:{...price.recurring,usage_type:'metered'}},plan,price.id),false);
 assert.equal(isExpectedStripeTestPrice({...price,recurring:{...price.recurring,trial_period_days:30}},plan,price.id),false);
 assert.equal(isExpectedStripeTestPrice(price,plan,'price_other'),false);
});
test('only accepts open test-mode Stripe-hosted subscription checkout',()=>{
 const s={livemode:false,mode:'subscription',status:'open',url:'https://checkout.stripe.com/c/pay/cs_test_abc'};
 assert.equal(isSafeStripeTestCheckoutSession(s),true);
 for(const bad of [{livemode:true},{mode:'payment'},{status:'complete'},{url:'https://checkout.stripe.com.evil.example/a'},{url:'http://checkout.stripe.com/a'},{url:'https://evil.example/a'}]){
   assert.equal(isSafeStripeTestCheckoutSession({...s,...bad}),false);
 }
});
