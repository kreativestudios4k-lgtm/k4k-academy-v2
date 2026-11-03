// Preliminary MP4 container sniffing for preview uploads. This is NOT a codec,
// duration, malware, or complete file-integrity check. Do not authorize provider
// submission solely because this header passes.
const ASCII = bytes => String.fromCharCode(...bytes);
const ALLOWED_BRANDS = new Set(['isom','iso2','mp41','mp42','avc1','M4V ','dash','iso5','iso6']);
export function inspectMp4Header(bytes, declaredBytes) {
 if (!(bytes instanceof Uint8Array) || !Number.isSafeInteger(declaredBytes) || declaredBytes < 32 || declaredBytes > 250*1024*1024) throw new Error('Invalid video size');
 if (bytes.length < 24 || bytes.length > declaredBytes) throw new Error('Incomplete MP4 header');
 const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const size=view.getUint32(0,false);
 if (size===0 || size===1 || size<16 || size>declaredBytes || size>bytes.length || (size-16)%4!==0) throw new Error('Invalid ftyp box');
 if (ASCII(bytes.subarray(4,8))!=='ftyp') throw new Error('Not an MP4 file');
 const brand=ASCII(bytes.subarray(8,12));
 const compatible=[];
 for(let offset=16;offset<size;offset+=4) compatible.push(ASCII(bytes.subarray(offset,offset+4)));
 if (!ALLOWED_BRANDS.has(brand) && !compatible.some(b=>ALLOWED_BRANDS.has(b))) throw new Error('Unsupported MP4 brand');
 return Object.freeze({container:'mp4',majorBrand:brand,declaredBytes,headerChecked:true});
}
