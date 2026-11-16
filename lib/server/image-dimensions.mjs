// Parse actual uploaded image dimensions (not client filenames or content-type).
// No decoding, CDN request, image transformations or chargeable provider request.
const u16=(b,i)=>(b[i]<<8)|b[i+1];
const u16le=(b,i)=>b[i]|(b[i+1]<<8);
const u24le=(b,i)=>b[i]|(b[i+1]<<8)|(b[i+2]<<16);
export function referenceImageDimensions(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<16)throw Error('MEDIA_DIMENSIONS_INVALID');
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){
  if(bytes.length<24)throw Error('MEDIA_DIMENSIONS_INVALID');
  return {width:((bytes[16]*16777216)+(bytes[17]<<16)+(bytes[18]<<8)+bytes[19])>>>0,height:((bytes[20]*16777216)+(bytes[21]<<16)+(bytes[22]<<8)+bytes[23])>>>0};
 }
 if(bytes[0]===255&&bytes[1]===216){
  let p=2;while(p+9<bytes.length){
   if(bytes[p]!==255){p++;continue}while(bytes[p]===255)p++;
   const marker=bytes[p++];if(marker===0xd9||marker===0xda)break;
   if(marker===0x00||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   if(p+2>bytes.length)break;
   const len=u16(bytes,p);if(len<2||p+len>bytes.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
    if(len<7)break;return {width:u16(bytes,p+5),height:u16(bytes,p+3)};
   }p+=len;
  }throw Error('MEDIA_DIMENSIONS_INVALID');
 }
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){
  const type=String.fromCharCode(...bytes.slice(12,16));
  if(type==='VP8X'&&bytes.length>=30)return {width:1+u24le(bytes,24),height:1+u24le(bytes,27)};
  if(type==='VP8 '&&bytes.length>=30){if(bytes[23]!==157||bytes[24]!==1||bytes[25]!==42)throw Error('MEDIA_DIMENSIONS_INVALID');return {width:u16le(bytes,26)&0x3fff,height:u16le(bytes,28)&0x3fff};}
  if(type==='VP8L'&&bytes.length>=25){if(bytes[20]!==47)throw Error('MEDIA_DIMENSIONS_INVALID');return {width:1+(bytes[21]|((bytes[22]&0x3f)<<8)),height:1+((bytes[22]>>6)|(bytes[23]<<2)|((bytes[24]&0x0f)<<10))};}
 }throw Error('MEDIA_DIMENSIONS_INVALID');
}
export function verifyWanReferenceDimensions(bytes,{minimum=240}={}){
 const {width,height}=referenceImageDimensions(bytes);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw Error('MEDIA_DIMENSIONS_INVALID');
 if(width<minimum||height<minimum)throw Error('MEDIA_DIMENSIONS_TOO_SMALL');
 return {width,height};
}
