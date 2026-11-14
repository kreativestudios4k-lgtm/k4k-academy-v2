// Unit fixtures must not inherit production checkout/pilot switches.
// Explicit production tests pass their own environment objects.
process.env.VERCEL_ENV='test';
process.env.K4K_OWNER_LIVE_PILOT_ENABLED='false';
process.env.K4K_LIVE_PAYMENTS_ENABLED='false';
