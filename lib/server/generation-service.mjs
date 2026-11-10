// Server-only orchestration of one customer generation, start to finish.
//
//   submit : owned draft -> trusted media inspection -> server price ->
//            provider estimate under the spend cap -> atomic credit reservation
//            -> exactly one provider submission -> durable provider ID
//   refresh: authenticated provider status -> bounded download -> private
//            storage -> settle once, or refund once on a verified failure
//
// The caller MUST pass a userId taken from a verified session and a
// service-role Supabase client. Nothing here trusts browser-supplied prices,
// durations, media URLs or provider IDs. Ambiguous submissions keep their
// reservation: they are never refunded or resubmitted automatically.
import {createGenerationPipeline} from './generation-pipeline.mjs';
import {createGuardedGenerationLedger} from './guarded-generation-ledger.mjs';
import {createGenerationJobStore} from './generation-job-store.mjs';
import {createGenerationSubmissionRecorder} from './generation-submission-record.mjs';
import {createGenerationOutputIngestor} from './generation-output-ingestion.mjs';
import {createGenerationOutputVerifier} from './generation-output-verifier.mjs';
import {verifyStudioMedia} from './studio-media-verification.mjs';
import {priceGenerationCredits} from './generation-credit-pricing.mjs';
import {MOTION_MODELS, buildMotionPayload} from './higgsfield-motion-client.mjs';
import {createApprovedOutputDownloader, OutputDownloadError} from './generation-output-download.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESOLUTIONS = ['480p', '720p', '1080p'];
const JOBS = 'studio_generation_jobs';
const OUTPUT_BUCKET = 'studio-generations';
const FAILURE_MESSAGES = Object.freeze({
  failed: 'The video could not be generated. Your credits were returned.',
  nsfw: 'The request was declined by content moderation. Your credits were returned.',
  canceled: 'The request was cancelled before it started. Your credits were returned.',
  rejected: 'The video service did not accept this request. Your credits were returned.',
});

