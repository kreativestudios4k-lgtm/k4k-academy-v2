// Fail-closed private beta gate. This must be called server-side before any
// credit reservation or billable provider request; never expose provider keys.
export function getGenerationBetaGate(env = process.env) {
  const enabled = env.K4K_GENERATION_BETA_ENABLED === 'true';
  const cohortLimit = 25;
  const billingEnabled = env.K4K_GENERATION_BILLABLE_ENABLED === 'true';
  const verified = env.K4K_GENERATION_E2E_VERIFIED === 'true';
  const allowlist = new Set((env.K4K_GENERATION_BETA_USER_IDS || '')
    .split(',').map(x => x.trim().toLowerCase())
    .filter(x => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x)));
  return Object.freeze({
    enabled, billingEnabled, verified, cohortLimit, invitedCount:allowlist.size,
    authorize({userId, billable = false} = {}) {
      if (allowlist.size > cohortLimit) return {allowed:false,reason:'BETA_COHORT_LIMIT_EXCEEDED'};
      if (!enabled || !verified) return {allowed:false,reason:'GENERATION_NOT_VERIFIED'};
      if (typeof userId !== 'string' || !allowlist.has(userId.toLowerCase()))
        return {allowed:false,reason:'BETA_ACCESS_DENIED'};
      if (billable && !billingEnabled)
        return {allowed:false,reason:'BILLABLE_GENERATION_DISABLED'};
      return {allowed:true,reason:'OK'};
    }
  });
}
