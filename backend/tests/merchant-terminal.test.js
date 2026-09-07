'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const terminal = require('../src/modules/merchant-tap/merchant-terminal.service');
const merchant = require('../src/modules/merchant-tap/merchant-tap.service');

function fixture() {
  let id = 0, writes = 0;
  const data = { merchantTaps: [], merchantTerminalSessions: [] };
  const options = { registry: [{ merchantId: 'shop', placeId: 'coffee', accountId: 'host', deviceId: 'terminal', active: true }],
    pickPlace: () => ({ id: 'coffee' }), createId: prefix => `${prefix}-${++id}`, persist: () => writes++ };
  const host = { id: 'host' }, buyer = { id: 'buyer' };
  const issued = terminal.issue(data, host, 'terminal', { merchantId: 'shop' }, options);
  const proof = { ...issued.body.payload, deviceId: 'phone', transport: 'nfc-isodep', challenge: 'abcdef123456abcdef123456' };
  const observe = () => terminal.observe(data, host, 'terminal', proof.sessionId, { challenge: proof.challenge }, options);
  return { data, options, host, buyer, proof, observe, writes: () => writes };
}

test('registered account AND device required; request body cannot self-enroll', () => {
  const f = fixture();
  for (const [account, device] of [[f.buyer, 'terminal'], [f.host, 'other']]) {
    const result = terminal.issue(f.data, account, device, { merchantId: 'shop', active: true, accountId: 'host', deviceId: 'terminal' }, f.options);
    assert.equal(result.status, 403);
    assert.deepEqual(terminal.listTerminals(account, device, f.options).body.terminals, []);
  }
  assert.equal(f.writes(), 1);
});

test('terminal observation and token both required; destination comes from registration', () => {
  const f = fixture();
  assert.equal(terminal.claim(f.data, f.buyer, f.proof, f.options).body.error, 'TERMINAL_CONFIRMATION_PENDING');
  assert.equal(terminal.observe(f.data, f.buyer, 'terminal', f.proof.sessionId, { challenge: f.proof.challenge }, f.options).status, 404);
  assert.equal(f.observe().status, 200);
  const result = terminal.claim(f.data, f.buyer, { ...f.proof, placeId: 'forged', merchantId: 'forged', hardwareVerified: true }, f.options);
  assert.equal(result.status, 201);
  assert.equal(result.tap.placeId, 'coffee');
  assert.equal(result.tap.merchantId, 'shop');
  assert.equal(result.tap.hardwareVerified, false);
  assert.equal(result.tap.gpsVerified, false);
  assert.equal(result.tap.touchToken, undefined);
  assert.equal(f.data.merchantTerminalSessions[0].touchToken, undefined);
});

test('claim replay is account/device-bound and restart-safe; no second tap', () => {
  const f = fixture(); f.observe();
  const first = terminal.claim(f.data, f.buyer, f.proof, f.options);
  const restored = JSON.parse(JSON.stringify(f.data));
  restored.merchantTerminalSessions[0].expiresAt = '2000-01-01T00:00:00.000Z';
  assert.equal(terminal.claim(restored, f.buyer, f.proof, f.options).tap.id, first.tap.id);
  assert.equal(terminal.claim(restored, { id: 'third' }, f.proof, f.options).status, 409);
  assert.equal(terminal.claim(restored, f.buyer, { ...f.proof, deviceId: 'another' }, f.options).status, 409);
  assert.equal(restored.merchantTaps.length, 1);
  assert.equal(f.writes(), 3);
});

test('wrong challenge/token/purpose and same account/device cannot produce evidence', () => {
  const f = fixture(); f.observe();
  for (const change of [{ challenge: '000000000000000000000000' }, { touchToken: '0'.repeat(64) }, { purpose: 'personal' }, { transport: 'qr' }, { deviceId: 'terminal' }]) {
    assert.ok(terminal.claim(f.data, f.buyer, { ...f.proof, ...change }, f.options).status >= 400);
  }
  assert.equal(terminal.claim(f.data, f.host, f.proof, f.options).status, 409);
  assert.equal(f.data.merchantTaps.length, 0);
});

test('expiration, superseding and merchant revocation invalidate outstanding credentials', () => {
  for (const invalidate of [
    f => { f.data.merchantTerminalSessions[0].expiresAt = new Date(Date.now()).toISOString(); },
    f => { f.data.merchantTerminalSessions[0].expiresAt = 'invalid'; },
    f => terminal.issue(f.data, f.host, 'terminal', { merchantId: 'shop' }, f.options),
    f => { f.options.registry[0].active = false; }
  ]) {
    const f = fixture(); f.observe(); invalidate(f);
    assert.ok(terminal.claim(f.data, f.buyer, f.proof, f.options).status >= 400);
    assert.equal(f.data.merchantTaps.length, 0);
  }
});

test('old demo evidence cannot grant checkin or review; valid evidence expires for first checkin', () => {
  const f = fixture();
  f.data.merchantTaps.push({ id: 'old', userId: 'buyer', hardwareVerified: true, checkinAt: new Date().toISOString(), status: 'rewarded' });
  assert.equal(merchant.merchantCheckin(f.data, f.buyer, 'old', f.options).status, 403);
  assert.equal(merchant.merchantPlaceReview(f.data, f.buyer, 'old', { stars: 5 }, f.options).status, 403);
  f.observe();
  const result = terminal.claim(f.data, f.buyer, f.proof, f.options);
  result.tap.evidenceExpiresAt = '2000-01-01T00:00:00.000Z';
  assert.equal(merchant.merchantCheckin(f.data, f.buyer, result.tap.id, f.options).status, 409);
});

test('revocation blocks checkin/review even for a consumed session', () => {
  const f = fixture(); f.observe();
  const result = terminal.claim(f.data, f.buyer, f.proof, f.options);
  assert.equal(merchant.merchantCheckin(f.data, f.buyer, result.tap.id, f.options).status, 200);
  f.options.registry[0].active = false;
  assert.equal(merchant.merchantPlaceReview(f.data, f.buyer, result.tap.id, { stars: 5 }, f.options).status, 403);
});

test('malformed or ambiguous registry fails closed', () => {
  const row = fixture().options.registry[0];
  for (const registry of [null, {}, [null], [{ ...row, active: 'true' }], [{ ...row, deviceId: '' }], [row, row]]) {
    assert.deepEqual(terminal.registry({ registry }), []);
  }
});

test('malformed request bodies return validation errors without mutations', () => {
  const f = fixture();
  for (const body of [null, [], 'text', 1]) {
    assert.equal(terminal.issue(f.data, f.host, 'terminal', body, f.options).status, 400);
    assert.equal(terminal.observe(f.data, f.host, 'terminal', f.proof.sessionId, body, f.options).status, 400);
    assert.equal(terminal.claim(f.data, f.buyer, body, f.options).status, 400);
  }
  assert.equal(f.writes(), 1);
});
