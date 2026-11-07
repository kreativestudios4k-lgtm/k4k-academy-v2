import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_PRICES, PLAN_CURRENCIES, getPlanPrice} from '../lib/k4k-plan-prices.mjs';

test('approved amounts match the table', () => {
  assert.equal(getPlanPrice('starter', 'GBP'), 1599);
  assert.equal(getPlanPrice('starter', 'EUR'), 1899);
  assert.equal(getPlanPrice('starter', 'USD'), 2099);
  assert.equal(getPlanPrice('starter', 'BRL'), 10999);
  assert.equal(getPlanPrice('creator', 'GBP'), 3099);
  assert.equal(getPlanPrice('creator', 'BRL'), 20999);
  assert.equal(getPlanPrice('pro', 'GBP'), 6599);
  assert.equal(getPlanPrice('pro', 'USD'), 8499);
  assert.equal(getPlanPrice('studio', 'EUR'), 15999);
  assert.equal(getPlanPrice('studio', 'BRL'), 89999);
});

test('every price ends in .99', () => {
  for (const plan of Object.keys(PLAN_PRICES)) {
    for (const currency of PLAN_CURRENCIES) {
      assert.equal(getPlanPrice(plan, currency) % 100, 99, `${plan} ${currency}`);
    }
  }
});

test('every plan includes the Academy', () => {
  for (const plan of Object.keys(PLAN_PRICES)) {
    assert.equal(PLAN_PRICES[plan].includesAcademy, true, plan);
  }
});

test('unknown plans and currencies are rejected', () => {
  assert.throws(() => getPlanPrice('premium', 'GBP'), /Unknown plan/);
  assert.throws(() => getPlanPrice('starter', 'JPY'), /Currency is not approved/);
});

test('price table is frozen', () => {
  assert.ok(Object.isFrozen(PLAN_PRICES));
  assert.ok(Object.isFrozen(PLAN_PRICES.starter));
});
