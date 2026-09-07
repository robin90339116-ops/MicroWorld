'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const nfc = require('../src/modules/nfc-proof/nfc-proof.service');
const social = require('../src/modules/social-chat/social-chat.service');

function fixture() {
  let serial = 0;
  const a = { id: 'alice', displayName: 'Alice' };
  const b = { id: 'bob', displayName: 'Bob' };
  const data = { accounts: [a, b], places: [{ id: 'library', shortName: 'Library' }] };
  const options = { createId: prefix => `${prefix}_${++serial}`, secureToken: () => `secret-${++serial}`,
    pickPlace: (state, id) => state.places.find(place => place.id === id), persist: () => {} };
  const start = () => nfc.createNfcSession(data, a, { placeId: 'library', hostDeviceId: 'phone-a' }, options).body;
  const prepare = s => nfc.confirmNfcSession(data, b, { sessionId: s.sessionId, touchToken: s.touchToken,
    readerDeviceId: 'phone-b', transport: 'iso_dep_apdu', challenge: 'abcdef1234567890', gpsVerified: true }, options);
  const finish = s => nfc.decideNfcSession(data, a, s.sessionId, { action: 'accept', challenge: 'abcdef1234567890' }, options);
  return { data, a, b, options, start, prepare, finish };
}

test('reader alone gets no proof or reward; host confirmation creates two-way friends and one shared chat', () => {
  const f = fixture(); const s = f.start();
  assert.equal(f.prepare(s).status, 202);
  assert.equal((f.data.touchProofs || []).length, 0);
  assert.equal(f.data.userPoints, undefined);
  const result = f.finish(s);
  assert.equal(result.status, 201);
  assert.equal(f.data.touchProofs.length, 1);
  assert.equal(f.data.friends.length, 2);
  assert.equal(f.data.chats.length, 1);
  assert.equal(f.data.userPoints.alice, 6);
  assert.equal(f.data.userPoints.bob, 6);
  assert.equal(f.data.affinity.alice__bob, 6);
  assert.equal(social.listFriends(f.data, f.b).friends[0].id, f.a.id);
  const reader = nfc.getNfcSession(f.data, f.b, s.sessionId, f.options).body;
  assert.equal(reader.proofId, result.body.proofId);
  assert.equal(reader.chatId, result.body.chatId);
  assert.deepEqual(reader.reward.points, result.body.reward.points);
  assert.equal(reader.proof.hardwareVerified, false);
  assert.equal(reader.proof.gpsVerified, false);
});

test('repeated decisions and reader retries are idempotent; second encounter gives no daily duplicate reward', () => {
  const f = fixture(); const s = f.start(); f.prepare(s); const first = f.finish(s);
  assert.equal(f.finish(s).body.proofId, first.body.proofId);
  assert.equal(f.prepare(s).body.proofId, first.body.proofId);
  const next = f.start(); f.prepare(next); const second = f.finish(next);
  assert.equal(second.body.alreadyFriends, true);
  assert.equal(second.body.timesMet, 2);
  assert.equal(second.body.reward.points.awarded, 0);
  assert.equal(f.data.touchProofs.length, 2);
  assert.equal(f.data.chats.length, 1);
  assert.equal(f.data.userPoints.bob, 6);
  assert.equal(f.data.affinity.alice__bob, 6);
});

test('host challenge must match local exchange and stranger cannot view, cancel or confirm', () => {
  const f = fixture(); const s = f.start(); f.prepare(s);
  const stranger = { id: 'mallory' };
  assert.equal(nfc.getNfcSession(f.data, stranger, s.sessionId, f.options).status, 404);
  assert.equal(nfc.decideNfcSession(f.data, stranger, s.sessionId, { action: 'cancel' }, f.options).status, 404);
  assert.equal(nfc.decideNfcSession(f.data, f.a, s.sessionId, { action: 'accept', challenge: 'wrong' }, f.options).status, 403);
  assert.equal(nfc.decideNfcSession(f.data, f.b, s.sessionId, { action: 'accept', challenge: 'abcdef1234567890' }, f.options).status, 409);
  assert.equal((f.data.touchProofs || []).length, 0);
});

