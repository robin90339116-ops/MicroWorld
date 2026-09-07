'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createFileStore } = require('../src/shared/store');

function fixture(t, fsImpl = fs) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-file-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const dataFile = path.join(directory, 'state.json');
  const seed = { accounts: [], messages: [], userPoints: {} };
  return { directory, dataFile, seed, store: createFileStore({ dataFile, seed, fsImpl }) };
}

test('file state survives recreation and read mutations are not implicitly persisted', async t => {
  const f = fixture(t); await f.store.init();
  const state = { accounts: [{ id: 'user' }], messages: [{ id: 'message', text: '你好' }], userPoints: { user: 5 }, merchantTaps: [{ id: 'tap', reward: { points: 5 } }] };
  f.store.writeRaw(state); await f.store.flush(); await f.store.close();
  const restarted = createFileStore({ dataFile: f.dataFile, seed: f.seed }); await restarted.init();
  assert.deepEqual(restarted.readRaw(), state);
  restarted.readRaw().accounts.length = 0;
  assert.deepEqual(restarted.readRaw(), state);
  assert.equal(fs.statSync(f.dataFile).mode & 0o777, 0o600);
});

test('empty, malformed and non-object existing files fail closed without overwrite', async t => {
  const f = fixture(t);
  for (const bytes of ['', ' ', '{broken-private-content', 'null', '[]', '42', '"text"']) {
    fs.writeFileSync(f.dataFile, bytes);
    const store = createFileStore({ dataFile: f.dataFile, seed: f.seed });
    await assert.rejects(store.init(), { code: 'STORAGE_INVALID_DATA' });
    assert.equal(fs.readFileSync(f.dataFile, 'utf8'), bytes);
  }
});

test('runtime corruption or disappearance never triggers reseeding or stale overwrite', async t => {
  const f = fixture(t); await f.store.init();
  fs.writeFileSync(f.dataFile, '{broken');
  assert.throws(() => f.store.readRaw(), { code: 'STORAGE_INVALID_DATA' });
  assert.throws(() => f.store.writeRaw(f.seed), { code: 'STORAGE_INVALID_DATA' });
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), '{broken');
  fs.unlinkSync(f.dataFile);
  assert.throws(() => f.store.readRaw(), { code: 'STORAGE_READ_FAILED' });
  await assert.rejects(f.store.init(), { code: 'STORAGE_READ_FAILED' });
  assert.equal(fs.existsSync(f.dataFile), false);
});

test('partial write, file fsync, open and rename failures leave previous state intact', async t => {
  for (const fault of ['open', 'partial-write', 'fsync', 'rename']) {
    let enabled = false;
    const io = Object.create(fs);
    io.openSync = (...args) => { if (enabled && fault === 'open' && args[1] === 'wx') throw new Error('disk full'); return fs.openSync(...args); };
    io.writeFileSync = (...args) => {
      if (enabled && fault === 'partial-write') { fs.writeSync(args[0], '{partial'); throw new Error('disk full'); }
      return fs.writeFileSync(...args);
    };
    io.fsyncSync = fd => { if (enabled && fault === 'fsync') throw new Error('io'); return fs.fsyncSync(fd); };
    io.renameSync = (...args) => { if (enabled && fault === 'rename') throw new Error('io'); return fs.renameSync(...args); };
    const f = fixture(t, io); await f.store.init();
    const before = fs.readFileSync(f.dataFile, 'utf8'); enabled = true;
    assert.throws(() => f.store.writeRaw({ accounts: [{ id: 'new' }] }), { code: 'STORAGE_WRITE_FAILED' });
    assert.equal(fs.readFileSync(f.dataFile, 'utf8'), before);
    assert.deepEqual(fs.readdirSync(f.directory), ['state.json']);
    enabled = false; f.store.writeRaw({ accounts: [{ id: 'retry' }] });
    assert.equal(f.store.readRaw().accounts[0].id, 'retry');
  }
});

test('directory fsync failure reports uncertain commit but leaves a complete new JSON file', async t => {
  let enabled = false;
  const io = Object.create(fs);
  io.fsyncSync = fd => { if (enabled && fs.fstatSync(fd).isDirectory()) throw new Error('directory io'); return fs.fsyncSync(fd); };
  const f = fixture(t, io); await f.store.init(); enabled = true;
  assert.throws(() => f.store.writeRaw({ accounts: [{ id: 'committed' }] }), { code: 'STORAGE_COMMIT_UNCERTAIN' });
  assert.deepEqual(f.store.readRaw(), { accounts: [{ id: 'committed' }] });
  assert.deepEqual(fs.readdirSync(f.directory), ['state.json']);
});

test('invalid outgoing states are rejected before touching existing data', async t => {
  const f = fixture(t); await f.store.init(); const before = fs.readFileSync(f.dataFile, 'utf8');
  const circular = {}; circular.self = circular;
  for (const value of [null, undefined, [], 1, 'text', circular, { toJSON: () => null }]) {
    assert.throws(() => f.store.writeRaw(value), { code: 'STORAGE_INVALID_WRITE' });
    assert.equal(fs.readFileSync(f.dataFile, 'utf8'), before);
  }
});

test('read access errors do not reconstruct state; errors do not disclose file contents', async t => {
  let enabled = false;
  const io = Object.create(fs);
  io.readFileSync = (...args) => { if (enabled) throw new Error('secret content'); return fs.readFileSync(...args); };
  const f = fixture(t, io); await f.store.init(); const before = fs.readFileSync(f.dataFile, 'utf8'); enabled = true;
  assert.throws(() => f.store.readRaw(), error => error.code === 'STORAGE_READ_FAILED' && !error.message.includes('secret content'));
  assert.equal(fs.readFileSync(f.dataFile, 'utf8'), before);
});

test('symlink state file is rejected without modifying link or target', async t => {
  const f = fixture(t); const other = path.join(f.directory, 'other.json'); fs.writeFileSync(other, '{"important":true}');
  fs.symlinkSync(other, f.dataFile);
  await assert.rejects(f.store.init(), { code: 'STORAGE_READ_FAILED' });
  assert.equal(fs.lstatSync(f.dataFile).isSymbolicLink(), true);
  assert.equal(fs.readFileSync(other, 'utf8'), '{"important":true}');
});

test('initialization racing an existing file does not overwrite the winner', async t => {
  const io = Object.create(fs);
  io.linkSync = (temporary, target) => {
    fs.writeFileSync(target, '{"winner":true}', { flag: 'wx' });
    fs.linkSync(temporary, target);
  };
  const f = fixture(t, io); await f.store.init();
  assert.deepEqual(f.store.readRaw(), { winner: true });
  assert.deepEqual(fs.readdirSync(f.directory), ['state.json']);
});
