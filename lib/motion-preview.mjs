// Pure client-side preview validation; no upload, GPU rental, or API invocation.
export const MOTION_MODES = Object.freeze(['replace', 'animate']);
export const ALLOWED_VIDEO_TYPES = Object.freeze(['video/mp4', 'video/webm', 'video/quicktime']);
export const ALLOWED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

export function inspectMotionInputs({video, image, durationSeconds, mode, prompt = ''}) {
  const errors = [];
  if (!video || !ALLOWED_VIDEO_TYPES.includes(video.type) || video.size <= 0 || video.size > 60 * 1024 * 1024) {
    errors.push('Choose an MP4, WebM, or MOV video under 60 MB.');
  }
  if (!image || !ALLOWED_IMAGE_TYPES.includes(image.type) || image.size <= 0 || image.size > 15 * 1024 * 1024) {
    errors.push('Choose a JPG, PNG, or WebP character image under 15 MB.');
  }
  // The alpha intentionally targets short clips for cost/quality benchmarking.
  if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 10) {
    errors.push('Use a reference clip between 2 and 10 seconds for this alpha.');
  }
  if (!MOTION_MODES.includes(mode)) errors.push('Choose a supported motion mode.');
  if (typeof prompt !== 'string' || prompt.length > 1200) errors.push('Prompt must be under 1,200 characters.');
  if (errors.length) return {ok:false, errors};
  return {
    ok:true,
    errors:[],
    manifest:{
      version:'k4k-wan-alpha-1',
      engine:'Wan2.2-Animate-14B',
      mode,
      clipDurationSeconds:Math.round(durationSeconds * 100) / 100,
      inputVideo:{type:video.type,bytes:video.size},
      characterImage:{type:image.type,bytes:image.size},
      prompt:prompt.trim(),
      execution:'dry-run-only',
      estimatedChargeGbpPence:0,
      requiresGpuForRendering:true,
    },
  };
}
