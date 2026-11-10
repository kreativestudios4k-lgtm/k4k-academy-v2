// Shared server-side setup for the generation routes: verify the caller's
// session, then build the service-role client and generation service.
// The service-role key and provider credential never leave the server.
import {createClient} from '@supabase/supabase-js';
import {getGenerationConfig} from './generation-config.mjs';
import {createHiggsfieldMotionClient} from './higgsfield-motion-client.mjs';
import {createGenerationService} from './generation-service.mjs';

export const NO_STORE = Object.freeze({'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'});

export async function authenticateGenerationRequest(request, env = process.env) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return {failure: {error: 'UNAUTHENTICATED', status: 401}};
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceKey) return {failure: {error: 'UNAVAILABLE', status: 503}};
  const options = {auth: {persistSession: false, autoRefreshToken: false}};
  const {data: {user} = {}, error} = await createClient(url, publishableKey, options).auth.getUser(token);
  if (error || !user || user.is_anonymous) return {failure: {error: 'UNAUTHENTICATED', status: 401}};
  return {user, admin: createClient(url, serviceKey, options)};
}

export function buildGenerationService({admin, env = process.env} = {}) {
  const config = getGenerationConfig(env);
  // Status checks and settlement must keep working for jobs already in flight,
  // even while new submissions are switched off, so the client only needs a credential.
  const providerClient = config.credentials ? createHiggsfieldMotionClient({credentials: config.credentials}) : null;
  const log = (event, detail) => console.warn('[k4k-generation]', event, JSON.stringify(detail ?? {}));
  return {config, service: createGenerationService({admin, providerClient, config, log})};
}
