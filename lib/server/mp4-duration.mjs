// Strict ISO-BMFF mvhd duration parser; never trust browser-provided duration.
// Reject fragmented/unknown-duration MP4s until a full media probe is available.
function u32(v,p){return v.getUint32(p,false)}
function boxes(v,start,end){const out=[];let p=start;while(p+8<=end){let n=u32(v,p),h=8;if(n===1){if(p+16>end)throw Error('INVALID_MP4');const hi=u32(v,p+8),lo=u32(v,p+12);if(hi!==0)throw Error('MP4_TOO_LARGE');n=lo;h=16;}else if(n===0)n=end-p;if(n<h||p+n>end)throw Error('INVALID_MP4');out.push({type:String.fromCharCode(...new Uint8Array(v.buffer,v.byteOffset+p+4,4)),start:p+h,end:p+n});p+=n;}if(p!==end)throw Error('INVALID_MP4');return out;}
export function mp4DurationSeconds(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const top=boxes(v,0,v.byteLength);if(!top.some(b=>b.type==='ftyp'))throw Error('INVALID_MP4');
 const moov=top.find(b=>b.type==='moov');if(!moov)throw Error('MISSING_MOOV');
 const mvhd=boxes(v,moov.start,moov.end).find(b=>b.type==='mvhd');if(!mvhd)throw Error('MISSING_MVHD');
 const p=mvhd.start,version=v.getUint8(p);let timescale,duration;
 if(version===0){if(p+20>mvhd.end)throw Error('INVALID_MVHD');timescale=u32(v,p+12);duration=u32(v,p+16);}
 else if(version===1){if(p+32>mvhd.end)throw Error('INVALID_MVHD');timescale=u32(v,p+20);const hi=u32(v,p+24),lo=u32(v,p+28);duration=hi*4294967296+lo;}
 else throw Error('INVALID_MVHD');
 if(!timescale||!Number.isSafeInteger(duration)||duration===0||duration===4294967295||duration===18446744073709551615)throw Error('UNKNOWN_DURATION');
 const seconds=duration/timescale;if(!Number.isFinite(seconds)||seconds<0.1||seconds>3600)throw Error('INVALID_DURATION');
 return seconds;
}
