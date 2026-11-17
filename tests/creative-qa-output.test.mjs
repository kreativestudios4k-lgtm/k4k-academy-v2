import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedCreativeMedia,boundedCreativeDownload} from '../lib/server/creative-qa-output.mjs';
function png(){const b=Buffer.alloc(32);Buffer.from([137,80,78,71,13,10,26,10]).copy(b,0);b.writeUInt32BE(13,8);b.write('IHDR',12,'ascii');return b}
function mp4(){const b=Buffer.alloc(32);b.writeUInt32BE(24,0);b.write('ftyp',4,'ascii');b.write('isom',8,'ascii');return b}
function jpg(){const b=Buffer.alloc(32);b[0]=255;b[1]=216;b[30]=255;b[31]=217;return b}
function response(bytes,headerSize=bytes.length){
 const stream=new ReadableStream({start(c){c.enqueue(Uint8Array.from(bytes));c.close()}});
 return {ok:true,body:stream,headers:new Headers(headerSize===null?{}:{'content-length':String(headerSize)})};
}
test('accepts only valid bytes matching declared image/video MIME',()=>{
 assert.equal(verifiedCreativeMedia(png(),'image/png').mime,'image/png');
 assert.equal(verifiedCreativeMedia(jpg(),'image/jpeg').mime,'image/jpeg');
 assert.equal(verifiedCreativeMedia(mp4(),'video/mp4').mime,'video/mp4');
 assert.throws(()=>verifiedCreativeMedia(png(),'video/mp4'),/OUTPUT_SIGNATURE_INVALID/);
 assert.throws(()=>verifiedCreativeMedia(Buffer.alloc(32),'image/jpeg'),/OUTPUT_SIGNATURE_INVALID/);
 assert.throws(()=>verifiedCreativeMedia(mp4(),'application/octet-stream'),/OUTPUT_MIME_UNSUPPORTED/);
});
test('streams verified media within a hard size cap without trusting Content-Length',async()=>{
 assert.equal((await boundedCreativeDownload(response(png()),{mime:'image/png',maxBytes:50})).length,32);
 assert.equal((await boundedCreativeDownload(response(mp4(),null),{mime:'video/mp4',maxBytes:50})).length,32);
 await assert.rejects(()=>boundedCreativeDownload(response(mp4(),31),{mime:'video/mp4',maxBytes:50}),/OUTPUT_SIZE_MISMATCH/);
 await assert.rejects(()=>boundedCreativeDownload(response(mp4(),null),{mime:'video/mp4',maxBytes:30}),/OUTPUT_SIZE_LIMIT/);
 await assert.rejects(()=>boundedCreativeDownload(response(png()),{mime:'image/jpeg',maxBytes:50}),/OUTPUT_SIGNATURE_INVALID/);
});
