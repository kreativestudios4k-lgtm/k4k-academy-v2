export type MotionSettings={identityPriority:100;motionPriority:100;preserveCamera:true;strategy:"balanced"};
export const MOTION_DEFAULTS:MotionSettings={identityPriority:100,motionPriority:100,preserveCamera:true,strategy:"balanced"};
export type MotionAnalysis={file:{name:string;sizeBytes:number;type:string;durationSeconds:number|null;width:number|null;height:number|null;fps:number|null};references:{count:number;names:string[]};settings:MotionSettings;warnings:string[];checks:{name:string;status:"pending"|"pass"|"warning";detail:string}[];route:{provider:string;model:string;reason:string;ready:boolean;requires:string[]};estimatedBillableCredits:null;generationEnabled:false};
export function assessMotion(input:{video:{name:string;sizeBytes:number;type:string;durationSeconds:number|null;width:number|null;height:number|null;fps:number|null};images:{name:string}[]}):MotionAnalysis{
 const warnings:string[]=[];
 if(!input.video.type.startsWith("video/"))warnings.push("The selected source may not be a supported video.");
 if(input.video.sizeBytes>100*1024*1024)warnings.push("Source exceeds the preview 100 MB planning limit.");
 if(input.video.durationSeconds===null)warnings.push("Duration could not be determined; inspect the source before generation.");
 else if(input.video.durationSeconds>30)warnings.push("Long source: plan shorter segments before generation.");
 if(input.images.length===0)warnings.push("Add at least one character reference to evaluate identity consistency.");
 if(input.images.length===1)warnings.push("One character reference may be insufficient for varied angles; 3–5 views are recommended.");
 const checks:MotionAnalysis["checks"]=[
 {name:"Reference video metadata",status:input.video.durationSeconds!==null?"pass":"warning",detail:"Browser-derived duration, resolution and frame rate (if available); no frame or pose analysis yet."},
 {name:"Character reference coverage",status:input.images.length>=3?"pass":"warning",detail:`${input.images.length} reference image(s). Face and body similarity require a separate vision analysis.`},
 {name:"Pose / motion trajectory",status:"pending",detail:"Requires frame extraction and pose estimation; 100% priority is a preference, not an accuracy guarantee."},
 {name:"Camera movement preservation",status:"pending",detail:"Requires optical-flow or camera-motion extraction; preservation is requested but unverified."},
 {name:"Temporal identity consistency",status:"pending",detail:"Requires generated video to measure face drift and frame flicker."},
 {name:"Output quality",status:"pending",detail:"No billable generation is performed in this preview."}
 ];
 return {file:input.video,references:{count:input.images.length,names:input.images.map(x=>x.name)},settings:MOTION_DEFAULTS,warnings,checks,route:{provider:"Higgsfield API (candidate)",model:"motion-control-capable model — selection pending verification",reason:"Balanced strategy prioritizes reference video, character identity and camera motion. Exact provider model support must be confirmed before routing.",ready:false,requires:["Verified video-driving model capability","Model-specific media role mapping","Provider price quote","Explicit billable-generation approval"]},estimatedBillableCredits:null,generationEnabled:false};
}
