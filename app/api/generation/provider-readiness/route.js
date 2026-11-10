import {NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(){
 // Diagnostic only. Never submit a provider request, reveal credentials or claim authentication.
 const credentials=process.env.HF_CREDENTIALS;
 const providerConfigured=typeof credentials==='string'&&credentials.trim().length>0;
 const enabled=process.env.HIGGSFIELD_GENJUTSU_ENABLED==='true';
 const pricingApproved=process.env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED==='true';
 const testFlag=process.env.K4K_ENABLE_TEST_GENERATION==='true';
 const testUsersConfigured=typeof process.env.K4K_GENERATION_TEST_USERS==='string'&&process.env.K4K_GENERATION_TEST_USERS.trim().length>0;
 const blockers=[
  ...(!providerConfigured?['PROVIDER_CREDENTIALS_UNVERIFIED']:[]),
  ...(!testFlag?['PREVIEW_TEST_FLAG_NOT_ENABLED']:[]),
  ...(!testUsersConfigured?['PREVIEW_TEST_USERS_NOT_CONFIGURED']:[]),
  ...(!pricingApproved?['CUSTOMER_CREDIT_PRICING_NOT_APPROVED']:[]),
  ...(!enabled?['GENERATION_FEATURE_DISABLED']:[]),
  'PROVIDER_AUTH_AND_QUOTE_NOT_VERIFIED',
  'PROVIDER_API_AND_END_TO_END_TEST_NOT_VERIFIED'
 ];
 return NextResponse.json({
  generationEnabled:false,
  providerConfigured,
  providerAuthenticated:false,
  providerQuoteVerified:false,
  customerPricingApproved:pricingApproved,
  previewTestConfigured:testFlag&&testUsersConfigured,
  previewOnly:true,
  testReady:false,
  blockers
 },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
}
