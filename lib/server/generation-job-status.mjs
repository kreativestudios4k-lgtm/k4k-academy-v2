// Owner-scoped job status. The caller must derive userId from a verified
// server session; it is never read from the request body or query string.
// Returns a public view only: no input, provider handles, provider URLs or
// output URLs. Downloads are a separate, signed-URL flow.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class JobStatusError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'JobStatusError';
    this.code = code;
    this.status = status;
  }
}

export function toPublicJob(row) {
  return Object.freeze({
    id: row.id,
    state: row.state,
    credits: row.credits,
    providerStatus: row.provider_status ?? null,
    outputReady: row.state === 'completed',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function getOwnedJobStatus({store, userId, jobId}) {
  if (typeof userId !== 'string' || !UUID.test(userId)) throw new JobStatusError('UNAUTHENTICATED', 401);
  if (typeof jobId !== 'string' || !UUID.test(jobId)) throw new JobStatusError('INVALID_JOB_ID', 400);
  const row = await store.read(userId.toLowerCase(), jobId.toLowerCase());
  if (!row || String(row.user_id).toLowerCase() !== userId.toLowerCase()) {
    throw new JobStatusError('JOB_NOT_FOUND', 404);
  }
  return toPublicJob(row);
}
