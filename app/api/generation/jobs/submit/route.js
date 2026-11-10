import {NextResponse} from 'next/server';
import {authenticateGenerationRequest, buildGenerationService, NO_STORE} from '../../../../../lib/server/generation-request.mjs';
import {GenerationError} from '../../../../../lib/server/generation-service.mjs';
import {describeBlockers} from '../../../../../lib/server/generation-config.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;
const reply = (body, status = 200) => NextResponse.json(body, {status, headers: NO_STORE});

// Starts one generation for a draft the caller owns. The body carries only the
// draft ID, a resolution and an idempotency key. Price, duration, media and
// the user ID are all derived on the server.
export async function POST(request) {
  const {user, admin, failure} = await authenticateGenerationRequest(request);
  if (failure) return reply({error: failure.error}, failure.status);
  let body;
  try { body = await request.json(); } catch { return reply({error: 'INVALID_JSON'}, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({error: 'INVALID_INPUT'}, 400);
  try {
    const {service} = buildGenerationService({admin});
    const result = await service.submit({userId: user.id, jobId: body.jobId, requestKey: body.requestKey, resolution: body.resolution ?? '720p'});
    return reply({job: result}, 202);
  } catch (error) {
    if (error instanceof GenerationError) {
      const {blockers, ...extra} = error.extra;
      return reply({error: error.code, ...extra, ...(blockers ? {blockers: describeBlockers(blockers)} : {})}, error.status);
    }
    return reply({error: 'UNAVAILABLE'}, 503);
  }
}
