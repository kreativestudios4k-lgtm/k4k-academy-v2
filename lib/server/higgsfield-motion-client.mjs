// Server-only Higgsfield client for the two motion-transfer models K4K sells.
// Every path, header, status value and response field used here is taken from
// the published Higgsfield API documentation (checked 2026-11-10):
//   POST https://api.higgsfield.ai/{model}            submit, with Idempotency-Key
//   GET  https://api.higgsfield.ai/requests/{id}/status
//   POST https://api.higgsfield.ai/estimate/{model}   authoritative USD estimate
// Statuses: queued, in_progress, completed, failed, nsfw, canceled.
// Nothing in this file runs unless a caller invokes it; no secrets are logged.
import {higgsfieldAuthorization} from './higgsfield-auth.mjs';

const ORIGIN = 'https://api.higgsfield.ai';
const REQUEST_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const RESOLUTIONS = new Set(['480p', '720p', '1080p']);
const PROVIDER_STATES = Object.freeze({
  queued: 'queued', in_progress: 'processing', completed: 'completed',
  failed: 'failed', nsfw: 'failed', canceled: 'failed',
});
// Synchronous rejections: the request was not accepted, so no generation exists.
const DEFINITE_REJECTIONS = new Set([400, 401, 403, 404, 422, 423, 429]);

export const MOTION_MODELS = Object.freeze({
  // Light uses the first 15 seconds of the source video.
  lite: Object.freeze({label: 'K4K Lite', modelId: 'higgsfield/genjutsu-light/motion-transfer/v1.0', minSeconds: 1, maxSeconds: 15}),
  // Genjutsu needs at least 4 seconds; longer than 30 seconds is trimmed by the provider.
  pro: Object.freeze({label: 'K4K Pro', modelId: 'higgsfield/genjutsu/motion-transfer/v1.0', minSeconds: 4, maxSeconds: 30}),
});

export class ProviderError extends Error {
  constructor(code, {httpStatus = null, definitiveRejection = false} = {}) {
    super(code);
    this.name = 'ProviderError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.definitiveRejection = definitiveRejection;
  }
}

function httpsUrl(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2083) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch { return null; }
}

export function buildMotionPayload({videoUrl, imageUrls, prompt = '', resolution = '720p'} = {}) {
  if (!httpsUrl(videoUrl)) throw new ProviderError('INVALID_SOURCE_VIDEO_URL');
  if (!Array.isArray(imageUrls) || imageUrls.length < 1 || imageUrls.length > 8 ||
      new Set(imageUrls).size !== imageUrls.length || !imageUrls.every(httpsUrl)) throw new ProviderError('INVALID_IMAGE_URLS');
  if (typeof prompt !== 'string' || prompt.length > 10000) throw new ProviderError('INVALID_PROMPT');
  if (!RESOLUTIONS.has(resolution)) throw new ProviderError('INVALID_RESOLUTION');
  return {video_url: videoUrl, image_urls: [...imageUrls], prompt, resolution};
}

export function createHiggsfieldMotionClient({credentials, fetchImpl = globalThis.fetch, timeoutMs = 30000} = {}) {
  if (typeof window !== 'undefined') throw new Error('Server only');
  if (typeof fetchImpl !== 'function') throw new ProviderError('PROVIDER_UNAVAILABLE');
  let authorization;
  try { authorization = higgsfieldAuthorization(credentials); } catch { throw new ProviderError('PROVIDER_CREDENTIALS_INVALID'); }

  async function call(path, {method, body, headers = {}}) {
    let response;
    try {
      response = await fetchImpl(ORIGIN + path, {
        method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        headers: {Authorization: authorization, Accept: 'application/json', ...headers},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}),
      });
    } catch {
      // Timeout or network failure: the provider may or may not have acted.
      throw new ProviderError('PROVIDER_UNREACHABLE');
    }
    if (!response?.ok) {
      const status = Number(response?.status) || null;
      let idempotencyConflict = false;
      if (status === 422) {
        // A reused key means an earlier request may exist. Never treat that as a clean rejection.
        try { idempotencyConflict = /idempotency/i.test(JSON.stringify((await response.json())?.detail ?? '')); } catch { idempotencyConflict = true; }
      }
      // Provider error bodies can echo input URLs, so they are never surfaced.
      throw new ProviderError('PROVIDER_HTTP_' + (status ?? 'ERROR'), {
        httpStatus: status,
        definitiveRejection: DEFINITE_REJECTIONS.has(status) && !idempotencyConflict,
      });
    }
    try { return await response.json(); } catch { throw new ProviderError('PROVIDER_RESPONSE_INVALID'); }
  }

  const model = tier => {
    const found = Object.hasOwn(MOTION_MODELS, tier) ? MOTION_MODELS[tier] : null;
    if (!found) throw new ProviderError('UNSUPPORTED_MODEL');
    return found;
  };

  return Object.freeze({
    // Authoritative price for this account and these exact parameters. Not a generation.
    async estimate(tier, payload) {
      const data = await call('/estimate/' + model(tier).modelId, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: payload});
      const usd = typeof data?.usd === 'string' && /^\d{1,6}(\.\d{1,6})?$/.test(data.usd) ? Number(data.usd) : NaN;
      if (!Number.isFinite(usd) || usd <= 0) throw new ProviderError('PROVIDER_ESTIMATE_INVALID');
      return {usd};
    },
    // idempotencyKey must be the durable K4K job ID: one key, one generation intent.
    async submit(tier, payload, idempotencyKey) {
      if (typeof idempotencyKey !== 'string' || !/^[\x21-\x7e]{16,255}$/.test(idempotencyKey)) throw new ProviderError('IDEMPOTENCY_KEY_REQUIRED');
      const data = await call('/' + model(tier).modelId, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey}, body: payload,
      });
      if (typeof data?.request_id !== 'string' || !REQUEST_ID.test(data.request_id)) throw new ProviderError('PROVIDER_RESPONSE_INVALID');
      return {request_id: data.request_id, status: data.status ?? 'queued'};
    },
    async status(providerJobId) {
      if (typeof providerJobId !== 'string' || !REQUEST_ID.test(providerJobId)) throw new ProviderError('INVALID_PROVIDER_JOB_ID');
      const data = await call('/requests/' + encodeURIComponent(providerJobId) + '/status', {method: 'GET'});
      if (!data || typeof data !== 'object' || data.request_id !== providerJobId) throw new ProviderError('PROVIDER_JOB_MISMATCH');
      if (!Object.hasOwn(PROVIDER_STATES, data.status)) throw new ProviderError('PROVIDER_STATUS_UNKNOWN');
      let videoUrl = null;
      if (data.status === 'completed') {
        const url = httpsUrl(data.video?.url);
        if (!url) throw new ProviderError('PROVIDER_OUTPUT_MISSING');
        videoUrl = url.href;
      }
      return Object.freeze({providerJobId, status: PROVIDER_STATES[data.status], providerStatus: data.status, videoUrl});
    },
  });
}
