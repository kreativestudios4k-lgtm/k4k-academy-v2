import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeLibraryJobs,creativeDownloadDestination} from '../lib/creative-library.mjs';
test('library hides unsubmitted quotes and retains pending, completed and failed work',()=>{
 const jobs=['draft','queued','processing','completed','failed'].map(status=>({id:status,status}));
 assert.deepEqual(creativeLibraryJobs(jobs).map(job=>job.id),['queued','processing','completed','failed']);
 assert.deepEqual(creativeLibraryJobs(undefined),[]);
});
test('image and video downloads accept only signed attachments on our storage origin',()=>{
 const base='https://project.supabase.co';
 for(const bucket of ['studio-generations','studio-customer-images']){
  const url=`${base}/storage/v1/object/sign/${bucket}/user/file.png?token=signed&download=K4K.png`;
  assert.equal(creativeDownloadDestination(url,base),url);
  for(const bad of [url.replace(base,'https://attacker.example'),url.replace('https:','http:'),url.replace(bucket,'other-bucket'),url.replace('token=signed&',''),url.replace('&download=K4K.png',''),url+'#fragment',url.replace('https://','https://user:password@')])assert.throws(()=>creativeDownloadDestination(bad,base));
 }
});
