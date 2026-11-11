import {assertBillingKey,assertTaxReady,billingMode} from '../../../../lib/server/billing-policy.mjs';
import {livePrices} from '../../../../lib/server/live-price-config.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.K4K_WAITLIST_ONLY==='true')return Response.json({mode:billingMode(),checkoutReady:false,topupsReady:false,reason:'WAITLIST_ONLY'},{headers:{'Cache-Control':'no-store'}});
 let reason=null;let checkoutReady=false;let topupsReady=false;
 try{assertTaxReady();assertBillingKey(process.env.STRIPE_SECRET_KEY);livePrices('plans');checkoutReady=true;if(process.env.K4K_TOPUPS_ENABLED==='true'){livePrices('packs');topupsReady=true;}}
 catch(error){reason=error.message==='TAX_SETUP_REQUIRED'?'TAX_SETUP_REQUIRED':'BILLING_SETUP_REQUIRED';}
 return Response.json({mode:billingMode(),checkoutReady,topupsReady,reason},{headers:{'Cache-Control':'no-store'}});
}
