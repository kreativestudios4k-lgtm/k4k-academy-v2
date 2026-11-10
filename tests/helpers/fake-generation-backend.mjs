// In-memory stand-ins for the Supabase service-role client and the Higgsfield
// API, used only by tests. The two RPCs mirror the deployed database functions
// k4k_generation_reserve_draft and k4k_generation_finish statement for statement
// (read from the live schema on 2026-11-10), so the once-only rules are the
// database's rules, not something the test invents. No network, no credits.
export const USER = '11111111-1111-4111-8111-111111111111';
export const OTHER = '99999999-9999-4999-8999-999999999999';
export const CREDENTIAL = 'mock-key-id:mock-key-secret';
const uuid = n => `${String(n).padStart(8, '0')}-2222-4222-8222-222222222222`;

export function mp4(seconds, size = 64) {
  const bytes = new Uint8Array(Math.max(size, 60));
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 24); bytes.set([102, 116, 121, 112, 105, 115, 111, 109], 4); // ftyp isom
  const rest = bytes.length - 24;
  view.setUint32(24, rest); bytes.set([109, 111, 111, 118], 28); // moov
  view.setUint32(32, rest - 8); bytes.set([109, 118, 104, 100], 36); // mvhd, version 0
  view.setUint32(52, 1000); view.setUint32(56, Math.round(seconds * 1000));
  return bytes;
}
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);

export function createFakeBackend({balance = 100, seconds = 6, model = 'pro', images = 2} = {}) {
  const db = {jobs: [], reservations: [], accounts: new Map([[USER, balance], [OTHER, 500]])};
  const objects = new Map(); // "bucket/path" -> {bytes, contentType}
  const calls = {rpc: [], uploads: [], signed: []};
  let n = 0;

  function addDraft({user = USER, tier = model, duration = seconds, imageCount = images, prompt = 'swap the lead'} = {}) {
    const id = uuid(++n);
    const video = `${user}/${uuid(++n)}.mp4`;
    objects.set('studio-videos/' + video, {bytes: mp4(duration), contentType: 'video/mp4'});
    const refs = [];
    for (let i = 0; i < imageCount; i++) { const path = `${user}/${uuid(++n)}.png`; objects.set('studio-references/' + path, {bytes: PNG, contentType: 'image/png'}); refs.push(path); }
    db.jobs.push({id, user_id: user, template_id: 'creator-upload', provider: 'higgsfield', model: tier, status: 'draft', reference_paths: refs,
      reference_video_path: video, prompt, output_path: null, provider_job_id: null, credits_reserved: 0, error_message: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()});
    return id;
  }

  const rpcs = {
    k4k_generation_reserve_draft({p_user, p_job, p_key, p_credits, p_enabled}) {
      if (!p_enabled) throw Error('GENERATION_DISABLED');
      if (p_credits == null || p_credits < 1 || p_credits > 10000) throw Error('INVALID_CREDITS');
      const existing = db.reservations.find(r => r.user_id === p_user && r.request_key === p_key);
      if (existing) {
        if (existing.job_id !== p_job || existing.credits !== p_credits) throw Error('IDEMPOTENCY_CONFLICT');
        return {job_id: existing.job_id, status: existing.status, credits: existing.credits, newly_reserved: false};
      }
      const job = db.jobs.find(j => j.id === p_job && j.user_id === p_user);
      if (!job || job.status !== 'draft') throw Error('JOB_NOT_DRAFT');
      if (!job.reference_video_path || job.reference_paths.length < 1 || job.reference_paths.length > 8 || !['lite', 'pro'].includes(job.model)) throw Error('INVALID_JOB');
      if (!db.accounts.has(p_user) || db.accounts.get(p_user) < p_credits) throw Error('INSUFFICIENT_CREDITS');
      db.accounts.set(p_user, db.accounts.get(p_user) - p_credits);
      db.reservations.push({id: uuid(++n), user_id: p_user, job_id: p_job, request_key: p_key, credits: p_credits, status: 'reserved'});
      job.status = 'queued'; job.credits_reserved = p_credits;
      return {job_id: p_job, status: 'reserved', credits: p_credits, newly_reserved: true};
    },
    k4k_generation_finish({p_user, p_job, p_outcome, p_output_path}) {
      if (!['completed', 'failed'].includes(p_outcome)) throw Error('INVALID_OUTCOME');
      const res = db.reservations.find(r => r.job_id === p_job && r.user_id === p_user);
      if (!res) throw Error('RESERVATION_NOT_FOUND');
      if (res.status !== 'reserved') return {job_id: p_job, status: res.status};
      const job = db.jobs.find(j => j.id === p_job && j.user_id === p_user && ['queued', 'processing'].includes(j.status));
      if (p_outcome === 'completed') {
        if (p_output_path !== `${p_user}/${p_job}.mp4`) throw Error('INVALID_OUTPUT');
        if (!job) throw Error('INVALID_JOB_STATE');
        job.status = 'completed'; job.output_path = p_output_path; res.status = 'settled';
      } else {
        if (!job) throw Error('INVALID_JOB_STATE');
        job.status = 'failed';
        db.accounts.set(p_user, db.accounts.get(p_user) + res.credits); res.status = 'refunded';
      }
      return {job_id: p_job, status: p_outcome === 'failed' ? 'refunded' : 'settled'};
    },
  };

  function query(table) {
    const rows = table === 'studio_generation_jobs' ? db.jobs : table === 'k4k_generation_reservations' ? db.reservations
      : [...db.accounts].map(([user_id, balance]) => ({user_id, balance}));
    const state = {filters: [], update: null, head: false, selected: false};
    const matches = () => rows.filter(row => state.filters.every(f => f(row)));
    const run = () => {
      const hit = matches();
      if (state.update) for (const row of hit) Object.assign(row, state.update);
      return hit;
    };
    const api = {
      select(_columns, options) { state.selected = true; if (options?.head) state.head = true; return api; },
      update(values) { state.update = values; return api; },
      eq(column, value) { state.filters.push(row => row[column] === value); return api; },
      in(column, values) { state.filters.push(row => values.includes(row[column])); return api; },
      is(column, value) { state.filters.push(row => row[column] === value); return api; },
      async maybeSingle() { const hit = run(); return {data: hit[0] ? {...hit[0]} : null, error: null}; },
      then(resolve, reject) { const hit = run(); return Promise.resolve(state.head ? {count: hit.length, error: null} : {data: hit.map(r => ({...r})), error: null}).then(resolve, reject); },
    };
    return api;
  }

  const admin = {
    from: query,
    async rpc(name, args) {
      calls.rpc.push(name);
      try { return {data: rpcs[name](args), error: null}; } catch (error) { return {data: null, error: {message: error.message}}; }
    },
    storage: {from: bucket => ({
      async download(path) { const o = objects.get(bucket + '/' + path); return o ? {data: new Blob([o.bytes], {type: o.contentType}), error: null} : {data: null, error: {message: 'not found'}}; },
      async createSignedUrl(path, ttl) { calls.signed.push({bucket, path, ttl}); return {data: {signedUrl: `https://project.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=t${calls.signed.length}`}, error: null}; },
      async upload(path, bytes, options) {
        calls.uploads.push(bucket + '/' + path);
        if (objects.has(bucket + '/' + path) && !options?.upsert) return {error: {message: 'The resource already exists'}};
        objects.set(bucket + '/' + path, {bytes, contentType: options?.contentType}); return {data: {path}, error: null};
      },
      async info(path) { const o = objects.get(bucket + '/' + path); return o ? {data: {size: o.bytes.byteLength, contentType: o.contentType}, error: null} : {data: null, error: {message: 'not found'}}; },
    })},
  };

  return {admin, db, objects, calls, addDraft,
    job: id => db.jobs.find(j => j.id === id), reservation: id => db.reservations.find(r => r.job_id === id), balance: (user = USER) => db.accounts.get(user)};
}

