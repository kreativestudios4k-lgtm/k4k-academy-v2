import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicCreationModels} from '../lib/creation-studio-catalog.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const compact=read('app/k4k-app/CompactCreationStudio.js');
const video=read('app/k4k-app/VideoCreationWorkspace.js');
const styles=read('app/k4k-app/video-creation-workspace.css');
const customer=read('app/k4k-app/CustomerCreativeGeneration.js');

test('video models use screenshot-inspired Create Video layout with model and preview in same workspace',()=>{
 assert.match(compact,/kind==='video'\?<VideoCreationWorkspace/);
 assert.match(video,/k4kv-tabs/);
 assert.match(video,/Create Video/);
 assert.match(video,/Edit Video/);
 assert.match(video,/Motion Control/);
 assert.match(video,/k4kv-editor-scroll/);
 assert.match(video,/k4kv-discovery/);
 assert.match(video,/k4kv-current-model/);
 assert.match(video,/k4kv-model-form/);
 assert.match(video,/title="Model" selectRef=\{modelSelect\}/);
 assert.match(video,/options=\{VIDEOS\.map\(m=>\(\{value:m\.id,label:m\.name\}\)\)\}/);
 assert.match(video,/onSelectModel\(item\)/);
 assert.match(styles,/grid-template-columns:320px minmax\(0,1fr\)/);
 assert.match(styles,/@media\(max-width:760px\)/);
});

test('video editor tabs never reference an unbound tab variable during React rendering',()=>{
 const editor=video.slice(video.indexOf('export default function VideoCreationWorkspace('));
 assert.match(editor,/const selectedTab=mode==='Video edit'\?'edit':'create'/);
 assert.doesNotMatch(editor,/\btab\s*===/);
 assert.match(editor,/aria-current=\{selectedTab==='create'\?'page':undefined\}/);
 assert.match(editor,/aria-current=\{selectedTab==='edit'\?'page':undefined\}/);
 assert.match(editor,/<button type="button" onClick=\{\(\)=>onTab\('motion'\)\}>Motion Control<\/button>/);
});

test('featured preview is taken from selected model and all six clips are selectable and correctly labelled',()=>{
 const models=publicCreationModels('video');
 assert.equal(models.length,6);
 assert.ok(models.every(m=>m.demoUrl&&m.demoDurationSec&&m.demoAspect));
 assert.match(video,/const videoShowcases=VIDEOS\.filter\(m=>m\.demoUrl\)/);
 assert.match(video,/src=\{model\.demoUrl\}/);
 assert.match(video,/Uploaded model example · not your result/);
 assert.match(video,/onClick=\{\(\)=>onSelectModel\(item\)\}/);
 assert.match(video,/item\.demoDurationSec/);
 assert.match(video,/model\.demoAspect==='9:16'/);
 assert.match(video,/History/);
 assert.match(video,/How it works/);
 assert.match(video,/K4K Originals/);
 assert.match(video,/Preview clips · not interchangeable model presets/);
});

test('video controls reflect each models published catalogue and avoid fictional bitrate or audio features',()=>{
 assert.match(video,/model\.duration\?/);
 assert.match(video,/options=\{model\.aspect\}/);
 assert.match(video,/options=\{model\.resolution\}/);
 assert.match(video,/Provider default/);
 assert.match(video,/Image, video or audio · not enabled for this model\/mode/);
 assert.match(video,/Reference editing is not enabled in the signed text-to-video generator/);
 assert.match(video,/Additional bitrate and audio options are only available/);
 assert.match(video,/onClick=\{\(\)=>onTab\('motion'\)\}/);
});

test('Generate delegates exclusively to existing signed quote and submit interface',()=>{
 assert.match(video,/<CustomerCreativeGeneration key=\{model\.id\}/);
 assert.match(video,/stayInWorkspace/);
 assert.match(video,/referenceCount=\{files\.length\}/);
 assert.match(customer,/action:'quote'/);
 assert.match(customer,/action:'submit'/);
 assert.match(customer,/Confirm & Generate/);
 assert.match(customer,/action:'status'/);
 assert.match(customer,/action:'download'/);
 assert.doesNotMatch(video,/fetch\('\/api\/creative\/customer'/);
 assert.doesNotMatch(video,/\/\/api\/generation\/jobs/);
});
