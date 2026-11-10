// Server-derived customer credit price. There is NO built-in price: the rate
// table must be supplied and explicitly approved through server environment
// variables. A browser can never send a credit amount.
//
//   K4K_CUSTOMER_CREDIT_PRICING_APPROVED = "true"
//   K4K_GENERATION_CREDITS_PER_SECOND    = {"lite":{"720p":4},"pro":{"720p":12}}
//
// Credits = rate x source seconds, rounded up to a whole second. A tier or
// resolution without a rate cannot be generated.
const TIERS = ['lite', 'pro'];
const RESOLUTIONS = ['480p', '720p', '1080p'];
export const MAX_CREDITS_PER_JOB = 10000; // matches the database reservation limit

export function loadCreditPricing(env = process.env) {
  if (env.K4K_CUSTOMER_CREDIT_PRICING_APPROVED !== 'true') return {approved: false, reason: 'CUSTOMER_CREDIT_PRICING_NOT_APPROVED', table: null};
  let parsed;
  try { parsed = JSON.parse(env.K4K_GENERATION_CREDITS_PER_SECOND ?? ''); } catch { return {approved: false, reason: 'CUSTOMER_CREDIT_PRICE_TABLE_MISSING', table: null}; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {approved: false, reason: 'CUSTOMER_CREDIT_PRICE_TABLE_INVALID', table: null};
  const table = {};
  for (const [tier, rates] of Object.entries(parsed)) {
    if (!TIERS.includes(tier) || !rates || typeof rates !== 'object' || Array.isArray(rates)) return {approved: false, reason: 'CUSTOMER_CREDIT_PRICE_TABLE_INVALID', table: null};
    table[tier] = {};
    for (const [resolution, rate] of Object.entries(rates)) {
      if (!RESOLUTIONS.includes(resolution) || !Number.isSafeInteger(rate) || rate < 1 || rate > 1000) return {approved: false, reason: 'CUSTOMER_CREDIT_PRICE_TABLE_INVALID', table: null};
      table[tier][resolution] = rate;
    }
    Object.freeze(table[tier]);
  }
  if (!Object.values(table).some(rates => Object.keys(rates).length)) return {approved: false, reason: 'CUSTOMER_CREDIT_PRICE_TABLE_MISSING', table: null};
  return {approved: true, reason: null, table: Object.freeze(table)};
}

export function priceGenerationCredits({table, tier, resolution, durationSeconds} = {}) {
  const rate = table && Object.hasOwn(table, tier) && Object.hasOwn(table[tier], resolution) ? table[tier][resolution] : null;
  if (!rate) throw new Error('GENERATION_OPTION_NOT_PRICED');
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('VERIFIED_DURATION_REQUIRED');
  const credits = Math.ceil(durationSeconds) * rate;
  if (!Number.isSafeInteger(credits) || credits < 1 || credits > MAX_CREDITS_PER_JOB) throw new Error('CREDIT_PRICE_OUT_OF_RANGE');
  return credits;
}
