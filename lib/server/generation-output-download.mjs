// Bounded download of a finished provider video. The URL must come from an
// authenticated provider status response, never from a customer or browser.
// Only hosts approved in server configuration are fetched; redirects are refused.
const TYPES = new Set(['video/mp4', 'application/octet-stream', 'binary/octet-stream']);

export class OutputDownloadError extends Error {
  constructor(code, host = null) { super(code); this.name = 'OutputDownloadError'; this.code = code; this.host = host; }
}

export function isApprovedOutputHost(hostname, allowedHosts) {
  const host = String(hostname).toLowerCase();
  return allowedHosts.some(entry => entry.startsWith('.') ? host.endsWith(entry) && host.length > entry.length : host === entry);
}

export function createApprovedOutputDownloader({fetchImpl = globalThis.fetch, allowedHosts = [], maxBytes = 100 * 1024 * 1024, timeoutMs = 45000} = {}) {
  if (typeof window !== 'undefined') throw new Error('Server only');
  return async function download(rawUrl) {
    let url;
    try { url = new URL(rawUrl); } catch { throw new OutputDownloadError('OUTPUT_URL_INVALID'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new OutputDownloadError('OUTPUT_URL_INVALID');
    if (!allowedHosts.length || !isApprovedOutputHost(url.hostname, allowedHosts)) throw new OutputDownloadError('OUTPUT_HOST_NOT_APPROVED', url.hostname);
    let response;
    try { response = await fetchImpl(url.href, {method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs)}); }
    catch { throw new OutputDownloadError('OUTPUT_DOWNLOAD_FAILED'); }
    if (!response?.ok || !response.body?.getReader) throw new OutputDownloadError('OUTPUT_DOWNLOAD_FAILED');
    const type = (response.headers?.get?.('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!TYPES.has(type)) throw new OutputDownloadError('OUTPUT_TYPE_INVALID');
    const advertised = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(advertised) && advertised > maxBytes) throw new OutputDownloadError('OUTPUT_TOO_LARGE');
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) throw new OutputDownloadError('OUTPUT_DOWNLOAD_FAILED');
        size += value.byteLength;
        if (size > maxBytes) throw new OutputDownloadError('OUTPUT_TOO_LARGE');
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error instanceof OutputDownloadError ? error : new OutputDownloadError('OUTPUT_DOWNLOAD_FAILED');
    }
    if (size < 1024) throw new OutputDownloadError('OUTPUT_TOO_SMALL');
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    // The content type is not trusted on its own: the bytes must be an MP4.
    if (String.fromCharCode(...bytes.subarray(4, 8)) !== 'ftyp') throw new OutputDownloadError('OUTPUT_NOT_MP4');
    return bytes;
  };
}
