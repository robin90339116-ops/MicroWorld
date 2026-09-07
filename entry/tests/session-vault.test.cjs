'use strict';
// Tests real transpiled vault logic with a fake OS Asset API, not a device-security certification.
// HARMONY_TYPESCRIPT_PATH points to the TypeScript compiler bundled with the installed Harmony SDK.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require(process.env.HARMONY_TYPESCRIPT_PATH || 'typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/main/ets/utils/SessionVault.ets'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

function createRuntime(storage = new Map()) {
  let failWrite = false;
  const asset = {
    Tag: { ALIAS: 1, SECRET: 2, RETURN_TYPE: 3, ACCESSIBILITY: 4, CONFLICT_RESOLUTION: 5 },
    ReturnType: { ALL: 1 }, Accessibility: { DEVICE_UNLOCKED: 2 }, ConflictResolution: { OVERWRITE: 0 },
    async add(attributes) {
      if (failWrite) throw { code: 24000008 };
      assert.equal(attributes.get(4), 2);
      const alias = Buffer.from(attributes.get(1)).toString();
      storage.set(alias, new Uint8Array(attributes.get(2)));
    },
    async query(query) {
      const alias = Buffer.from(query.get(1)).toString();
      if (!storage.has(alias)) throw { code: 24000002 };
      return [new Map([[2, storage.get(alias)]])];
    },
    async remove(query) { storage.delete(Buffer.from(query.get(1)).toString()); }
  };
  const util = {
    TextEncoder: class { encodeInto(text) { return new Uint8Array(Buffer.from(text)); } },
    TextDecoder: class { decodeToString(bytes) { return Buffer.from(bytes).toString(); } },
    generateRandomUUID: () => crypto.randomUUID()
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require(name) {
    if (name === '@ohos.security.asset') return { default: asset };
    if (name === '@ohos.util') return { default: util };
    throw new Error('Unexpected dependency: ' + name);
  }});
  return { vault: module.exports.default, storage, failWrites(value) { failWrite = value; } };
}

function checkpoint(sessionId = 'session-one') {
  return { ownerUserId: 'alice', baseUrl: 'https://backend.example', sessionId, role: 'host', stage: 'host_observed',
    placeId: 'library', expiresAt: '2000-01-01T00:00:00Z', touchToken: 'test-only-token',
    challenge: 'abcdef1234567890', hostUserId: 'alice' };
}

test('checkpoint survives process recreation and remains scoped to account and server', async () => {
  const first = createRuntime(); await first.vault.saveNfc(checkpoint());
  const restarted = createRuntime(first.storage);
  assert.equal((await restarted.vault.loadNfc('alice', 'https://backend.example')).challenge, 'abcdef1234567890');
  assert.equal(await restarted.vault.loadNfc('bob', 'https://backend.example'), null);
  assert.equal(await restarted.vault.loadNfc('alice', 'https://other.example'), null);
});

test('expired local checkpoint is retained for authoritative completed-result lookup', async () => {
  const { vault } = createRuntime(); await vault.saveNfc(checkpoint());
  assert.equal((await vault.loadNfc('alice', 'https://backend.example')).expiresAt, '2000-01-01T00:00:00Z');
});

test('queued writes preserve newest state; stale cancellation cannot clear a new session', async () => {
  const { vault } = createRuntime();
  await Promise.all([vault.saveNfc(checkpoint('old')), vault.saveNfc(checkpoint('new')), vault.clearNfc('old')]);
  assert.equal((await vault.loadNfc('alice', 'https://backend.example')).sessionId, 'new');
  await vault.clearNfc('new');
  assert.equal(await vault.loadNfc('alice', 'https://backend.example'), null);
});

test('storage failure is surfaced and does not poison subsequent checkpoint writes', async () => {
  const runtime = createRuntime(); runtime.failWrites(true);
  await assert.rejects(runtime.vault.saveNfc(checkpoint()));
  runtime.failWrites(false);
  await runtime.vault.saveNfc(checkpoint());
  assert.equal((await runtime.vault.loadNfc('alice', 'https://backend.example')).sessionId, 'session-one');
});

function merchantCheckpoint(id = 'merchant-one') {
  return { ...checkpoint(id), stage: 'cancel', touchToken: 'a'.repeat(64), challenge: 'b'.repeat(24) };
}

test('merchant cancellation survives restart/expiry independently of personal journal', async () => {
  const first = createRuntime();
  await first.vault.saveNfc(checkpoint());
  await first.vault.saveMerchant(merchantCheckpoint());
  const restarted = createRuntime(first.storage);
  assert.equal((await restarted.vault.loadMerchant('alice', 'https://backend.example')).stage, 'cancel');
  assert.equal((await restarted.vault.loadNfc('alice', 'https://backend.example')).sessionId, 'session-one');
  assert.equal(await restarted.vault.loadMerchant('bob', 'https://backend.example'), null);
  assert.equal(await restarted.vault.loadMerchant('alice', 'https://other.example'), null);
});

test('merchant writes serialize and stale or cross-account cleanup cannot remove new checkpoint', async () => {
  const r = createRuntime();
  await Promise.all([r.vault.saveMerchant(merchantCheckpoint('old')), r.vault.saveMerchant(merchantCheckpoint('new')),
    r.vault.clearMerchant('old', 'alice', 'https://backend.example')]);
  await r.vault.clearMerchant('new', 'bob', 'https://backend.example');
  await r.vault.clearMerchant('new', 'alice', 'https://other.example');
  assert.equal((await r.vault.loadMerchant('alice', 'https://backend.example')).sessionId, 'new');
  await r.vault.clearMerchant('new', 'alice', 'https://backend.example');
  assert.equal(await r.vault.loadMerchant('alice', 'https://backend.example'), null);
});

test('failed merchant checkpoint write is observable and later retry succeeds', async () => {
  const r = createRuntime(); r.failWrites(true);
  await assert.rejects(r.vault.saveMerchant(merchantCheckpoint()));
  r.failWrites(false); await r.vault.saveMerchant(merchantCheckpoint());
  assert.equal((await r.vault.loadMerchant('alice', 'https://backend.example')).stage, 'cancel');
});

test('malformed merchant checkpoint cannot silently resume', async () => {
  const r = createRuntime();
  for (const change of [{ stage: 'unexpected' }, { touchToken: '' }, { challenge: 'wrong' }, { sessionId: 12 }]) {
    await r.vault.saveMerchant({ ...merchantCheckpoint(), ...change });
    await assert.rejects(r.vault.loadMerchant('alice', 'https://backend.example'));
  }
});
