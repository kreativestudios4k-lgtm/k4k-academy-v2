// Single place that decides whether a real, billable generation may start.
// Every switch defaults to OFF. Nothing here is an invitation or waitlist:
// in production the only gate is an explicit launch approval; outside
// production, billable calls are limited to the accounts approved for a test.
import {loadCreditPricing} from './generation-credit-pricing.mjs';
import {higgsfieldAuthorization} from './higgsfield-auth.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOST = /^\.?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export const BLOCKER_MESSAGES = Object.freeze({
  GENERATION_SUBMISSION_DISABLED: 'Generation is switched off. Set K4K_GENERATION_SUBMISSION_ENABLED=true once the test is approved.',
  PROVIDER_CREDENTIALS_MISSING: 'The Higgsfield credential (HF_CREDENTIALS) is not configured for this environment.',
  PROVIDER_CREDENTIALS_INVALID: 'The Higgsfield credential (HF_CREDENTIALS) is not in a usable format.',
  CUSTOMER_CREDIT_PRICING_NOT_APPROVED: 'Customer credit pricing has not been approved (K4K_CUSTOMER_CREDIT_PRICING_APPROVED).',
  CUSTOMER_CREDIT_PRICE_TABLE_MISSING: 'No credit rate table is configured (K4K_GENERATION_CREDITS_PER_SECOND).',
  CUSTOMER_CREDIT_PRICE_TABLE_INVALID: 'The credit rate table (K4K_GENERATION_CREDITS_PER_SECOND) is not valid.',
  PROVIDER_SPEND_CAP_MISSING: 'No per-video provider spend cap is set (K4K_GENERATION_MAX_PROVIDER_USD).',
  OUTPUT_HOSTS_NOT_APPROVED: 'No approved Higgsfield output host is configured (K4K_HIGGSFIELD_OUTPUT_HOSTS).',
  STORAGE_NOT_CONFIGURED: 'Server storage access is not configured.',
  PRODUCTION_GENERATION_NOT_APPROVED: 'Generation has not been approved for production.',
  TEST_USERS_NOT_CONFIGURED: 'No test accounts are approved for billable generation in this preview (K4K_GENERATION_TEST_USERS).',
  ACCOUNT_NOT_APPROVED_FOR_TEST: 'This account is not one of the accounts approved for the current generation test.',
});

export function getGenerationConfig(env = process.env) {
  const blockers = [];
  const isProduction = env.VERCEL_ENV === 'production';

  if (env.K4K_GENERATION_SUBMISSION_ENABLED !== 'true') blockers.push('GENERATION_SUBMISSION_DISABLED');

  const credentials = env.HF_CREDENTIALS;
  let credentialsUsable = false;
  if (typeof credentials !== 'string' || !credentials.length) blockers.push('PROVIDER_CREDENTIALS_MISSING');
  else { try { higgsfieldAuthorization(credentials); credentialsUsable = true; } catch { blockers.push('PROVIDER_CREDENTIALS_INVALID'); } }

  const pricing = loadCreditPricing(env);
  if (!pricing.approved) blockers.push(pricing.reason);

  const maxProviderUsd = Number(env.K4K_GENERATION_MAX_PROVIDER_USD);
  const capValid = /^\d{1,3}(\.\d{1,2})?$/.test(env.K4K_GENERATION_MAX_PROVIDER_USD ?? '') && maxProviderUsd > 0 && maxProviderUsd <= 100;
  if (!capValid) blockers.push('PROVIDER_SPEND_CAP_MISSING');

  // Exact hostnames, or ".example.com" to allow any subdomain of example.com.
  const outputHosts = (env.K4K_HIGGSFIELD_OUTPUT_HOSTS ?? '').split(',').map(x => x.trim().toLowerCase()).filter(x => HOST.test(x));
  if (!outputHosts.length) blockers.push('OUTPUT_HOSTS_NOT_APPROVED');

  const testUsers = new Set((env.K4K_GENERATION_TEST_USERS ?? '').split(',').map(x => x.trim().toLowerCase()).filter(x => UUID.test(x)));
  if (isProduction) { if (env.K4K_GENERATION_PUBLIC_ENABLED !== 'true') blockers.push('PRODUCTION_GENERATION_NOT_APPROVED'); }
  else if (!testUsers.size) blockers.push('TEST_USERS_NOT_CONFIGURED');

  const ttl = Number(env.K4K_GENERATION_INPUT_URL_TTL_SECONDS);
  return Object.freeze({
    blockers: Object.freeze(blockers),
    isProduction,
    credentials: credentialsUsable ? credentials : null,
    pricing,
    maxProviderUsd: capValid ? maxProviderUsd : null,
    outputHosts: Object.freeze(outputHosts),
    // Signed input links must outlive the provider queue. Default 6 hours.
    inputUrlTtlSeconds: Number.isSafeInteger(ttl) && ttl >= 900 && ttl <= 86400 ? ttl : 21600,
    maxActiveJobs: 2,
    authorizeUser(userId) {
      if (isProduction) return null;
      return typeof userId === 'string' && testUsers.has(userId.toLowerCase()) ? null : 'ACCOUNT_NOT_APPROVED_FOR_TEST';
    },
  });
}

export function describeBlockers(codes) {
  return codes.map(code => ({code, message: BLOCKER_MESSAGES[code] ?? code}));
}
