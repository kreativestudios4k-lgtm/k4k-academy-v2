// Server-side storage identifier validation. This does not prove the object
// exists or verify its media bytes; callers must check both before billing.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTENSIONS={image:new Set(['png','jpg','jpeg','webp']),video:new Set(['mp4'])};
export function ownedMediaPath(userId,path,kind){
 if(!UUID.test(userId)||!Object.hasOwn(EXTENSIONS,kind)||typeof path!=='string'||path.length>250||path.includes('%')||path.includes('\\'))throw new Error('MEDIA_REFERENCE_INVALID');
 const segments=path.split('/');
 if(segments.length!==2||segments[0]!==userId||!UUID.test(segments[1].split('.')[0]))throw new Error('MEDIA_OWNERSHIP_INVALID');
 const parts=segments[1].split('.');
 if(parts.length!==2||!EXTENSIONS[kind].has(parts[1].toLowerCase()))throw new Error('MEDIA_TYPE_INVALID');
 return {bucket:kind==='image'?'studio-references':'studio-videos',path};
}
export function validateReferenceList(userId,paths){
 if(!Array.isArray(paths)||paths.length<1||paths.length>8||new Set(paths).size!==paths.length)throw new Error('MEDIA_REFERENCE_COUNT_INVALID');
 return paths.map(path=>ownedMediaPath(userId,path,'image'));
}
