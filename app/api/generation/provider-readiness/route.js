import {NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(){
 // Diagnostic only: cached non-generating estimate; never submits media generation.
 const credentials=process.env.FAL_KEY;
 const providerConfigured=typeof credentials==='string'&&credentials.trim().length>0;
 const diagnostic={authenticated:false}; // Key presence is not proof of API authentication.
 const enabled=process.env.K4K_FAL_WAN_ENABLED==='true';
 const pricingApproved=process.env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true';
 const testFlag=process.env.K4K_ENABLE_TEST_GENERATION==='true';
 const testUsersConfigured=typeof process.env.K4K_GENERATION_TEST_USERS==='string'&&process.env.K4K_GENERATION_TEST_USERS.trim().length>0;
 const blockers=[
  ...(!providerConfigured?['PROVIDER_CREDENTIALS_UNVERIFIED']:[]),
  ...(!testFlag?['PREVIEW_TEST_FLAG_NOT_ENABLED']:[]),
  ...(!testUsersConfigured?['PREVIEW_TEST_USERS_NOT_CONFIGURED']:[]),
  ...(process.env.K4K_FAL_RATE_CARD_APPROVED!=='true'?['PROVIDER_RATE_CARD_NOT_APPROVED']:[]),
  ...(!pricingApproved?['CUSTOMER_CREDIT_PRICING_NOT_APPROVED']:[]),
  ...(!enabled?['GENERATION_FEATURE_DISABLED']:[]),
  ...(!diagnostic.authenticated?['PROVIDER_AUTH_NOT_VERIFIED']:[]),
  'CUSTOMER_ACCEPTANCE_TEST_REQUIRED'
 ];
 return NextResponse.json({
  provider:'fal',
  generationEnabled:false,
  providerConfigured,
  providerAuthenticated:diagnostic.authenticated===true,
  providerQuoteVerified:false,
  customerPricingApproved:pricingApproved,
  productionPathPrepared:true,
  previewTestConfigured:testFlag&&testUsersConfigured,
  previewOnly:true,
  testReady:false,
  blockers
 },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
}
