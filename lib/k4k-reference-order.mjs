// Browser-only reference planning for the Academy generator preview.
// This module never reads or uploads file contents.
export const K4K_MAX_REFERENCE_IMAGES = 30;

export function selectK4KReferenceNames(files) {
  const candidates = Array.from(files ?? []);
  const names = candidates
    .map(file => typeof file === 'string' ? file : file?.name)
    .filter(name => typeof name === 'string' && name.trim().length > 0)
    .slice(0, K4K_MAX_REFERENCE_IMAGES);
  return {names, ignored: Math.max(0, candidates.length - names.length)};
}

export function setK4KMainReference(names, index) {
  if (!Array.isArray(names)) return [];
  if (!Number.isInteger(index) || index < 0 || index >= names.length) return [...names];
  return [names[index], ...names.filter((_, i) => i !== index)];
}

export function describeK4KReferenceOrder(count) {
  if (!Number.isInteger(count) || count <= 0) return [];
  const total = Math.min(count, K4K_MAX_REFERENCE_IMAGES);
  return [
    '@Image1: PRIMARY character identity; keep this face and appearance consistent.',
    ...(total > 1 ? ['@Image2–@Image' + total + ': Supporting angles, outfits or separately mapped characters; do not blend them into @Image1.'] : []),
    'Use the same reference image order when uploading to the external generator.'
  ];
}
