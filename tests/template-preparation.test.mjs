import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredCharacterCount,validateTemplatePreparation} from '../lib/template-preparation.mjs';
const template={requiredImages:4};
const people=Array.from({length:4},(_,i)=>({photo:{name:'person'+i+'.jpg'},target:{x:20+i*10,y:40,timestamp:1.5}}));
test('Meeting Call requires four characters',()=>{
 assert.equal(requiredCharacterCount(template),4);
 assert.equal(validateTemplatePreparation(template,people,'pro').ready,true);
 assert.equal(validateTemplatePreparation(template,people.slice(0,3),'pro').reason,'MISSING_CHARACTER_SLOTS');
});
test('requires photo and mapped position for each required character',()=>{
 assert.equal(validateTemplatePreparation(template,people.map((p,i)=>i===2?{...p,photo:null}:p),'lite').reason,'MISSING_CHARACTER_PHOTO');
 assert.equal(validateTemplatePreparation(template,people.map((p,i)=>i===1?{...p,target:null}:p),'premium').reason,'MISSING_CHARACTER_MAPPING');
 assert.equal(validateTemplatePreparation(template,people.map((p,i)=>i===1?{...p,target:{x:110,y:20,timestamp:1}}:p),'pro').reason,'MISSING_CHARACTER_MAPPING');
});
test('rejects unsupported quality and invalid required count',()=>{
 assert.equal(validateTemplatePreparation(template,people,'ultra').reason,'INVALID_QUALITY');
 assert.equal(requiredCharacterCount({requiredImages:999}),1);
});
