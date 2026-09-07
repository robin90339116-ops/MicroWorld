'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createPostgresStore } = require('../src/shared/postgres-store');
const { fakeDatabase } = require('./helpers/fake-postgres');

async function setup(t) {
  const db = fakeDatabase({ accounts: [], authSessions: [] });
  const store = createPostgresStore({ databaseUrl: 'postgres://localhost/test', seed: {}, PoolClass: db.Pool, env: {} });
  await store.init();
  const factory = require('../src/shared/store');
  const original = factory.createStore;
  const serverPath = require.resolve('../server');
  delete require.cache[serverPath];
  let app;
  try { factory.createStore = () => store; app = require('../server'); } finally { factory.createStore = original; }
  t.after(async () => { delete require.cache[serverPath]; await store.close(); });
  function request(body, url = '/api/auth/register') {
    const req = body instanceof Readable ? body : Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    Object.assign(req, { method: body === undefined ? 'GET' : 'POST', url, headers: { host: 'localhost' } });
    const reply = { destroyed: false, status: null, text: null,
      writeHead(status) { this.status = status; }, end(text) { this.text = text; } };
    const done = app.server.listeners('request')[0](req, reply).finally(() => req.destroy());
    return { reply, done };
  }
  return { db, request };
}
const registration = { email: 'db-test@example.test', password: 'LocalDatabaseTest123', displayName: 'DB Test', deviceId: 'test-device' };

test('actual register handler does not send token or 201 before COMMIT acknowledgement', async t => {
  const { db, request } = await setup(t);
  let release, entered;
  db.commitGate = new Promise(resolve => { release = resolve; });
  const atCommit = new Promise(resolve => { entered = resolve; }); db.onCommit = entered;
  const result = request(registration);
  await atCommit;
  assert.equal(result.reply.status, null); assert.equal(result.reply.text, null);
  assert.equal(db.data.accounts.length, 0);
  release(); await result.done;
  assert.equal(result.reply.status, 201);
  assert.ok(JSON.parse(result.reply.text).token);
  assert.equal(db.data.accounts.length, 1);
});

test('actual register handler returns 503, not its buffered success, on failed database update', async t => {
  const { db, request } = await setup(t); db.fail = 'update';
  const result = request(registration); await result.done;
  assert.equal(result.reply.status, 503);
  const body = JSON.parse(result.reply.text);
  assert.equal(body.error, 'STORAGE_UNAVAILABLE'); assert.equal(body.token, undefined);
  assert.equal(db.data.accounts.length, 0);
});

test('lost commit response never releases success and never silently re-registers account', async t => {
  const { db, request } = await setup(t); db.fail = 'commit-after';
  const result = request(registration); await result.done;
  assert.equal(result.reply.status, 503);
  assert.equal(JSON.parse(result.reply.text).error, 'STORAGE_COMMIT_UNCERTAIN');
  assert.equal(db.data.accounts.length, 1);
  assert.equal(db.queries.filter(sql => sql === 'COMMIT').length, 1);
});

test('health endpoint tests database availability instead of reporting healthy from stale cache', async t => {
  const { db, request } = await setup(t); db.fail = 'connect';
  const result = request(undefined, '/health'); await result.done;
  assert.equal(result.reply.status, 503);
  assert.equal(JSON.parse(result.reply.text).error, 'STORAGE_UNAVAILABLE');
});

test('slow request body does not acquire database lock; malformed JSON never opens transaction', async t => {
  const { db, request } = await setup(t);
  const stream = new Readable({ read() {} });
  const result = request(stream);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(db.queries.some(sql => sql.includes('FOR UPDATE')), false);
  stream.push(JSON.stringify(registration)); stream.push(null);
  await result.done; assert.equal(result.reply.status, 201);
  const before = db.queries.length;
  const invalid = request(Readable.from(['{broken'])); await invalid.done;
  assert.equal(invalid.reply.status, 400); assert.equal(db.queries.length, before);
});
