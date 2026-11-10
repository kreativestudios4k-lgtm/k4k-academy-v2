import {higgsfieldDiagnostic} from '../../../../lib/server/higgsfield-diagnostic.mjs';
import {NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(){
 // Diagnostic only: cached non-generating estimate; never submits media generation.
 const credentials=process.env.HF_CREDENTIALS;
 const providerConfigured=typeof credentials==='string'&&credentials.trim().length>0;
 const diagnostic=providerConfigured&&process.env.VERCEL_ENV==='preview'?await higgsfieldDiagnostic('pro'):{authenticated:false};
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
  ...(!diagnostic.authenticated?['PROVIDER_AUTH_NOT_VERIFIED']:[]),
  'CUSTOMER_ACCEPTANCE_TEST_REQUIRED'
 ];
 return NextResponse.json({
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