// A scripted Higgsfield API. `script` controls each documented endpoint.
export function createFakeProvider({estimateUsd = '0.42', submit = {status: 200}, statuses = ['in_progress'], outputUrl = 'https://cdn.provider.test/out/video.mp4',
  outputType = 'video/mp4', outputBytes = mp4(6, 4096), requestId = 'req_abc123'} = {}) {
  const log = [];
  const json = (status, body) => ({ok: status >= 200 && status < 300, status, json: async () => body});
  let statusIndex = 0;
  async function fetchImpl(url, init = {}) {
    const u = new URL(url);
    log.push({url, method: init.method, headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : null, redirect: init.redirect});
    if (u.origin === 'https://api.higgsfield.ai') {
      if (u.pathname.startsWith('/estimate/')) return estimateUsd === null ? json(500, {detail: 'error'}) : json(200, {usd: estimateUsd});
      if (u.pathname.startsWith('/requests/')) {
        const state = statuses[Math.min(statusIndex++, statuses.length - 1)];
        if (state === 'http_500') return json(500, {detail: 'error'});
        return json(200, {status: state, request_id: state === 'mismatch' ? 'someone_else' : requestId, ...(state === 'completed' ? {video: {url: outputUrl}} : {}), ...(state === 'failed' || state === 'nsfw' ? {error: 'internal detail'} : {})});
      }
      if (init.method === 'POST') {
        if (submit.throws) throw new Error('socket hang up');
        if (submit.status !== 200) return json(submit.status, {detail: submit.detail ?? 'rejected'});
        return json(200, {status: 'queued', request_id: requestId, status_url: `https://api.higgsfield.ai/requests/${requestId}/status`, cancel_url: `https://api.higgsfield.ai/requests/${requestId}/cancel`});
      }
    }
    if (url === outputUrl) {
      const bytes = outputBytes;
      return {ok: true, status: 200, headers: new Headers({'content-type': outputType, 'content-length': String(bytes.byteLength)}),
        body: new Blob([bytes]).stream()};
    }
    throw new Error('Unexpected request to ' + u.origin);
  }
  const count = predicate => log.filter(predicate).length;
  return {fetchImpl, log,
    submissions: () => count(c => c.method === 'POST' && new URL(c.url).pathname.includes('/motion-transfer/') && !new URL(c.url).pathname.startsWith('/estimate/')),
    estimates: () => count(c => new URL(c.url).pathname.startsWith('/estimate/')),
    statusChecks: () => count(c => new URL(c.url).pathname.startsWith('/requests/')),
    downloads: () => count(c => c.url === outputUrl)};
}

export const READY_ENV = Object.freeze({
  VERCEL_ENV: 'preview',
  K4K_GENERATION_SUBMISSION_ENABLED: 'true',
  HF_CREDENTIALS: CREDENTIAL,
  K4K_CUSTOMER_CREDIT_PRICING_APPROVED: 'true',
  K4K_GENERATION_CREDITS_PER_SECOND: JSON.stringify({lite: {'720p': 2}, pro: {'720p': 5, '1080p': 9}}),
  K4K_GENERATION_MAX_PROVIDER_USD: '5',
  K4K_HIGGSFIELD_OUTPUT_HOSTS: 'cdn.provider.test',
  K4K_GENERATION_TEST_USERS: USER,
});
