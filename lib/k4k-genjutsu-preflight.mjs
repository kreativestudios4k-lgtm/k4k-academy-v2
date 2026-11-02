// Planning-only compatibility rules from Higgsfield's published Genjutsu guides.
// These are not server-side provider validation and must not enable paid generation.
export const GENJUTSU_DESTINATIONS = Object.freeze({
  website: Object.freeze({ label: 'Higgsfield website (standard Genjutsu)', maxImages: 30, minSeconds: 4, maxSeconds: 30 }),
  'api-object-swap': Object.freeze({ label: 'Higgsfield API (Genjutsu Object Swap)', maxImages: 8, minSeconds: 4, maxSeconds: 30 }),
});

export function checkGenjutsuPreflight({ destination = 'website', imageCount = 0, durationSeconds = null, videoSelected = false } = {}) {
  const limits = GENJUTSU_DESTINATIONS[destination];
  if (!limits) return { ok: false, limits: null, issues: ['Choose a supported Genjutsu destination.'] };
  const issues = [];
  if (!videoSelected) issues.push('Select a reference video first.');
  if (!Number.isInteger(imageCount) || imageCount < 1) issues.push('Add at least one reference image.');
  else if (imageCount > limits.maxImages) issues.push('Reduce the reference images to ' + limits.maxImages + ' or fewer for this destination (currently ' + imageCount + ').');
  if (durationSeconds === null || durationSeconds === '') issues.push('Enter the video duration to check the clip length.');
  else if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < limits.minSeconds || durationSeconds > limits.maxSeconds)
    issues.push('Trim the source video to ' + limits.minSeconds + '–' + limits.maxSeconds + ' seconds for this destination.');
  return { ok: issues.length === 0, limits, issues };
}
