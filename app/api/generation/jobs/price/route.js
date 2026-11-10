import {NextResponse} from 'next/server';
import {authenticateGenerationRequest, buildGenerationService, NO_STORE} from '../../../../../lib/server/generation-request.mjs';
import {GenerationError} from '../../../../../lib/server/generation-service.mjs';
import {describeBlockers} from '../../../../../lib/server/generation-config.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;
const reply = (body, status = 200) => NextResponse.json(body, {status, headers: NO_STORE});

// Read-only credit price for a draft the caller owns, from server-inspected
// media. Reserves nothing and never contacts the video provider.
export async function POST(request) {
  const {user, admin, failure} = await authenticateGenerationRequest(request);
  if (failure) return reply({error: failure.error}, failure.status);
  let body;
  try { body = await request.json(); } catch { return reply({error: 'INVALID_JSON'}, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({error: 'INVALID_INPUT'}, 400);
  try {
    const {service} = buildGenerationService({admin});
    return reply({price: await service.price({userId: user.id, jobId: body.jobId, resolution: body.resolution ?? '720p'})});
  } catch (error) {
    if (error instanceof GenerationError) {
      const {blockers, ...extra} = error.extra;
      return reply({error: error.code, ...extra, ...(blockers ? {blockers: describeBlockers(blockers)} : {})}, error.status);
    }
    return reply({error: 'UNAVAILABLE'}, 503);
  }
}
