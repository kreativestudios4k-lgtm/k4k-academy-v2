import test from 'node:test';
import assert from 'node:assert/strict';
import {generationDownloadDestination} from '../lib/generation-download.mjs';
const origin='https://project.supabase.co';
const valid=origin+'/storage/v1/object/sign/studio-generations/owner/video.mp4?token=signed&download=K4K-video.mp4';
test('fresh same-project signed attachment is a permitted download destination',()=>{
 assert.equal(generationDownloadDestination(valid,origin),valid);
});
test('download cannot navigate to arbitrary, public, unsigned or inline media',()=>{
 for(const url of [valid.replace('project.supabase.co','evil.example'),valid.replace('https:','http:'),valid.replace('studio-generations','studio-references'),valid.replace('?token=signed&','?'),valid.replace('&download=K4K-video.mp4',''),valid+'#fragment','javascript:alert(1)'])assert.throws(()=>generationDownloadDestination(url,origin),/DOWNLOAD_LINK_INVALID/);
});
