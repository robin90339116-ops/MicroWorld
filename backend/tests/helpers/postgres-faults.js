'use strict';
const assert = require('node:assert/strict');
const { createPostgresStore } = require('../../src/shared/postgres-store');

async function exerciseDatabaseFaults({ Pool, pool, table, url, env }) {
  if (!/^microworld_integration_[a-f0-9]{24}$/.test(table || '') || env.SMALLWORLD_DATABASE_TABLE !== table) {
    throw new Error('Fault tests require a parent-owned isolated integration table');
  }
  let acquired;
  // Capture only the client checked out by this dedicated test store, never
  // enumerate or terminate unrelated sessions in pg_stat_activity.
  function ObservedPool(config) {
    const observed = new Pool(config);
    observed.on('acquire', client => { acquired = client; });
    return observed;
  }
  const store = createPostgresStore({ databaseUrl: url, seed: { count: 0 }, env, PoolClass: ObservedPool });
  try {
    await store.init();
    const before = await store.runRequest(() => store.readRaw());
    assert.equal(before.count, 40);
    await pool.query(`ALTER TABLE "${table}" ADD CONSTRAINT integration_count_guard CHECK ((data->>'count')::int <= 40)`);
    try {
      let calls = 0;
      await assert.rejects(store.runRequest(() => {
        calls++; store.writeRaw({ count: 41 });
      }), { code: 'STORAGE_UNAVAILABLE' });
      assert.equal(calls, 1, 'failed SQL must not replay business work');
      assert.deepEqual(await store.runRequest(() => store.readRaw()), before);
    } finally { await pool.query(`ALTER TABLE "${table}" DROP CONSTRAINT integration_count_guard`); }
    console.log('PASS: real SQL constraint rejects UPDATE; no state change or automatic replay');

    let calls = 0;
    let terminationObserved = false;
    await assert.rejects(store.runRequest(async () => {
      calls++;
      const client = acquired;
      const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      assert(Number.isInteger(pid) && pid > 0);
      // Force an actual uncommitted database write, not just the store's
      // in-memory staging, before ending this exact session.
      await client.query(`UPDATE "${table}" SET data = $1::jsonb WHERE id = 'singleton'`, [JSON.stringify({ count: 999 })]);
      store.writeRaw({ count: 999 });
      let timer;
      const lost = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('test connection did not report termination')), 4000);
        client.once('error', resolve);
      });
      lost.catch(() => {});
      try {
        const terminated = await pool.query('SELECT pg_terminate_backend($1, 2000) AS stopped', [pid]);
        assert.equal(terminated.rows[0].stopped, true);
        await lost;
        terminationObserved = true;
      } finally { clearTimeout(timer); }
    }), { code: 'STORAGE_UNAVAILABLE' });
    assert.equal(terminationObserved, true, 'must actually terminate the owned connection, not just encounter a business error');
    assert.equal(calls, 1, 'lost connection must not replay business work');
    assert.deepEqual(await store.runRequest(() => store.readRaw()), before);
    await store.runRequest(() => store.writeRaw({ count: 40, recovered: true }));
    assert.deepEqual(await store.runRequest(() => store.readRaw()), { count: 40, recovered: true });
    await store.runRequest(() => store.writeRaw(before));
    console.log('PASS: terminated test transaction rolls back real SQL; same store reconnects and commits');
  } finally { await store.close(); }
}

module.exports = { exerciseDatabaseFaults };
