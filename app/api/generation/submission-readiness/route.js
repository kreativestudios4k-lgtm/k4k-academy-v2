import {NextResponse} from 'next/server';
import {authenticateGenerationRequest, NO_STORE} from '../../../../lib/server/generation-request.mjs';
import {getGenerationConfig, describeBlockers} from '../../../../lib/server/generation-config.mjs';

export const runtime = 'nodejs';
const reply = (body, status = 200) => NextResponse.json(body, {status, headers: {...NO_STORE, 'X-Robots-Tag': 'noindex'}});

// Tells Creator Studio whether the signed-in customer can start a generation
// right now, and if not, exactly what is missing. Reports only whether each
// setting is present. It never returns a credential and never calls the provider.
export async function GET(request) {
  const {user, admin, failure} = await authenticateGenerationRequest(request);
  if (failure) return reply({error: failure.error}, failure.status);
  const config = getGenerationConfig();
  const blockers = [...config.blockers];
  const denied = config.authorizeUser(user.id);
  if (denied && !blockers.includes('TEST_USERS_NOT_CONFIGURED')) blockers.push(denied);
  const {data: account, error} = await admin.from('studio_credit_accounts').select('balance').eq('user_id', user.id).maybeSingle();
  return reply({
    ready: blockers.length === 0,
    blockers: describeBlockers(blockers),
    creditBalance: error ? null : (account?.balance ?? 0),
    creditsPerSecond: config.pricing.approved ? config.pricing.table : null,
    maxActiveJobs: config.maxActiveJobs,
  });
}