export class GenerationError extends Error {
  constructor(code, status, extra = {}) {
    super(code);
    this.name = 'GenerationError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export function createGenerationService({admin, providerClient, config, fetchImpl = globalThis.fetch, log = () => {}} = {}) {
  if (typeof window !== 'undefined') throw new Error('Server only');
  if (!admin?.from || !admin?.rpc || !admin?.storage?.from) throw new GenerationError('STORAGE_NOT_CONFIGURED', 503);
  if (!config) throw new GenerationError('GENERATION_CONFIG_MISSING', 503);

  const ledger = createGuardedGenerationLedger(admin, {enabled: true});
  const jobStore = createGenerationJobStore({client: admin, enabled: true});
  const recorder = createGenerationSubmissionRecorder({client: admin, enabled: true});
  const ingest = createGenerationOutputIngestor({storage: admin.storage, enabled: true, bucket: OUTPUT_BUCKET});
  const verifyOutput = createGenerationOutputVerifier({storage: admin.storage, enabled: true, bucket: OUTPUT_BUCKET});
  const download = createApprovedOutputDownloader({fetchImpl, allowedHosts: config.outputHosts});

  async function loadJob(userId, jobId) {
    const {data, error} = await admin.from(JOBS)
      .select('id,user_id,status,model,reference_paths,reference_video_path,prompt,credits_reserved,provider_job_id')
      .eq('id', jobId).eq('user_id', userId).maybeSingle();
    if (error) throw new GenerationError('UNAVAILABLE', 503);
    if (!data || data.user_id !== userId || data.id !== jobId) throw new GenerationError('JOB_NOT_FOUND', 404);
    return data;
  }

  // Inspects the stored objects themselves: ownership, type, size and real MP4 duration.
  async function inspect(userId, job, resolution) {
    if (!RESOLUTIONS.includes(resolution)) throw new GenerationError('INVALID_RESOLUTION', 400);
    const model = Object.hasOwn(MOTION_MODELS, job.model) ? MOTION_MODELS[job.model] : null;
    if (!model) throw new GenerationError('UNSUPPORTED_MODEL', 422);
    let verified;
    try {
      verified = await verifyStudioMedia({client: admin, userId, referencePaths: job.reference_paths, videoPath: job.reference_video_path});
    } catch { throw new GenerationError('MEDIA_VERIFICATION_FAILED', 422); }
    const seconds = verified.durationSeconds;
    if (!Number.isFinite(seconds) || seconds < model.minSeconds || seconds > model.maxSeconds) {
      throw new GenerationError('MODEL_DURATION_OUT_OF_RANGE', 422, {durationSeconds: seconds, minSeconds: model.minSeconds, maxSeconds: model.maxSeconds});
    }
    if (!config.pricing.approved) throw new GenerationError('GENERATION_BLOCKED', 503, {blockers: [config.pricing.reason]});
    let credits;
    try { credits = priceGenerationCredits({table: config.pricing.table, tier: job.model, resolution, durationSeconds: seconds}); }
    catch (error) { throw new GenerationError(error.message === 'GENERATION_OPTION_NOT_PRICED' ? 'GENERATION_OPTION_NOT_PRICED' : 'CREDIT_PRICE_UNAVAILABLE', 422); }
    return {durationSeconds: seconds, images: verified.images, credits, model};
  }

  async function balanceOf(userId) {
    const {data, error} = await admin.from('studio_credit_accounts').select('balance').eq('user_id', userId).maybeSingle();
    if (error) throw new GenerationError('CREDIT_ACCOUNT_UNAVAILABLE', 503);
    return data?.balance ?? 0;
  }

  async function signedInputUrl(bucket, path) {
    const {data, error} = await admin.storage.from(bucket).createSignedUrl(path, config.inputUrlTtlSeconds);
    if (error || typeof data?.signedUrl !== 'string' || !data.signedUrl.startsWith('https://')) throw new GenerationError('MEDIA_LINK_UNAVAILABLE', 503);
    return data.signedUrl;
  }

  async function setFailureMessage(userId, jobId, message) {
    try { await admin.from(JOBS).update({error_message: message}).eq('id', jobId).eq('user_id', userId).eq('status', 'failed'); }
    catch { /* cosmetic only; the refund has already been recorded */ }
  }

  function requireIdentity(userId, jobId) {
    if (typeof userId !== 'string' || !UUID.test(userId)) throw new GenerationError('UNAUTHENTICATED', 401);
    if (typeof jobId !== 'string' || !UUID.test(jobId)) throw new GenerationError('INVALID_JOB_ID', 400);
  }

  return Object.freeze({
    // Read-only: the price the server would charge and whether the balance covers it.
    async price({userId, jobId, resolution = '720p'} = {}) {
      requireIdentity(userId, jobId);
      const job = await loadJob(userId, jobId);
      if (job.status !== 'draft') throw new GenerationError('JOB_NOT_DRAFT', 409);
      const {durationSeconds, images, credits} = await inspect(userId, job, resolution);
      const balance = await balanceOf(userId);
      return {jobId, model: job.model, resolution, durationSeconds, images, credits, balance, sufficient: balance >= credits};
    },

    async submit({userId, jobId, requestKey, resolution = '720p'} = {}) {
      requireIdentity(userId, jobId);
      if (typeof requestKey !== 'string' || !UUID.test(requestKey)) throw new GenerationError('INVALID_REQUEST_KEY', 400);
      if (config.blockers.length) throw new GenerationError('GENERATION_BLOCKED', 503, {blockers: [...config.blockers]});
      const denied = config.authorizeUser(userId);
      if (denied) throw new GenerationError('GENERATION_BLOCKED', 403, {blockers: [denied]});
      if (!providerClient?.submit || !providerClient?.estimate) throw new GenerationError('GENERATION_BLOCKED', 503, {blockers: ['PROVIDER_CREDENTIALS_MISSING']});

      const job = await loadJob(userId, jobId);
      if (job.status !== 'draft') {
        // A repeat of the same request returns the existing job. It never reserves or submits again.
        const {data: reservation, error} = await admin.from('k4k_generation_reservations')
          .select('job_id,credits').eq('user_id', userId).eq('request_key', requestKey).maybeSingle();
        if (error) throw new GenerationError('UNAVAILABLE', 503);
        if (reservation?.job_id === jobId) return {jobId, status: job.status, creditsReserved: reservation.credits, replayed: true};
        throw new GenerationError('JOB_NOT_DRAFT', 409);
      }

      const {durationSeconds, credits} = await inspect(userId, job, resolution);
      if (await balanceOf(userId) < credits) throw new GenerationError('INSUFFICIENT_CREDITS', 402, {credits});

      const {count, error: countError} = await admin.from(JOBS).select('id', {count: 'exact', head: true})
        .eq('user_id', userId).in('status', ['queued', 'processing']);
      if (countError) throw new GenerationError('UNAVAILABLE', 503);
      if ((count ?? 0) >= config.maxActiveJobs) throw new GenerationError('ACTIVE_JOB_LIMIT', 429, {limit: config.maxActiveJobs});

      // Short-lived links to the customer's own private files, created on the server.
      const videoUrl = await signedInputUrl('studio-videos', job.reference_video_path);
      const imageUrls = [];
      for (const path of job.reference_paths) imageUrls.push(await signedInputUrl('studio-references', path));
      let payload;
      try { payload = buildMotionPayload({videoUrl, imageUrls, prompt: job.prompt ?? '', resolution}); }
      catch { throw new GenerationError('INVALID_GENERATION_INPUT', 422); }

      // The provider's own estimate for this account is the only trusted cost. Nothing is reserved yet.
      let estimate;
      try { estimate = await providerClient.estimate(job.model, payload); }
      catch (error) { throw new GenerationError('PROVIDER_ESTIMATE_UNAVAILABLE', 502, {providerHttpStatus: error?.httpStatus ?? null}); }
      if (estimate.usd > config.maxProviderUsd) throw new GenerationError('PROVIDER_COST_EXCEEDS_CAP', 409);

      let acceptedId = null;
      const pipeline = createGenerationPipeline({
        database: admin, storage: admin.storage, jobStore, enabled: true, providerEnabled: true, bucket: OUTPUT_BUCKET,
        priceCredits: () => credits,
        provider: {submit: async (tier, input) => { const result = await providerClient.submit(tier, input, jobId); acceptedId = result.request_id; return result; }},
      });

      try {
        const result = await pipeline.submit({userId, jobId, requestKey, tier: job.model, input: payload});
        return {jobId, status: 'processing', creditsReserved: result.creditsReserved, durationSeconds, replayed: false};
      } catch (error) {
        const code = error?.message;
        if (code === 'RESERVATION_NOT_NEW') {
          const current = await loadJob(userId, jobId);
          return {jobId, status: current.status, creditsReserved: current.credits_reserved, replayed: true};
        }
        if (code === 'INSUFFICIENT_CREDITS') throw new GenerationError(code, 402, {credits});
        if (code === 'JOB_NOT_DRAFT' || code === 'IDEMPOTENCY_CONFLICT') throw new GenerationError(code, 409);
        if (code === 'INVALID_JOB') throw new GenerationError('INVALID_GENERATION_INPUT', 422);
        if (code === 'PROVIDER_REJECTED') {
          // The provider refused the request outright, so no generation exists. Return the credits once.
          let refunded = false;
          try { const outcome = await ledger.finish(userId, jobId, 'failed', null); refunded = outcome?.status === 'refunded'; }
          catch { log('generation.refund_failed', {jobId}); }
          if (refunded) await setFailureMessage(userId, jobId, FAILURE_MESSAGES.rejected);
          throw new GenerationError('PROVIDER_REJECTED', 502, {refunded, needsReview: !refunded, providerHttpStatus: error.httpStatus ?? null});
        }
        if (code === 'PROVIDER_RECORDING_REQUIRES_RECONCILIATION' && acceptedId) {
          // The provider accepted the job but the ID was not saved. Try once more, then leave it for review.
          try { await recorder.record({userId, jobId, providerJobId: acceptedId}); return {jobId, status: 'processing', creditsReserved: credits, durationSeconds, replayed: false}; }
          catch { log('generation.provider_id_unrecorded', {jobId, providerJobId: acceptedId}); }
        }
        if (code === 'PROVIDER_SUBMISSION_UNCERTAIN' || code === 'PROVIDER_RECORDING_REQUIRES_RECONCILIATION') {
          // Unknown outcome: the provider may be generating. Credits stay reserved until a person reviews it.
          log('generation.submission_uncertain', {jobId});
          return {jobId, status: 'queued', creditsReserved: credits, durationSeconds, replayed: false, needsReview: true};
        }
        log('generation.submit_failed', {jobId, code: typeof code === 'string' ? code.slice(0, 64) : 'UNKNOWN'});
        throw new GenerationError('UNAVAILABLE', 503);
      }
    },

    // Safe to call repeatedly and concurrently: settlement and refund are once-only in the database.
    async refresh({userId, jobId} = {}) {
      requireIdentity(userId, jobId);
      let job;
      try { job = await jobStore.getOwnedJob(userId, jobId); } catch { throw new GenerationError('UNAVAILABLE', 503); }
      if (!job) throw new GenerationError('JOB_NOT_FOUND', 404);
      if (!['queued', 'processing'].includes(job.status)) return {state: 'unchanged'};
      if (!job.provider_job_id) return {state: 'awaiting_review'};
      if (!providerClient?.status) return {state: 'blocked', blocked: 'PROVIDER_CREDENTIALS_MISSING'};

      let status;
      try { status = await providerClient.status(job.provider_job_id); }
      catch (error) { return {state: 'provider_unavailable', providerHttpStatus: error?.httpStatus ?? null}; }
      if (status.status === 'queued' || status.status === 'processing') return {state: 'pending'};

      const pipeline = createGenerationPipeline({database: admin, storage: admin.storage, jobStore, enabled: true, bucket: OUTPUT_BUCKET});
      const settle = async args => {
        try { return await pipeline.complete(args); }
        catch (error) {
          // Another request finished this job first. That is success, not an error.
          if (error?.message === 'INVALID_JOB_STATE') return {status: 'already_finished'};
          throw error;
        }
      };

      if (status.status === 'failed') {
        // Verified terminal failure from the provider (failed, nsfw or canceled): the provider does not charge, so refund.
        try { await settle({userId, jobId, providerJobId: job.provider_job_id, outcome: 'failed', outputPath: null}); }
        catch { log('generation.refund_failed', {jobId}); return {state: 'awaiting_review'}; }
        await setFailureMessage(userId, jobId, FAILURE_MESSAGES[status.providerStatus] ?? FAILURE_MESSAGES.failed);
        return {state: 'refunded'};
      }

      const outputPath = userId + '/' + jobId + '.mp4';
      let stored = false;
      try { stored = await verifyOutput({userId, jobId, outputPath}) === true; } catch { stored = false; }
      if (!stored) {
        let bytes;
        try { bytes = await download(status.videoUrl); }
        catch (error) {
          const code = error instanceof OutputDownloadError ? error.code : 'OUTPUT_DOWNLOAD_FAILED';
          // Hostname only. It is needed to approve the provider's delivery host.
          log('generation.output_blocked', {jobId, code, host: error?.host ?? null});
          return {state: 'blocked', blocked: code};
        }
        try { await ingest({userId, jobId, providerJobId: job.provider_job_id, bytes, contentType: 'video/mp4'}); }
        catch (error) {
          // A concurrent refresh may have stored the same file a moment ago.
          let present = false;
          try { present = await verifyOutput({userId, jobId, outputPath}) === true; } catch { present = false; }
          if (!present) { log('generation.output_store_failed', {jobId, code: error?.message}); return {state: 'blocked', blocked: 'OUTPUT_STORAGE_FAILED'}; }
        }
      }
      try { await settle({userId, jobId, providerJobId: job.provider_job_id, outcome: 'completed', outputPath}); }
      catch (error) { log('generation.settle_failed', {jobId, code: error?.message}); return {state: 'blocked', blocked: 'SETTLEMENT_FAILED'}; }
      return {state: 'completed'};
    },
  });
}
