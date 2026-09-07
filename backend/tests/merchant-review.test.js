'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/modules/merchant-tap/merchant-tap.service');
const terminal = require('../src/modules/merchant-tap/merchant-terminal.service');

function setup() {
  let writes = 0;
  let serial = 0;
  const data = { merchantTaps: [{ id: 'tap', userId: 'buyer', placeId: 'coffee', checkinAt: new Date().toISOString(), status: 'checked-in' }], merchantPlaceReviews: [], merchantMedals: [], userPoints: { buyer: 0 } };
  const options = { createId: prefix => `${prefix}-${++serial}`, persist: () => writes++, pickPlace: () => ({ id: 'coffee', name: 'Coffee' }) };
  options.registry = [{ merchantId: 'shop', placeId: 'coffee', accountId: 'merchant', deviceId: 'terminal', active: true }];
  data.merchantTaps[0] = { ...data.merchantTaps[0], sessionId: 'session', merchantId: 'shop', deviceId: 'buyer-device', verificationLevel: terminal.LEVEL };
  data.merchantTerminalSessions = [{ id: 'session', tapId: 'tap', status: 'consumed', readerUserId: 'buyer', readerDeviceId: 'buyer-device', hostUserId: 'merchant', hostDeviceId: 'terminal', placeId: 'coffee', merchantId: 'shop' }];
  const account = { id: 'buyer' };
  const body = { stars: 5, tags: ['安静', '干净'], comment: '  不错  ' };
  return { data, options, account, body, writes: () => writes };
}

test('same review retries return original snapshot after restart without additional rewards', () => {
  const f = setup();
  const first = service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
  assert.equal(first.status, 201);
  const restored = JSON.parse(JSON.stringify(f.data));
  restored.userPoints.buyer = 50;
  for (let i = 0; i < 5; i++) {
    const retry = service.merchantPlaceReview(restored, f.account, 'tap', { ...f.body, tags: ['干净', '安静', '干净'] }, f.options);
    assert.equal(retry.status, 200);
    assert.deepEqual(retry.body.reward, first.body.reward);
    assert.equal(retry.body.review.id, first.body.review.id);
  }
  assert.equal(restored.userPoints.buyer, 50);
  assert.equal(restored.merchantMedals.length, 1);
  assert.equal(restored.merchantPlaceReviews.length, 1);
  assert.equal(f.writes(), 1);
});

test('changed duplicate and another account are rejected without changing the original', () => {
  const f = setup();
  service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
  const before = structuredClone(f.data);
  assert.equal(service.merchantPlaceReview(f.data, f.account, 'tap', { ...f.body, stars: 4 }, f.options).status, 409);
  assert.equal(service.merchantPlaceReview(f.data, { id: 'other' }, 'tap', f.body, f.options).status, 404);
  assert.deepEqual(f.data, before);
});

test('strict validation rejects invalid stars, malformed tags and overlong comments before any reward', () => {
  const f = setup();
  const invalid = [undefined, null, '5', NaN, Infinity, 0, -1, 6, 2.5].map(stars => ({ ...f.body, stars }));
  invalid.push({ ...f.body, tags: [1] }, { ...f.body, tags: [' '] }, { ...f.body, tags: ['x'.repeat(25)] },
    { ...f.body, tags: Array(9).fill('x') }, { ...f.body, tags: 'x' }, { ...f.body, comment: 12 }, { ...f.body, comment: 'x'.repeat(241) });
  const before = structuredClone(f.data);
  for (const body of invalid) assert.equal(service.merchantPlaceReview(f.data, f.account, 'tap', body, f.options).status, 400);
  assert.deepEqual(f.data, before);
  assert.equal(f.writes(), 0);
});

test('paid or rewarded status without a valid checkin never grants place review eligibility', () => {
  for (const status of ['paid', 'reviewed', 'rewarded']) {
    const f = setup();
    f.data.merchantTaps[0].status = status;
    for (const checkinAt of [undefined, 'bad-date']) {
      f.data.merchantTaps[0].checkinAt = checkinAt;
      assert.equal(service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options).status, 403);
    }
    assert.equal(f.writes(), 0);
  }
});

