import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeVideoDownload} from '../lib/server/generation-download-access.mjs';
const alice='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65';
const bob='7c92fe60-10eb-4185-9b2d-36a8f23ab3d3';
const id='d7411f09-a330-49b4-a953-2838b75eb99a';
const path=alice+'/'+id+'/render_12345678.mp4';
const job={id,user_id:alice,status:'completed',output_storage_path:path};
const req={authenticatedUserId:alice,requestedJobId:id,job};
test('authorizes completed private output for owner',()=>assert.deepEqual(authorizeVideoDownload(req),{bucket:'k4k-generation-outputs',path}));
test('rejects other users and jobs',()=>{
 assert.throws(()=>authorizeVideoDownload({...req,authenticatedUserId:bob}));
 assert.throws(()=>authorizeVideoDownload({...req,job:{...job,user_id:bob}}));
 assert.throws(()=>authorizeVideoDownload({...req,job:null}));
});
test('rejects queued, failed and missing outputs',()=>{
 for(const status of ['queued','processing','failed','cancelled']) assert.throws(()=>authorizeVideoDownload({...req,job:{...job,status}}));
 assert.throws(()=>authorizeVideoDownload({...req,job:{...job,output_storage_path:null}}));
});
test('rejects URL, traversal and cross-job keys',()=>{
 for(const output_storage_path of ['https://example.com/video.mp4',alice+'/../render_12345678.mp4',bob+'/'+id+'/render_12345678.mp4',alice+'/'+bob+'/render_12345678.mp4',path+'%2F',alice+'/'+id+'/render_12345678.jpg'])
  assert.throws(()=>authorizeVideoDownload({...req,job:{...job,output_storage_path}}));
});
