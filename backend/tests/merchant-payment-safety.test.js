'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/modules/merchant-tap/merchant-tap.service');

function fixture() {
  return {
    merchantTaps: [{ id: 'tap', userId: 'buyer', placeId: 'coffee', status: 'checked-in' }],
    merchantOrders: [], itemReviews: [], merchantMedals: [], userPoints: { buyer: 0 }
  };
}
const options = {
  persist() { assert.fail('blocked operation must not persist'); },
  createId() { assert.fail('blocked operation must not create records'); }
};

test('unconfigured payment rejects forged success flags and repeated requests without mutations', () => {
  const data = fixture();
  const before = structuredClone(data);
  for (const amount of [28, 0, -1, 'NaN', 1e100]) {
    const result = service.merchantPayment(data, { id: 'buyer' }, 'tap', {
      amount, status: 'paid', verified: true, transactionId: 'forged', currency: 'CNY'
    }, options);
    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'PAYMENT_NOT_CONFIGURED');
    assert.equal(result.body.order, undefined);
  }
  assert.deepEqual(data, before);
});

test('legacy paid records and caller-supplied proofs cannot unlock item reviews', () => {
  const data = fixture();
  data.merchantOrders.push({ id: 'legacy', tapId: 'tap', userId: 'buyer', status: 'paid' });
  data.merchantTaps[0].status = 'paid';
  const before = structuredClone(data);
  for (let retry = 0; retry < 3; retry++) {
    const result = service.merchantItemReview(data, { id: 'buyer' }, 'tap', {
      orderId: 'legacy', paymentVerified: true, stars: 5
    }, options);
    assert.equal(result.status, 403);
    assert.equal(result.body.error, 'VERIFIED_PAYMENT_REQUIRED');
  }
  assert.deepEqual(data, before);
});

test('payment and item review do not disclose another account tap', () => {
  const data = fixture();
  const before = structuredClone(data);
  for (const operation of [service.merchantPayment, service.merchantItemReview]) {
    for (const tapId of ['tap', 'missing']) {
      assert.equal(operation(data, { id: 'outsider' }, tapId, {}, options).status, 404);
    }
  }
  assert.deepEqual(data, before);
});

test('merchant capability contract explicitly declares payment and item reviews unavailable', () => {
  const guards = service.merchantGuardrails();
  assert.equal(guards.paymentAvailable, false);
  assert.equal(guards.itemReviewAvailable, false);
});
