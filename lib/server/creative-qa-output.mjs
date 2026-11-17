// Strict server-side validation for owner QA output. Never trust provider URL extensions or MIME headers.
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
export function verifiedCreativeMedia(bytes,mime){
 if(!Buffer.isBuffer(bytes)||bytes.length<24)throw Error('OUTPUT_BYTES_INVALID');
 if(mime==='video/mp4'){
  const type=bytes.toString('ascii',4,8);
  const brand=bytes.toString('ascii',8,12);
  const boxSize=bytes.readUInt32BE(0);
  if(type!=='ftyp'||boxSize<16||boxSize>bytes.length||!/^[\x20-\x7E]{4}$/.test(brand))throw Error('OUTPUT_SIGNATURE_INVALID');
 }else if(mime==='image/png'){
  if(!bytes.subarray(0,8).equals(PNG)||bytes.toString('ascii',12,16)!=='IHDR')throw Error('OUTPUT_SIGNATURE_INVALID');
 }else if(mime==='image/jpeg'){
  if(bytes[0]!==0xff||bytes[1]!==0xd8||bytes[bytes.length-2]!==0xff||bytes[bytes.length-1]!==0xd9)throw Error('OUTPUT_SIGNATURE_INVALID');
 }else throw Error('OUTPUT_MIME_UNSUPPORTED');
 return {mime,bytes:bytes.length};
}
export async function boundedCreativeDownload(response,{mime,maxBytes}){
 if(!response?.ok||!response.body?.getReader)throw Error('OUTPUT_FETCH_FAILED');
 if(!Number.isSafeInteger(maxBytes)||maxBytes<24)throw Error('OUTPUT_SIZE_INVALID');
 const lenHeader=response.headers.get('content-length');
 const declared=lenHeader===null?null:Number(lenHeader);
 if(declared!==null&&(!Number.isSafeInteger(declared)||declared<24||declared>maxBytes))throw Error('OUTPUT_SIZE_UNVERIFIED');
 const reader=response.body.getReader(),parts=[];let length=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   if(!(value instanceof Uint8Array))throw Error('OUTPUT_BYTES_INVALID');
   length+=value.byteLength;
   if(length>maxBytes)throw Error('OUTPUT_SIZE_LIMIT');
   parts.push(Buffer.from(value));
  }
 }catch(error){await reader.cancel().catch(()=>{});throw error}
 if(length<24||declared!==null&&length!==declared)throw Error('OUTPUT_SIZE_MISMATCH');
 const bytes=Buffer.concat(parts,length);
 verifiedCreativeMedia(bytes,mime);
 return bytes;
}
