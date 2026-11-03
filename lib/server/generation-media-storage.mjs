import {ownedMediaPath,validateReferenceList} from './generation-media.mjs';

// Storage verification must use a server-side client with permission to read
// object metadata. A path prefix alone is never proof of ownership.
const MIME = Object.freeze({
  image: new Set(['image/jpeg','image/png','image/webp']),
  video: new Set(['video/mp4'])
});
const MAX_BYTES = Object.freeze({image: 15 * 1024 * 1024, video: 150 * 1024 * 1024});
const ALLOWED_EXTENSIONS = Object.freeze({
  'image/jpeg': new Set(['jpg','jpeg']),
  'image/png': new Set(['png']),
  'image/webp': new Set(['webp']),
  'video/mp4': new Set(['mp4'])
});

export async function verifyOwnedMediaObject(storage, userId, path, kind) {
  const ref = ownedMediaPath(userId,path,kind);
  if (!storage || typeof storage.from !== 'function') throw new Error('Storage verification unavailable');
  const bucket = storage.from(ref.bucket);
  if (!bucket || typeof bucket.info !== 'function') throw new Error('Storage metadata verification unavailable');
  // Supabase Storage info(path) fetches the actual object metadata. Never
  // fall back to list() or public URL construction on errors.
  let result;
  try { result = await bucket.info(ref.path); }
  catch { throw new Error('Storage metadata verification failed'); }
  if (!result || result.error || !result.data) throw new Error('Media object not found');
  const object = result.data;
  const metadata = object.metadata || {};
  const bytes = Number(metadata.size ?? object.size);
  const mime = String(metadata.mimetype ?? object.mimetype ?? '').toLowerCase().split(';')[0].trim();
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_BYTES[kind]) throw new Error('Media size not allowed');
  if (!MIME[kind].has(mime) || !ALLOWED_EXTENSIONS[mime].has(extension)) throw new Error('Media type not allowed');
  return Object.freeze({bucket:ref.bucket,path:ref.path,bytes,mime});
}

export async function verifyOwnedReferenceImages(storage,userId,paths) {
  const refs = validateReferenceList(userId,paths);
  // Sequential checks limit metadata request fan-out per generation request.
  const verified=[];
  for (const ref of refs) verified.push(await verifyOwnedMediaObject(storage,userId,ref.path,'image'));
  return verified;
}

// This verifies stored object metadata, NOT magic bytes or malicious payloads.
// Before signing/provider submission: verify bytes by sniffing the stored object,
// enforce upload authorization, and keep storage buckets private.