test('checkin retry preserves original timestamp, reward and terminal status', () => {
  const f = setup();
  service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
  const before = structuredClone(f.data);
  assert.equal(service.merchantCheckin(f.data, f.account, 'tap', f.options).status, 200);
  assert.deepEqual(f.data, before);
  assert.equal(f.writes(), 1);
});

test('different taps at same place on same UTC day do not multiply rewards', () => {
  const f = setup();
  service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
  f.data.merchantTaps.push({ ...f.data.merchantTaps[0], id: 'tap-2', reward: undefined, placeReviewId: undefined });
  f.data.merchantTaps[1].sessionId = 'session-2';
  f.data.merchantTerminalSessions.push({ ...f.data.merchantTerminalSessions[0], id: 'session-2', tapId: 'tap-2' });
  const second = service.merchantPlaceReview(f.data, f.account, 'tap-2', f.body, f.options);
  assert.equal(second.status, 201);
  assert.equal(second.body.reward.reason, 'DAILY_PLACE_LIMIT');
  assert.equal(second.body.reward.medal, null);
  assert.equal(second.body.reward.points.awarded, 0);
  assert.equal(f.data.userPoints.buyer, 5);
  assert.equal(f.data.merchantMedals.length, 1);
  assert.equal(f.data.merchantPlaceReviews.length, 2);
});

test('legacy review without snapshot is not minted again; legacy hardware claims are not trusted', () => {
  const f = setup();
  f.data.merchantPlaceReviews.push({ id: 'legacy', tapId: 'tap', userId: 'buyer', ...f.body });
  f.data.merchantTaps[0].hardwareVerified = true;
  const retry = service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.reward, null);
  assert.equal(retry.body.tap.hardwareVerified, false);
  assert.equal(retry.body.tap.gpsVerified, false);
  assert.equal(retry.body.guardrails.productionReady, false);
  assert.equal(f.data.merchantMedals.length, 0);
  assert.equal(f.writes(), 0);
});

test('daily cap is per account and place; old-day rewards do not block a new day', () => {
  const f = setup();
  service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
  f.data.merchantMedals[0].earnedAt = '2000-01-01T00:00:00.000Z';
  const cases = [
    { id: 'next-day', userId: 'buyer', placeId: 'coffee' },
    { id: 'other-place', userId: 'buyer', placeId: 'bookshop' },
    { id: 'other-user', userId: 'other', placeId: 'coffee' }
  ];
  for (const entry of cases) {
    f.options.registry.push({ merchantId: entry.id, placeId: entry.placeId, accountId: 'merchant', deviceId: 'terminal', active: true });
    f.data.merchantTaps.push({ ...entry, sessionId: entry.id, merchantId: entry.id, deviceId: 'buyer-device', verificationLevel: terminal.LEVEL, checkinAt: new Date().toISOString() });
    f.data.merchantTerminalSessions.push({ ...f.data.merchantTerminalSessions[0], id: entry.id, tapId: entry.id, merchantId: entry.id, placeId: entry.placeId, readerUserId: entry.userId });
    const result = service.merchantPlaceReview(f.data, { id: entry.userId }, entry.id, f.body, f.options);
    assert.equal(result.body.reward.points.awarded, 5);
  }
  assert.equal(new Set(f.data.merchantMedals.map(medal => medal.tokenId)).size, 4);
});

test('route reads the data snapshot only after request body finishes', async () => {
  const { handleMerchantTapRoutes } = require('../src/modules/merchant-tap/merchant-tap.routes');
  const f = setup();
  let bodyFinished = false;
  let result;
  await handleMerchantTapRoutes({
    req: { method: 'POST' }, res: {}, url: new URL('http://localhost/api/merchant/taps/tap/place-reviews'),
    readBody: async () => {
      // Simulate another request completing while this request body is pending.
      await Promise.resolve();
      service.merchantPlaceReview(f.data, f.account, 'tap', f.body, f.options);
      bodyFinished = true;
      return f.body;
    },
    readData: () => { assert.equal(bodyFinished, true); return structuredClone(f.data); },
    authenticate: () => ({ account: f.account, session: { deviceId: 'buyer-device' } }),
    send: (_res, status, body) => { result = { status, body }; },
    ...f.options
  });
  // The route uses the operator file, not options.registry from the caller.
  assert.equal(result.status, 403);
  assert.equal(f.writes(), 1);
});
