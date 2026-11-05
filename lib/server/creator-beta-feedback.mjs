// Validate untrusted beta feedback before persisting it to an owner-scoped store.
// The API route must derive userId from verified server-side authentication.
export function validateCreatorFeedback(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid feedback');
  const category = input.category;
  if (!['bug','quality','workflow','suggestion'].includes(category)) throw new Error('Invalid category');
  const message = input.message;
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000)
    throw new Error('Feedback must be 10–2000 characters');
  const jobId = input.jobId ?? null;
  if (jobId !== null && (typeof jobId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)))
    throw new Error('Invalid job ID');
  return Object.freeze({category,message:message.trim(),jobId});
}
