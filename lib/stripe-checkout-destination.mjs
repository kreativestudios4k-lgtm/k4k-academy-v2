// Only navigate to Stripe-hosted Checkout after a successful server response.
export function stripeCheckoutDestination(value){
 if(typeof value!=='string')throw new Error('Invalid checkout destination');
 const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||url.port)throw new Error('Invalid checkout destination');
 return url.href;
}
