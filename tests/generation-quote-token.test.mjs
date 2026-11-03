import test from 'node:test';
import assert from 'node:assert/strict';
import {issueQuoteToken,verifyQuoteToken} from '../lib/server/generation-quote-token.mjs';
const secret='x'.repeat(64), userId='25d0e48c-5dd5-4d84-a3b9-0e5bd6227a65', other='7c92fe60-10eb-4185-9b2d-36a8f23ab3d3';
const quote={modelId:'genjutsu',durationSeconds:5,resolution:'720p',credits:36,currency:'GBP',estimatedProviderCostPence:50,quoteVersion:'verified-2026-11'};
const now=100000;
test('issues a user-bound, expiring quote token',()=>{const token=issueQuoteToken({userId,quote,secret,now});assert.deepEqual(verifyQuoteToken({token,userId,secret,now:now+1000}),quote);assert.throws(()=>verifyQuoteToken({token,userId:other,secret,now:now+1000}));assert.throws(()=>verifyQuoteToken({token,userId,secret,now:now+120000}));});
test('rejects tampering and invalid secrets',()=>{const token=issueQuoteToken({userId,quote,secret,now});const [body,mac]=token.split('.');assert.throws(()=>verifyQuoteToken({token:body+'A.'+mac,userId,secret,now}));assert.throws(()=>verifyQuoteToken({token,userId,secret:'short',now}));assert.throws(()=>verifyQuoteToken({token,userId,secret:'y'.repeat(64),now}));});
test('rejects malformed, excessive TTL and unsupported quote fields',()=>{assert.throws(()=>issueQuoteToken({userId,quote:{...quote,credits:0},secret,now}));assert.throws(()=>issueQuoteToken({userId,quote:{...quote,quoteVersion:undefined},secret,now}));assert.throws(()=>issueQuoteToken({userId,quote,secret,now,ttlMs:600000}));assert.throws(()=>verifyQuoteToken({token:'abc',userId,secret,now}));});
