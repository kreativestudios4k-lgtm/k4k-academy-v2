// Validate client-provided storage references before any privileged signing or
// generation request. This only validates identifiers; callers MUST verify the
// object exists in an owned storage bucket and inspect actual media bytes.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_FILE=/^[a-zA-Z0-9_-]{8,100}\.(?:png|jpg|jpeg|webp|mp4)$/i;
export function ownedMediaPath(userId, path, kind) {
 if(!UUID.test(userId)||typeof path!=='string'||path.length>250||path.includes('%')||path.includes('\\'))throw new Error('Invalid media reference');
 const segments=path.split('/');
 if(segments.length!==3||segments[0]!==userId||!UUID.test(segments[1])||!SAFE_FILE.test(segments[2]))throw new Error('Media ownership not established');
 const ext=segments[2].split('.').pop().toLowerCase();
 if(kind==='image' && !['jpg','jpeg','png','webp'].includes(ext))throw new Error('Expected image reference');
 if(kind==='video' && ext!=='mp4')throw new Error('Expected video reference');
 if(!['image','video'].includes(kind))throw new Error('Invalid media type');
 return {bucket:kind==='image'?'k4k-generation-inputs':'k4k-generation-inputs',path};
}
export function validateReferenceList(userId,paths){
 if(!Array.isArray(paths)||paths.length<1||paths.length>8||new Set(paths).size!==paths.length)throw new Error('Provide 1–8 distinct owned images');
 return paths.map(path=>ownedMediaPath(userId,path,'image'));
}
