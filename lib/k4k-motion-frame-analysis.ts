export type MotionFrameReport={sampleCount:number;sampleTimesSeconds:number[];meanFrameChangePercent:number;peakFrameChangePercent:number;sceneChangeCandidates:number;motionLevel:"low"|"moderate"|"high";note:string};
export async function analyzeLocalVideoFrames(file:File,maxSamples=12):Promise<MotionFrameReport>{
 const url=URL.createObjectURL(file),video=document.createElement("video");
 video.muted=true;video.preload="auto";video.playsInline=true;video.src=url;
 try{
  await new Promise<void>((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(new Error("Cannot decode this video in your browser."));video.load()});
  const duration=video.duration;if(!Number.isFinite(duration)||duration<=0)throw new Error("Video duration unavailable.");
  const canvas=document.createElement("canvas");canvas.width=96;canvas.height=54;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas analysis is unavailable.");
  const count=Math.min(maxSamples,Math.max(2,Math.ceil(duration/1.5)));
  const times=Array.from({length:count},(_,i)=>Math.min(duration-0.01,(duration-.02)*i/(count-1)));
  let previous:Uint8ClampedArray|null=null;const differences:number[]=[];
  for(const time of times){
   await new Promise<void>((resolve,reject)=>{video.onseeked=()=>resolve();video.onerror=()=>reject(new Error("Frame decoding failed."));video.currentTime=time});
   ctx.drawImage(video,0,0,canvas.width,canvas.height);
   const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   const gray=new Uint8ClampedArray(canvas.width*canvas.height);
   for(let i=0,j=0;i<data.length;i+=4,j++)gray[j]=Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2]);
   if(previous){let sum=0;for(let i=0;i<gray.length;i++)sum+=Math.abs(gray[i]-previous[i]);differences.push(100*sum/(255*gray.length))}
   previous=gray;
  }
  const mean=differences.reduce((a,b)=>a+b,0)/Math.max(1,differences.length);
  const peak=Math.max(0,...differences);
  return {sampleCount:count,sampleTimesSeconds:times.map(x=>Math.round(x*100)/100),meanFrameChangePercent:Math.round(mean*10)/10,peakFrameChangePercent:Math.round(peak*10)/10,sceneChangeCandidates:differences.filter(x=>x>25).length,motionLevel:mean>14?"high":mean>5?"moderate":"low",note:"Coarse sampled-frame visual change only. It mixes subject movement, camera motion, lighting and cuts; it is not pose tracking or a camera-preservation score."};
 }finally{video.pause();video.removeAttribute("src");video.load();URL.revokeObjectURL(url)}
}