test('cancel, expiration at the deadline and superseding prevent subsequent rewards', () => {
  for (const mode of ['cancel', 'expire', 'supersede']) {
    const f = fixture(); const s = f.start(); f.prepare(s);
    if (mode === 'cancel') nfc.decideNfcSession(f.data, f.b, s.sessionId, { action: 'cancel' }, f.options);
    if (mode === 'expire') f.data.nfcSessions[0].expiresAt = new Date(Date.now()).toISOString();
    if (mode === 'supersede') f.start();
    const result = f.finish(s);
    assert.notEqual(result.body.status, 'confirmed');
    assert.equal((f.data.touchProofs || []).length, 0);
    assert.equal(f.data.userPoints, undefined);
  }
});

test('block after reader confirmation prevents completion; histories expose no tokens or device identifiers', () => {
  const f = fixture(); const s = f.start(); f.prepare(s);
  f.data.blockedUsers = [{ userId: f.b.id, targetUserId: f.a.id, status: 'active' }];
  assert.equal(f.finish(s).status, 403);
  f.data.blockedUsers = []; f.finish(s);
  const history = nfc.listUserProofs(f.data, f.a);
  assert.equal(history.count, 1);
  assert.ok(history.proofs[0].reward);
  assert.ok(!JSON.stringify(history).includes('secret-'));
  assert.ok(!JSON.stringify(history).includes('phone-a'));
  assert.equal(nfc.listUserProofs(f.data, { id: 'stranger' }).count, 0);
});

test('restart from persisted awaiting_host snapshot still requires explicit matching host decision', () => {
  const f = fixture(); const s = f.start(); f.prepare(s);
  const restarted = JSON.parse(JSON.stringify(f.data));
  const status = nfc.getNfcSession(restarted, f.a, s.sessionId, f.options);
  assert.equal(status.body.status, 'awaiting_host');
  assert.equal(status.body.reward, null);
  assert.equal(status.body.apduChallenge, undefined);
  assert.equal(status.body.touchToken, undefined);
  const result = nfc.decideNfcSession(restarted, f.a, s.sessionId,
    { action: 'accept', challenge: 'abcdef1234567890' }, f.options);
  assert.equal(result.status, 201);
  assert.equal(restarted.userPoints.alice, 6);
  assert.equal(restarted.userPoints.bob, 6);
});

test('restart after completion restores reward snapshots even after session deadline; no new mint', () => {
  const f = fixture(); const s = f.start(); f.prepare(s); const result = f.finish(s);
  const restarted = JSON.parse(JSON.stringify(f.data));
  restarted.nfcSessions[0].expiresAt = '2000-01-01T00:00:00Z';
  const before = JSON.stringify(restarted);
  const recovered = nfc.getNfcSession(restarted, f.b, s.sessionId, f.options).body;
  assert.equal(recovered.status, 'confirmed');
  assert.equal(recovered.proofId, result.body.proofId);
  assert.equal(recovered.reward.points.total, 6);
  assert.equal(JSON.stringify(restarted), before);
});

test('restart cannot resurrect cancelled or expired sessions', () => {
  for (const status of ['cancelled', 'expired']) {
    const f = fixture(); const s = f.start(); f.prepare(s);
    f.data.nfcSessions[0].status = status;
    const restarted = JSON.parse(JSON.stringify(f.data));
    const result = nfc.decideNfcSession(restarted, f.a, s.sessionId,
      { action: 'accept', challenge: 'abcdef1234567890' }, f.options);
    assert.notEqual(result.body.status, 'confirmed');
    assert.equal((restarted.touchProofs || []).length, 0);
  }
});
