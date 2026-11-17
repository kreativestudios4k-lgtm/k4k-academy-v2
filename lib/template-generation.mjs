// Keep the established 15-second Fal/Wan contract as the default. Only
// explicitly selected Higgsfield Genjutsu Motion paths may request 30 seconds.
export function generationReference(item,{maxSeconds=15}={}){
 const ceiling=Number.isFinite(maxSeconds)&&maxSeconds>=2&&maxSeconds<=30?maxSeconds:15;
 const url=item?.generationVideoUrl||item?.videoUrl;
 const seconds=item?.generationDurationSeconds??item?.durationSeconds;
 return {url,seconds,supported:typeof url==='string'&&Number.isFinite(seconds)&&seconds>=2&&seconds<=ceiling,trimmed:!!item?.generationVideoUrl};
}
