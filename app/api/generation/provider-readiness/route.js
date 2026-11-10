import {NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(){
 // Configuration presence only; never reveal credentials, balances, or provider identifiers.
 const credentials=process.env.HF_CREDENTIALS;
 const credentialFormatValid=typeof credentials==='string'&&credentials.trim().length>0;
 const enabled=process.env.HIGGSFIELD_GENJUTSU_ENABLED==='true';
 const pricingApproved=process.env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true';
 return NextResponse.json({
  generationEnabled:false,
  providerConfigured:credentialFormatValid,
  customerPricingApproved:pricingApproved,
  previewOnly:true,
  testReady:false,
  blockers:[
   ...(!credentialFormatValid?['PROVIDER_CREDENTIALS_UNVERIFIED']:[]),
   ...(!pricingApproved?['CUSTOMER_CREDIT_PRICING_NOT_APPROVED']:[]),
   ...(!enabled?['GENERATION_FEATURE_DISABLED']:[]),
   'PROVIDER_API_AND_END_TO_END_TEST_NOT_VERIFIED'
  ]
 },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
