import test from 'node:test';
import assert from 'node:assert/strict';
import {K4K_MAX_REFERENCE_IMAGES,selectK4KReferenceNames,setK4KMainReference,describeK4KReferenceOrder} from '../lib/k4k-reference-order.mjs';

test('limits a large reference selection to the 30 standard Genjutsu references', () => {
  const result = selectK4KReferenceNames(Array.from({length:33}, (_,i) => ({name:'ref-'+(i+1)+'.png'})));
  assert.equal(K4K_MAX_REFERENCE_IMAGES,30);
  assert.equal(result.names.length,30);
  assert.equal(result.ignored,3);
  assert.equal(result.names.at(-1),'ref-30.png');
});

test('moves the chosen primary image to first without losing the remaining order', () => {
  assert.deepEqual(setK4KMainReference(['left.png','right.png','outfit.png'],1),['right.png','left.png','outfit.png']);
});

test('invalid primary selection does not change the list', () => {
  const original=['one.png','two.png'];
  assert.deepEqual(setK4KMainReference(original,99),original);
  assert.deepEqual(setK4KMainReference(null,0),[]);
});

test('prompt guidance keeps image one primary and names supporting reference range', () => {
  assert.deepEqual(describeK4KReferenceOrder(0),[]);
  assert.match(describeK4KReferenceOrder(1)[0], /@Image1: PRIMARY/);
  assert.match(describeK4KReferenceOrder(3)[1], /@Image2–@Image3/);
  assert.equal(describeK4KReferenceOrder(3).length,3);
});
