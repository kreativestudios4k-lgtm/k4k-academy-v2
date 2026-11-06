// Reads generation jobs from the live Academy table public.studio_generation_jobs.
// The client must be the server-only service-role client. That client bypasses
// RLS, so every query filters by user_id explicitly. Selected columns exclude
// prompt, reference_paths, output_path and provider_job_id.
const COLUMNS = 'id,user_id,template_id,provider,model,status,credits_reserved,error_message,created_at,updated_at';
const TABLE = 'studio_generation_jobs';

export function createStudioReadStore(client) {
 if (typeof window !== 'undefined') throw new Error('Server only');
 return {
  async read(user, job) {
   const {data, error} = await client
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', user)
    .eq('id', job)
    .maybeSingle();
   if (error) throw new Error(`Generation store operation failed: ${TABLE} read`);
   return data ?? null;
  },
  async list(user, limit, before) {
   let query = client.from(TABLE).select(COLUMNS).eq('user_id', user);
   if (before) query = query.lt('created_at', before);
   const {data, error} = await query
    .order('created_at', {ascending: false})
    .order('id', {ascending: false})
    .limit(limit);
   if (error) throw new Error(`Generation store operation failed: ${TABLE} list`);
   return data ?? [];
  },
 };
}
