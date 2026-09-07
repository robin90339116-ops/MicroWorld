'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const interests = require('../src/modules/interest-club/interest-club.service');
const auth = require('../src/modules/auth/auth.service');

test('interest topics and categories match frontend contract, including empty results', () => {
  const all = interests.listInterests({}, new URLSearchParams());
  assert.ok(all.categories.includes('全部'));
  assert.ok(all.topics.length > 0);
  for (const category of all.categories.filter(value => value !== '全部')) {
    const filtered = interests.listInterests({}, new URLSearchParams({ category }));
    assert.ok(filtered.topics.every(topic => topic.category === category));
  }
  assert.deepEqual(interests.listInterests({}, new URLSearchParams({ q: '___no_match_83794___' })).topics, []);
  assert.ok(interests.listInterests({}, new URLSearchParams({ q: '阅读' })).topics.some(topic => topic.name === '阅读'));
});

test('password is hashed; two installations have independent sessions; logout revokes only its token', () => {
  const data = {};
  const body = { email: 'member@example.test', displayName: '测试账号', password: 'ValidPassword123', deviceId: 'device-a' };
  const registered = auth.registerAccount(data, body);
  assert.equal(registered.status, 201);
  assert.equal(data.accounts[0].password, undefined);
  assert.notEqual(data.accounts[0].passwordHash, body.password);
  const second = auth.loginAccount(data, { ...body, deviceId: 'device-b' });
  const req = token => ({ headers: { authorization: `Bearer ${token}` } });
  const firstAuth = auth.authenticate(data, req(registered.body.token));
  assert.ok(firstAuth);
  assert.ok(auth.authenticate(data, req(second.body.token)));
  auth.logout(data, firstAuth.tokenHash);
  assert.equal(auth.authenticate(data, req(registered.body.token)), null);
  assert.ok(auth.authenticate(data, req(second.body.token)));
});

test('invalid credentials, duplicate registration and expired sessions are rejected', () => {
  const data = {};
  const body = { email: 'member@example.test', displayName: '测试账号', password: 'ValidPassword123', deviceId: 'device-a' };
  const registered = auth.registerAccount(data, body);
  assert.equal(auth.registerAccount(data, body).status, 409);
  assert.equal(auth.loginAccount(data, { ...body, password: 'wrong' }).status, 401);
  data.authSessions[0].expiresAt = '2000-01-01T00:00:00Z';
  assert.equal(auth.authenticate(data, { headers: { authorization: `Bearer ${registered.body.token}` } }), null);
});
