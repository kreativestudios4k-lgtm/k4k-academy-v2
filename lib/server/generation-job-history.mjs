// Owner-scoped, newest-first job history. userId must come from a verified
// server session, never from the request. Returns public job views only
// (see generation-job-status.mjs). Pagination is by created_at cursor; two
// jobs sharing an identical created_at at a page boundary could be skipped.
import {toPublicJob, JobStatusError} from './generation-job-status.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function parseHistoryQuery({limit, before} = {}) {
 let parsedLimit = DEFAULT_LIMIT;
 if (limit !== undefined && limit !== null && limit !== '') {
  if (!/^\d+$/.test(String(limit))) throw new JobStatusError('INVALID_LIMIT', 400);
  parsedLimit = Number(limit);
  if (parsedLimit < 1 || parsedLimit > MAX_LIMIT) throw new JobStatusError('INVALID_LIMIT', 400);
 }
 let cursor = null;
 if (before !== undefined && before !== null && before !== '') {
  const ms = Date.parse(String(before));
  if (Number.isNaN(ms)) throw new JobStatusError('INVALID_CURSOR', 400);
  cursor = new Date(ms).toISOString();
 }
 return {limit: parsedLimit, before: cursor};
}

export async function getOwnedJobHistory({store, userId, limit, before}) {
 if (typeof userId !== 'string' || !UUID.test(userId)) throw new JobStatusError('UNAUTHENTICATED', 401);
 const query = parseHistoryQuery({limit, before});
 const rows = await store.list(userId.toLowerCase(), query.limit, query.before);
 if (!Array.isArray(rows)) throw new JobStatusError('UNAVAILABLE', 503);
 const jobs = rows
  .filter((row) => String(row.user_id).toLowerCase() === userId.toLowerCase())
  .map(toPublicJob);
 const nextCursor = jobs.length === query.limit ? jobs[jobs.length - 1].createdAt : null;
 return Object.freeze({jobs, nextCursor});
}
