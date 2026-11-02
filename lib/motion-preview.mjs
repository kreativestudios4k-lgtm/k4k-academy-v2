// Pure client-side preview validation; no upload, GPU rental, or API invocation.
export const MOTION_MODES = Object.freeze(['replace', 'animate']);
export const MOTION_ENGINES = Object.freeze({
 wan:{label:'K4K Motion · Wan 2.2 Animate',model:'Wan2.2-Animate-14B',kind:'open-source',maxSeconds:10},
 light:{label:'Genjutsu Light',model:'higgsfield/genjutsu-light/motion-transfer/v1.0',kind:'external-paid-api',maxSeconds:10},
 pro:{label:'Genjutsu Pro',model:'higgsfield/genjutsu/motion-transfer/v1.0',kind:'external-paid-api',maxSeconds:10},
});
export const ALLOWED_VIDEO_TYPES = Object.freeze(['video/mp4', 'video/webm', 'video/quicktime']);
export const ALLOWED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

// Indicative undiscounted list-price estimates only; NOT a billable quote.
// Genjutsu Light at 720p charges output seconds + reference-video seconds.
export function estimateProviderUsdMills(engine, durationSeconds) {
 if (!(engine in MOTION_ENGINES)) throw new Error('Unsupported engine');
 if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 10) throw new Error('Invalid preview duration');
 if (engine==='wan') return null; // GPU rental price unknown, never claim free inference.
 const seconds=Math.ceil(durationSeconds);
 return engine==='light' ? seconds*2*100 : seconds*681;
}
export function inspectMotionInputs({video, image, durationSeconds, mode, engine='wan', prompt = ''}) {
  const errors = [];
  if (!video || !ALLOWED_VIDEO_TYPES.includes(video.type) || video.size <= 0 || video.size > 60 * 1024 * 1024) {
    errors.push('Choose an MP4, WebM, or MOV video under 60 MB.');
  }
  if (!image || !ALLOWED_IMAGE_TYPES.includes(image.type) || image.size <= 0 || image.size > 15 * 1024 * 1024) {
    errors.push('Choose a JPG, PNG, or WebP character image under 15 MB.');
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 10) {
    errors.push('Use a reference clip between 2 and 10 seconds for this alpha.');
  }
  if (!MOTION_MODES.includes(mode)) errors.push('Choose a supported motion mode.');
  if (!Object.hasOwn(MOTION_ENGINES,engine)) errors.push('Choose a supported engine.');
  if (typeof prompt !== 'string' || prompt.length > 1200) errors.push('Prompt must be under 1,200 characters.');
  if (errors.length) return {ok:false, errors};
  return {
    ok:true,
    errors:[],
    manifest:{
      version:'k4k-motion-alpha-2',
      engine:MOTION_ENGINES[engine].model,
      engineKey:engine,
      mode,
      clipDurationSeconds:Math.round(durationSeconds * 100) / 100,
      inputVideo:{type:video.type,bytes:video.size},
      characterImage:{type:image.type,bytes:image.size},
      prompt:prompt.trim(),
      execution:'dry-run-only',
      estimatedChargeGbpPence:0,
      estimatedProviderUsdMills:estimateProviderUsdMills(engine,durationSeconds),
      requiresGpuForRendering:engine==='wan',
      requiresProviderPayment:engine!=='wan',
    },
  };
}
