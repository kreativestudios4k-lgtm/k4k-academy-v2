// Server-only, fail-closed quote builder. This does NOT charge credits or call a provider.
// Never accept model cost, credits, FX, or configuration from browser input.
const MODEL_ID=/^[a-z0-9][a-z0-9_-]{1,63}$/;
const MAX_SAFE_CREDITS=100000;
export function quoteGeneration({modelId,durationSeconds,resolution},catalog,{pencePerCredit=1.4}={}) {
  if (typeof window!=='undefined') throw new Error('Server only');
  if(typeof modelId!=='string'||!MODEL_ID.test(modelId)) throw new Error('Invalid model');
  if(!Number.isInteger(durationSeconds)||durationSeconds<1||durationSeconds>60) throw new Error('Invalid duration');
  if(typeof resolution!=='string'||!['720p','1080p'].includes(resolution))throw new Error('Invalid resolution');
  if(!Number.isFinite(pencePerCredit)||pencePerCredit<=0||pencePerCredit>1.4)throw new Error('Invalid cost ceiling');
  const model=catalog?.[modelId];
  if(!model||model.verified!==true||model.currency!=='GBP'||model.enabled!==true)throw new Error('Model pricing unavailable');
  if(!Array.isArray(model.durations)||!model.durations.includes(durationSeconds)||!Array.isArray(model.resolutions)||!model.resolutions.includes(resolution))throw new Error('Unsupported generation option');
  // Prices MUST include provider request, retries/failure allowance, FX and expected output/storage costs.
  const cost=model.maxAllInCostPence?.[resolution]?.[String(durationSeconds)];
  if(!Number.isSafeInteger(cost)||cost<=0||cost>1000000)throw new Error('Unverified model cost');
  const credits=Math.ceil(cost/pencePerCredit);
  if(!Number.isSafeInteger(credits)||credits<1||credits>MAX_SAFE_CREDITS)throw new Error('Quote exceeds limits');
  return Object.freeze({modelId,durationSeconds,resolution,credits,currency:'GBP',estimatedProviderCostPence:cost,quoteVersion:model.quoteVersion});
}
// Explicitly disabled until approved model prices have been verified.
// The catalog must be loaded from protected server configuration, not from request JSON.
export const DISABLED_MODEL_CATALOG=Object.freeze({});
