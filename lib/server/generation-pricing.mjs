// Preview-only quote policy. Rates match Higgsfield's published list prices
// (checked 6 Nov 2026 from the Genjutsu and Genjutsu Light API docs).
// Approved models: Genjutsu Light (Lite tier) and Genjutsu (Premium tier) only.
// This module makes NO provider calls and grants NO credits.
// A server route must still verify the user, paid entitlement, owned media and
// server-inspected durations before using a quote.

// Credit = $0.25 (approved default). Divisor 75 = 250 mills x 3 / 10, which encodes
// the 2.5x margin floor and a 75% re-run success rate: credits = cost / 0.75 x 2.5 / 0.25.
const CREDITS_DIVISOR_MILLS = 75;
const MAX_PROVIDER_MILLS_PER_JOB = 7000; // USD $7.00 per accepted request

// Rates are USD mills per billable second (list, before any customer discount).
// billing 'input': Higgsfield bills source seconds only; output follows the source.
// billing 'output+input': Higgsfield bills output seconds plus source seconds.
const MODELS = Object.freeze({
  genjutsu_light: Object.freeze({
    billing: 'output+input',
    minInputSeconds: 0,
    maxInputSeconds: 15, // Light trims source to 15s; longer sources are rejected, not trimmed
    rates: Object.freeze({'480p': 50, '720p': 100, '1080p': 200}),
  }),
  genjutsu: Object.freeze({
    billing: 'input',
    minInputSeconds: 4, // Genjutsu Motion Transfer requires at least 4 seconds of source
    maxInputSeconds: 30, // and trims longer sources to 30 seconds
    rates: Object.freeze({'480p': 318, '720p': 681, '1080p': 1632}),
  }),
});

export function quoteGeneration({model, resolution, outputSeconds, inputVideoSeconds = 0}) {
  const config = MODELS[model];
  const rate = config?.rates[resolution];
  if (rate === undefined) {
    throw new Error('Model or resolution is not approved');
  }
  // Duration MUST come from server media inspection, never from the browser.
  if (typeof inputVideoSeconds !== 'number' || !Number.isFinite(inputVideoSeconds)) {
    throw new Error(`Input video must be ${config.minInputSeconds}-${config.maxInputSeconds} seconds`);
  }
  // Higgsfield rounds source duration up to whole seconds before billing.
  const billableInputSeconds = Math.ceil(inputVideoSeconds);
  if (billableInputSeconds < config.minInputSeconds || billableInputSeconds > config.maxInputSeconds) {
    throw new Error(`Input video must be ${config.minInputSeconds}-${config.maxInputSeconds} seconds`);
  }

  let billableSeconds;
  let outputDuration;
  if (config.billing === 'input') {
    outputDuration = billableInputSeconds; // output follows the prepared source
    billableSeconds = billableInputSeconds;
  } else {
    if (!Number.isInteger(outputSeconds) || outputSeconds < 2 || outputSeconds > 30) {
      throw new Error('Output must be 2-30 whole seconds');
    }
    outputDuration = outputSeconds;
    billableSeconds = outputSeconds + billableInputSeconds;
  }

  const providerMaxUsdMills = billableSeconds * rate;
  if (providerMaxUsdMills > MAX_PROVIDER_MILLS_PER_JOB) {
    throw new Error('Request exceeds the approved provider cost cap');
  }
  return Object.freeze({
    model,
    resolution,
    outputSeconds: outputDuration,
    billableSeconds,
    providerMaxUsdMills,
    credits: Math.floor((providerMaxUsdMills + CREDITS_DIVISOR_MILLS - 1) / CREDITS_DIVISOR_MILLS),
    pricingRevision: 'higgsfield-list-2026-11-06',
  });
}
