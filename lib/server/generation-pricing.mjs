// Preview-only quote policy. Rates match Higgsfield's published list prices
// (checked 6 Nov 2026). This module makes NO provider calls and grants NO credits.
// A server route must still verify the user, paid entitlement, owned media and
// server-inspected durations before using a quote.

// Credit = $0.25 (approved default). Divisor 75 = 250 mills x 3 / 10, which encodes
// the 2.5x margin floor and a 75% re-run success rate: credits = cost / 0.75 x 2.5 / 0.25.
const CREDITS_DIVISOR_MILLS = 75;
const MAX_PROVIDER_MILLS_PER_JOB = 7000; // USD $7.00 per accepted request
const MAX_OUTPUT_SECONDS = 30;
const MIN_OUTPUT_SECONDS = 2;
const MAX_INPUT_VIDEO_SECONDS = 15; // Genjutsu Light trims source to 15s; longer sources are rejected

// List rates in USD mills per billable second. Only verified entries are approved.
// Genjutsu (full) is deliberately absent: its 720p rate is not verified yet.
const RATES = Object.freeze({
  wan3_0_prime: Object.freeze({'480p': 68, '720p': 140, '1080p': 280}),
  genjutsu_light: Object.freeze({'480p': 50, '720p': 100, '1080p': 200}),
});

export function quoteGeneration({model, resolution, outputSeconds, inputVideoSeconds = 0}) {
  const rate = RATES[model]?.[resolution];
  if (rate === undefined) {
    throw new Error('Model or resolution is not approved');
  }
  if (!Number.isInteger(outputSeconds) || outputSeconds < MIN_OUTPUT_SECONDS || outputSeconds > MAX_OUTPUT_SECONDS) {
    throw new Error('Output must be 2-30 whole seconds');
  }
  // Duration MUST come from server media inspection, never from the browser.
  if (typeof inputVideoSeconds !== 'number' || !Number.isFinite(inputVideoSeconds) ||
      inputVideoSeconds < 0 || inputVideoSeconds > MAX_INPUT_VIDEO_SECONDS) {
    throw new Error('Input video must be 0-15 seconds');
  }
  // Higgsfield bills output plus input video, rounded up to whole seconds.
  const billableSeconds = outputSeconds + Math.ceil(inputVideoSeconds);
  const providerMaxUsdMills = billableSeconds * rate;
  if (providerMaxUsdMills > MAX_PROVIDER_MILLS_PER_JOB) {
    throw new Error('Request exceeds the approved provider cost cap');
  }
  return Object.freeze({
    model,
    resolution,
    billableSeconds,
    providerMaxUsdMills,
    credits: Math.floor((providerMaxUsdMills + CREDITS_DIVISOR_MILLS - 1) / CREDITS_DIVISOR_MILLS),
    pricingRevision: 'higgsfield-list-2026-11-06',
  });
}
