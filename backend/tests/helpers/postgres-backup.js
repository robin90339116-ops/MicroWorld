'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { exportBackup, restoreBackup, readBackup } = require('../../src/shared/database-backup');
const { createPostgresStore } = require('../../src/shared/postgres-store');

async function exerciseBackup({ pool, table, url, env }) {
  assert.match(table, /^microworld_integration_[a-f0-9]{24}$/);
  const target = table + '_restored';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-backup-test-'));
  let created = false;
  try {
    const file = path.join(dir, 'state.mwbackup.json');
    await exportBackup(pool, table, file);
    assert.deepEqual(readBackup(file), { count: 40 });
    await restoreBackup(pool, target, file); created = true;
    // Verify before initialization to ensure missing data cannot be reseeded.
    assert.deepEqual((await pool.query(`SELECT data FROM "${target}" WHERE id = 'singleton'`)).rows, [{ data: { count: 40 } }]);
    const restored = createPostgresStore({ databaseUrl: url, seed: { count: -1 }, env: { ...env, SMALLWORLD_DATABASE_TABLE: target } });
    try {
      await restored.init();
      assert.equal(await restored.runRequest(() => restored.readRaw().count), 40);
      await restored.runRequest(() => restored.writeRaw({ count: 41 }));
    } finally { await restored.close(); }
    await assert.rejects(restoreBackup(pool, target, file), { code: 'RESTORE_FAILED' });
    assert.deepEqual((await pool.query(`SELECT data FROM "${target}" WHERE id = 'singleton'`)).rows, [{ data: { count: 41 } }]);
    assert.deepEqual((await pool.query(`SELECT data FROM "${table}" WHERE id = 'singleton'`)).rows, [{ data: { count: 40 } }]);
    console.log('PASS: backup restores into a new table, supports new writes, and refuses overwriting existing state');
  } finally {
    try { if (created) await pool.query(`DROP TABLE "${target}"`); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
}
module.exports = { exerciseBackup };
