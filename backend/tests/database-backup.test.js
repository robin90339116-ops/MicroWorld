'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encode, decode, writeBackup, readBackup, restoreBackup } = require('../src/shared/database-backup');

test('backup preserves nested state and rejects tampering, unsupported versions and invalid roots', () => {
  const value = { accounts: [{ id: 'fixture', interests: ['音乐'] }], sessions: [], reward: { points: 5 } };
  assert.deepEqual(decode(encode(value)), value);
  const corrupted = JSON.parse(encode(value)); corrupted.payload += ' ';
  assert.throws(() => decode(JSON.stringify(corrupted)), /checksum/);
  const version = JSON.parse(encode(value)); version.version = 2;
  assert.throws(() => decode(JSON.stringify(version)), /format/);
  for (const value of [null, [], 'text']) assert.throws(() => encode(value));
});
test('backup publication is private and refuses existing files or symlinks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-backup-test-'));
  try {
    const file = path.join(dir, 'state.mwbackup.json');
    writeBackup(file, { count: 1 });
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.throws(() => writeBackup(file, { count: 2 }), { code: 'EEXIST' });
    assert.deepEqual(readBackup(file), { count: 1 });
    const link = path.join(dir, 'link'); fs.symlinkSync(file, link);
    assert.throws(() => writeBackup(link, { count: 3 }), { code: 'EEXIST' });
    assert.throws(() => readBackup(link));
    assert.equal(fs.readdirSync(dir).length, 2, 'temporary publishing directories must be cleaned');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('invalid restoration cannot connect to or mutate a database', async () => {
  const pool = { connect() { assert.fail('must validate before connecting'); } };
  await assert.rejects(restoreBackup(pool, 'x;DROP TABLE accounts', '/missing'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-backup-test-'));
  try {
    const file = path.join(dir, 'corrupt'); fs.writeFileSync(file, '{}');
    await assert.rejects(restoreBackup(pool, 'new_table', file));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('restore rolls back SQL failure and reports lost commit acknowledgement without replay', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-backup-test-'));
  try {
    const file = path.join(dir, 'state'); writeBackup(file, { count: 40 });
    for (const failAt of ['INSERT', 'COMMIT']) {
      const queries = []; let released = false;
      const client = {
        on() {}, removeListener() {}, release(error) { assert(error); released = true; },
        async query(sql) { queries.push(sql); if (sql.startsWith(failAt)) throw new Error('private connection details'); }
      };
      await assert.rejects(restoreBackup({ async connect() { return client; } }, 'new_table', file), {
        code: failAt === 'INSERT' ? 'RESTORE_FAILED' : 'RESTORE_COMMIT_UNCERTAIN'
      });
      assert.equal(queries.filter(sql => sql.startsWith(failAt)).length, 1);
      assert.equal(queries.at(-1), 'ROLLBACK');
      assert.equal(released, true);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
