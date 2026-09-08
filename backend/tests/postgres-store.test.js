'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPostgresStore } = require('../src/shared/postgres-store');
const { databaseConnectionOptions } = require('../src/shared/postgres-store');

test('TLS identity is bound to configured database address even if transport supplies localhost', () => {
  const certificate = { subjectaltname: 'DNS:localhost', subject: { CN: 'localhost' } };
  const ip = databaseConnectionOptions('postgres://127.0.0.1/test', {}).ssl;
  assert.equal(ip.checkServerIdentity('localhost', certificate).code, 'ERR_TLS_CERT_ALTNAME_INVALID');
  const dns = databaseConnectionOptions('postgres://localhost/test', {}).ssl;
  assert.equal(dns.checkServerIdentity('ignored-transport-host', certificate), undefined);
  const ipv6 = databaseConnectionOptions('postgres://[::1]/test', {}).ssl;
  assert.equal(ipv6.checkServerIdentity('localhost', certificate).code, 'ERR_TLS_CERT_ALTNAME_INVALID');
});
const { fakeDatabase } = require('./helpers/fake-postgres');
function make(db, env = {}) { return createPostgresStore({ databaseUrl: 'postgres://localhost/test', seed: { count: 0 }, PoolClass: db.Pool, env }); }

test('database write is invisible until COMMIT acknowledgement and request waits for it', async () => {
  const db = fakeDatabase(); const store = make(db); await store.init();
  let release, entered;
  db.commitGate = new Promise(resolve => { release = resolve; });
  const atCommit = new Promise(resolve => { entered = resolve; }); db.onCommit = entered;
  let finished = false;
  const request = store.runRequest(async () => { store.writeRaw({ count: 1 }); return 'result'; }).then(value => { finished = true; return value; });
  await atCommit;
  assert.equal(finished, false); assert.equal(db.data.count, 0);
  release(); assert.equal(await request, 'result'); assert.equal(db.data.count, 1);
});

test('row-locked requests across two store instances read latest committed state', async () => {
  const db = fakeDatabase(); const first = make(db), second = make(db);
  await first.init(); await second.init();
  await Promise.all(Array.from({ length: 12 }, (_, i) => {
    const store = i % 2 ? first : second;
    return store.runRequest(async () => { const state = store.readRaw(); await Promise.resolve(); state.count++; store.writeRaw(state); });
  }));
  assert.equal(db.data.count, 12);
  const restarted = make(db); await restarted.init();
  assert.equal(await restarted.runRequest(() => restarted.readRaw().count), 12);
});

test('write failure rolls back without retry loop, cache leak, or credential disclosure', async () => {
  const db = fakeDatabase(); const store = make(db); await store.init(); db.fail = 'update';
  await assert.rejects(store.runRequest(() => store.writeRaw({ count: 10 })), error => error.code === 'STORAGE_UNAVAILABLE' && !error.message.includes('private'));
  assert.equal(db.data.count, 0);
  assert.equal(db.queries.filter(sql => sql.startsWith('UPDATE')).length, 1);
  db.fail = '';
  assert.equal(await store.runRequest(() => store.readRaw().count), 0);
});

test('lost COMMIT acknowledgement is uncertain and never auto-replays business logic', async () => {
  for (const failure of ['commit-before', 'commit-after']) {
    const db = fakeDatabase(); const store = make(db); await store.init(); db.fail = failure;
    let calls = 0;
    await assert.rejects(store.runRequest(() => { calls++; store.writeRaw({ count: 5 }); }), { code: 'STORAGE_COMMIT_UNCERTAIN' });
    assert.equal(calls, 1);
    assert.equal(db.queries.filter(sql => sql === 'COMMIT').length, 1);
    assert.equal(db.data.count, failure === 'commit-after' ? 5 : 0);
  }
});

test('business exception rolls back and read/write outside a live transaction is rejected', async () => {
  const db = fakeDatabase(); const store = make(db); await store.init();
  assert.throws(() => store.readRaw(), { code: 'STORAGE_TRANSACTION_REQUIRED' });
  assert.throws(() => store.writeRaw({ count: 2 }), { code: 'STORAGE_TRANSACTION_REQUIRED' });
  await assert.rejects(store.runRequest(() => { store.writeRaw({ count: 2 }); throw new Error('business failure'); }));
  assert.equal(db.data.count, 0);
});

test('database state corruption/deletion is never replaced with seed data during requests', async () => {
  const db = fakeDatabase(); const store = make(db); await store.init();
  for (const invalid of [undefined, null, [], 'corrupt']) {
    db.data = invalid;
    await assert.rejects(store.runRequest(() => store.writeRaw({ count: 9 })), { code: 'STORAGE_INVALID_DATA' });
    assert.deepEqual(db.data, invalid);
  }
});

test('TLS verifies by default; URL TLS overrides and unsafe identifiers fail before connecting', () => {
  const db = fakeDatabase(); make(db);
  assert.equal(db.configs[0].ssl.rejectUnauthorized, true);
  assert.equal(db.configs[0].connectionTimeoutMillis, 5000);
  assert.equal(db.configs[0].query_timeout, 5000);
  make(db, { SMALLWORLD_DATABASE_SSL: 'disable' }); assert.equal(db.configs[1].ssl, false);
  for (const env of [{ SMALLWORLD_DATABASE_TABLE: 'x; DROP TABLE users' }, { SMALLWORLD_DATABASE_POOL: '0' }, { SMALLWORLD_DATABASE_SSL: 'insecure' }]) assert.throws(() => make(db, env), { code: 'STORAGE_CONFIGURATION' });
  assert.throws(() => createPostgresStore({ databaseUrl: 'postgres://localhost/test?sslmode=no-verify', seed: {}, PoolClass: db.Pool, env: {} }), { code: 'STORAGE_CONFIGURATION' });
});

test('connection failure returns once and later request can recover with a fresh connection', async () => {
  const db = fakeDatabase(); const store = make(db); await store.init(); db.fail = 'connect';
  await assert.rejects(store.runRequest(() => assert.fail('business must not run')), { code: 'STORAGE_UNAVAILABLE' });
  db.fail = ''; assert.equal(await store.runRequest(() => store.readRaw().count), 0);
});
