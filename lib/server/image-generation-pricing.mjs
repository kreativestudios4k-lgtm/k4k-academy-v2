// Preview-only quote policy for K4K image generation (Gemini 3.1 Flash Image).
// Prices are from third-party summaries of Google's list rates (checked 7 Nov 2026).
// Verify against Google's pricing page before activation.
// This module makes NO provider calls and grants NO credits.

// Credit = $0.25 (approved default). Margin floor 2.5x, 75% success rate.
// Costs are in micro-dollars (1 USD = 1,000,000) so the input-token maths stays exact.
const CREDITS_DIVISOR_MICROS = 75000; // $0.075 = $0.25 x 2.5 / 0.75 / 0.25 -> credits = cost / $0.075
const MAX_PROVIDER_MICROS_PER_JOB = 250000; // USD $0.25 per accepted request
const MAX_REFERENCE_IMAGES = 4;
const INPUT_MICROS_PER_REFERENCE = 560; // 1,120 input tokens x $0.50 per million

const MODEL = 'gemini-3.1-flash-image';
const OUTPUT_MICROS = Object.freeze({
  '1K': 67000,
  '2K': 101000,
  '4K': 151000,
});

export function quoteImage({model, resolution, referenceImageCount = 0}) {
  if (model !== MODEL) {
    throw new Error('Model is not approved');
  }
  const outputMicros = OUTPUT_MICROS[resolution];
  if (outputMicros === undefined) {
    throw new Error('Resolution must be 1K, 2K or 4K');
  }
  if (!Number.isInteger(referenceImageCount) || referenceImageCount < 0 || referenceImageCount > MAX_REFERENCE_IMAGES) {
    throw new Error(`Reference images must be 0-${MAX_REFERENCE_IMAGES}`);
  }
  const providerMaxMicros = outputMicros + referenceImageCount * INPUT_MICROS_PER_REFERENCE;
  if (providerMaxMicros > MAX_PROVIDER_MICROS_PER_JOB) {
    throw new Error('Request exceeds the approved provider cost cap');
  }
  return Object.freeze({
    model,
    resolution,
    referenceImageCount,
    providerMaxMicros,
    credits: Math.floor((providerMaxMicros + CREDITS_DIVISOR_MICROS - 1) / CREDITS_DIVISOR_MICROS),
    pricingRevision: 'google-list-2026-11-07',
  });
}
