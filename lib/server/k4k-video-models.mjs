// Preview-only routing contract. This file does not call any provider.
export const K4K_VIDEO_MODELS = Object.freeze({
  'Motion Pro': Object.freeze({provider:'higgsfield',adapter:'genjutsu',minimumSeconds:3,maximumSeconds:30,durationVerified:false}),
  'Motion Lite': Object.freeze({provider:'wan',adapter:'wan3_0_prime',minimumSeconds:3,maximumSeconds:30,durationVerified:true})
});
export function validateVideoPreviewSelection({model,duration}) {
  const config=K4K_VIDEO_MODELS[model];
  if (!config) return {valid:false,reason:'UNKNOWN_MODEL'};
  if (!Number.isInteger(duration) || duration<config.minimumSeconds || duration>config.maximumSeconds)
    return {valid:false,reason:'INVALID_DURATION'};
  if (!config.durationVerified) return {valid:false,reason:'PROVIDER_DURATION_NOT_VERIFIED'};
  return {valid:true,provider:config.provider,adapter:config.adapter,duration};
}
// Never invoke paid provider jobs from this preview-only contract.
