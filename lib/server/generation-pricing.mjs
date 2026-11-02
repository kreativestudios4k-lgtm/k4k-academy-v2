// Preview-only quote policy. This module makes NO provider calls and grants NO credits.
// A server route must validate the user, paid entitlement, owned media, and inspected duration.
// Published undiscounted 720p Genjutsu rate: USD $0.681 per started source second.
// Review provider rates and payment fees before any paid activation.
export const K4K_MONTHLY_PLAN = Object.freeze({priceGbpPence: 999, credits: 100});
export const K4K_GENJUTSU_720P = 'higgsfield/genjutsu/motion-transfer/v1.0';
const RATE_USD_MILLS_PER_SECOND = 681;
const CREDITS_PER_SECOND = 10;
const MAX_PROVIDER_USD_MILLS_PER_JOB = 7000; // USD $7.00, per accepted request

export function quoteGenjutsu720p({model, durationSeconds, resolution = '720p'}) {
  if (model !== K4K_GENJUTSU_720P || resolution !== '720p') {
    throw new Error('Model configuration is not approved');
  }
  // Caller MUST provide an actual server-inspected video duration, never browser metadata.
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) ||
      durationSeconds < 4 || durationSeconds > 30) {
    throw new Error('Video must be 4–30 seconds');
  }
  const billableSeconds = Math.ceil(durationSeconds);
  const providerMaxUsdMills = billableSeconds * RATE_USD_MILLS_PER_SECOND;
  if (providerMaxUsdMills > MAX_PROVIDER_USD_MILLS_PER_JOB) {
    throw new Error('Video exceeds the approved provider cost cap');
  }
  return Object.freeze({
    model: K4K_GENJUTSU_720P,
    resolution: '720p',
    billableSeconds,
    credits: billableSeconds * CREDITS_PER_SECOND,
    providerMaxUsdMills,
    pricingRevision: 'preview-2026-11-02',
  });
}
