// Server-only. Genjutsu request handling for K4K APP.
//
// Billable provider calls stay OFF unless BOTH:
//   1. HIGGSFIELD_GENJUTSU_ENABLED === 'true', and
//   2. a verified endpoint adapter is supplied by the caller.
// Nothing in this file calls Higgsfield on its own.
//
// The limits below are local guards based on published Higgsfield descriptions.
// They are not provider pricing.

export const GENJUTSU_MODELS = {
  lite: {
    label: 'Genjutsu Lite',
    minSeconds: 4,
    maxSeconds: 30,
    maxReferences: 10,
    resolutions: ['720p', '1080p'],
  },
  standard: {
    label: 'Genjutsu',
    minSeconds: 4,
    maxSeconds: 30,
    maxReferences: 8,
    resolutions: ['480p', '720p', '1080p'],
  },
};

const MAX_PROMPT_LENGTH = 1000; // local guard, not a provider limit

function isHttpsUrl(value) {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateGenjutsuRequest(request) {
  const errors = [];
  const model = GENJUTSU_MODELS[request?.model];
  if (!model) {
    return {ok: false, errors: ['model must be "lite" or "standard"']};
  }

  if (!isHttpsUrl(request.sourceVideoUrl)) errors.push('sourceVideoUrl must be an https URL');

  const refs = request.referenceImageUrls ?? [];
  if (!Array.isArray(refs) || refs.length < 1) {
    errors.push('at least one referenceImageUrl is required');
  } else {
    if (refs.length > model.maxReferences) {
      errors.push(`${model.label} accepts at most ${model.maxReferences} reference images`);
    }
    if (!refs.every(isHttpsUrl)) errors.push('every referenceImageUrl must be an https URL');
  }

  const seconds = request.seconds;
  if (!Number.isInteger(seconds) || seconds < model.minSeconds || seconds > model.maxSeconds) {
    errors.push(`seconds must be an integer from ${model.minSeconds} to ${model.maxSeconds}`);
  }

  if (!model.resolutions.includes(request.resolution)) {
    errors.push(`resolution must be one of ${model.resolutions.join(', ')}`);
  }

  if (request.prompt !== undefined) {
    if (typeof request.prompt !== 'string' || request.prompt.length > MAX_PROMPT_LENGTH) {
      errors.push(`prompt must be text up to ${MAX_PROMPT_LENGTH} characters`);
    }
  }

  return errors.length ? {ok: false, errors} : {ok: true, errors: []};
}

export function createGenjutsuService({env = process.env, adapter = null} = {}) {
  const enabled = env.HIGGSFIELD_GENJUTSU_ENABLED === 'true';

  return {
    enabled,
    async submit(request) {
      const check = validateGenjutsuRequest(request);
      if (!check.ok) return {status: 400, error: 'INVALID_REQUEST', details: check.errors};
      if (!enabled) return {status: 503, error: 'DISABLED'};
      if (!adapter) return {status: 503, error: 'ENDPOINT_NOT_VERIFIED'};
      const result = await adapter.submit(request);
      return {status: 202, result};
    },
  };
}
