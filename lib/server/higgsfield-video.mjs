// Server adapter only. No route is enabled until ownership, durable job storage,
// budget limits and atomic credit reservations are implemented by the caller.
const ORIGIN = 'https://api.higgsfield.ai';
export const MODEL = 'higgsfield/genjutsu/motion-transfer/v1.0';
const states = new Set(['queued','in_progress','completed','failed','nsfw','canceled']);
function httpsUrl(value) {
  if (typeof value !== 'string' || value.length > 2083) throw new Error('Invalid media URL');
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.hash) throw new Error('Invalid media URL');
  return u;
}
export function motionInput({videoUrl, imageUrls, prompt = '', durationSeconds}, mediaOrigins) {
  if (!Array.isArray(mediaOrigins) || !mediaOrigins.length) throw new Error('Trusted media origins required');
  const check = value => {const u = httpsUrl(value); if (!mediaOrigins.includes(u.origin)) throw new Error('Untrusted media origin'); return u.href;};
  if (!Array.isArray(imageUrls) || imageUrls.length < 1 || imageUrls.length > 8) throw new Error('Provide 1–8 images');
  if (typeof prompt !== 'string' || prompt.length > 1800) throw new Error('Invalid prompt');
  // Duration must come from trusted media inspection, never a browser assertion.
  if (!Number.isFinite(durationSeconds) || durationSeconds < 4 || durationSeconds > 30) throw new Error('Video must be 4–30 seconds');
  return {video_url:check(videoUrl),image_urls:imageUrls.map(check),prompt,resolution:'720p'};
}
export function normalizeStatus(data, expectedId) {
  if (!data || data.request_id !== expectedId || !states.has(data.status)) throw new Error('Invalid provider status');
  let videoUrl = null;
  if (data.status === 'completed') videoUrl = httpsUrl(data.video?.url).href;
  return {requestId:expectedId,status:data.status,videoUrl};
}
export function createVideoProvider({credentials, trustedOutputOrigins, fetchImpl = fetch}) {
  if (typeof window !== 'undefined') throw new Error('Server only');
  if (typeof credentials !== 'string' || !credentials.includes(':') || /[\r\n]/.test(credentials)) throw new Error('Provider unavailable');
  async function request(url, options) {
    const response = await fetchImpl(url, {...options, redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Authorization:`Key ${credentials}`,...options.headers}});
    if (!response.ok) {
      // Never expose provider response bodies (which can include input URLs).
      const error = new Error('Provider request failed'); error.status = response.status; throw error;
    }
    return response.json();
  }
  return {
    async submit(input, idempotencyKey) {
      if (typeof idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) throw new Error('Stable job key required');
      const data = await request(`${ORIGIN}/${MODEL}`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify(input)});
      if (typeof data.request_id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.request_id)) throw new Error('Invalid provider handle');
      const u = httpsUrl(data.status_url);
      if (u.origin !== ORIGIN || u.pathname !== `/requests/${data.request_id}/status` || u.search) throw new Error('Invalid status URL');
      return {requestId:data.request_id,statusUrl:u.href};
    },
    async status(handle) {
      const u = httpsUrl(handle.statusUrl);
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(handle.requestId) || u.origin !== ORIGIN || u.pathname !== `/requests/${handle.requestId}/status` || u.search) throw new Error('Invalid status URL');
      const result = normalizeStatus(await request(u.href,{method:'GET'}),handle.requestId);
      if (result.videoUrl) {
        // Completed media URLs may later be fetched server-side. Fail closed
        // unless the operator explicitly configured trusted HTTPS CDN origins.
        if (!Array.isArray(trustedOutputOrigins) || !trustedOutputOrigins.length ||
            !trustedOutputOrigins.every(origin => {try {const parsed = new URL(origin);return parsed.protocol === 'https:' && parsed.origin === origin;} catch {return false;}}) ||
            !trustedOutputOrigins.includes(new URL(result.videoUrl).origin)) {
          throw new Error('Untrusted provider output origin');
        }
      }
      return result;
    }
  };
}
