import {assertBillingKey,assertTaxReady,billingMode,assertLiveLaunchReady} from '../../../../lib/server/billing-policy.mjs';
import {livePrices} from '../../../../lib/server/live-price-config.mjs';
import {launchLimits} from '../../../../lib/server/soft-launch.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.K4K_WAITLIST_ONLY==='true')return Response.json({mode:billingMode(),checkoutReady:false,topupsReady:false,reason:'WAITLIST_ONLY'},{headers:{'Cache-Control':'no-store'}});
 if(process.env.VERCEL_ENV==='production'&&billingMode()!=='live')return Response.json({mode:'closed',checkoutReady:false,topupsReady:false,reason:'LIVE_CHECKOUT_DISABLED'},{headers:{'Cache-Control':'no-store'}});
 let reason=null;let checkoutReady=false;let topupsReady=false;
 try{assertTaxReady();assertBillingKey(process.env.STRIPE_SECRET_KEY);livePrices('plans');if(billingMode()==='live'){assertLiveLaunchReady();launchLimits();}checkoutReady=true;if(process.env.K4K_TOPUPS_ENABLED==='true'){livePrices('packs');topupsReady=true;}}
 catch(error){reason=error.message==='TAX_SETUP_REQUIRED'?'TAX_SETUP_REQUIRED':'BILLING_SETUP_REQUIRED';}
 return Response.json({mode:billingMode(),checkoutReady,topupsReady,reason},{headers:{'Cache-Control':'no-store'}});
}
