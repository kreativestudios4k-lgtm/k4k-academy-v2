// Shared product tiers and conservative estimates. No credentials or API calls.
export const FAL_MOTION_TIERS=Object.freeze({lite:Object.freeze({resolution:'720p',usdPerSecond:0.14}),pro:Object.freeze({resolution:'1080p',usdPerSecond:0.28})});
export function falMotionEstimate(tier,{resolution,sourceSeconds}={}){
 const config=Object.hasOwn(FAL_MOTION_TIERS,tier)?FAL_MOTION_TIERS[tier]:null;
 if(!config||resolution!==config.resolution)throw Error('INVALID_RESOLUTION');
 if(!Number.isFinite(sourceSeconds)||sourceSeconds<2||sourceSeconds>15)throw Error('REFERENCE_DURATION_OUT_OF_RANGE');
 const duration=Math.ceil(sourceSeconds);
 // fal Wan 3.0 Prime bills generated output seconds, not the reference clip.
 // Round the requested output duration up; use the published resolution-specific rate.
 return {usd:Math.round(duration*config.usdPerSecond*1000)/1000,duration};
}
