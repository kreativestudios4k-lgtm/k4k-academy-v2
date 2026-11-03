import {verifyOwnedMediaObject} from './generation-media-storage.mjs';

// Preview-only fail-closed image inspection. Do not use metadata alone to
// authorize signing an image for an external provider.
export function matchesImageSignature(bytes,mime) {
 if (!(bytes instanceof Uint8Array)) return false;
 const has=(offset,seq)=>bytes.length>=offset+seq.length && seq.every((b,i)=>bytes[offset+i]===b);
 if(mime==='image/jpeg') return has(0,[0xff,0xd8,0xff]);
 if(mime==='image/png') return has(0,[137,80,78,71,13,10,26,10]);
 if(mime==='image/webp') return has(0,[82,73,70,70])&&has(8,[87,69,66,80])&&bytes.length>=12;
 return false;
}

export async function verifyOwnedImageBytes(storage,userId,path) {
 const verified=await verifyOwnedMediaObject(storage,userId,path,'image');
 const bucket=storage.from(verified.bucket);
 if(!bucket || typeof bucket.download!=='function')throw new Error('Image inspection unavailable');
 let result;
 try {result=await bucket.download(verified.path);}
 catch {throw new Error('Image download failed');}
 if(!result || result.error || !result.data || typeof result.data.arrayBuffer!=='function')
   throw new Error('Image download failed');
 let bytes;
 try {bytes=new Uint8Array(await result.data.arrayBuffer());}
 catch {throw new Error('Image inspection failed');}
 // Metadata is untrusted: enforce actual size independently.
 if(bytes.length!==verified.bytes || bytes.length===0 || bytes.length>15*1024*1024)
   throw new Error('Image size mismatch');
 if(!matchesImageSignature(bytes,verified.mime))throw new Error('Image content does not match type');
 return Object.freeze({...verified,signatureChecked:true});
}

// Signature matching is not full image decoding or malware detection.
// Before activation also decode images, enforce pixel limits, sanitize
// metadata, verify upload authorization and validate video containers.
