'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { fork } = require('node:child_process');
const { createPostgresStore, databaseConnectionOptions } = require('../src/shared/postgres-store');

async function main() {
  const url = String(process.env.SMALLWORLD_DATABASE_URL || '').trim();
  if (!url) throw new Error('需要独立测试数据库地址；不会使用文件或模拟连接代替');
  const { Pool } = require('pg');
  const pool = new Pool(databaseConnectionOptions(url));
  pool.on('error', () => {});
  // Neither operations nor cleanup may use the caller's production table name.
  const table = 'microworld_integration_' + crypto.randomBytes(12).toString('hex');
  const env = { ...process.env, SMALLWORLD_DATABASE_TABLE: table };
  const store = createPostgresStore({ databaseUrl: url, seed: { count: 0 }, env });
  const children = new Set();
  const runs = [];
  function worker(mode) {
    let readyResolve, readyReject;
    const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
    const child = fork(path.join(__dirname, 'helpers/postgres-worker.js'), [mode], {
      env, stdio: ['ignore', 'ignore', 'inherit', 'ipc']
    });
    children.add(child);
    let count;
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
      child.on('message', message => {
        if (message.ready) readyResolve();
        if (Number.isInteger(message.count)) count = message.count;
      });
      child.once('error', error => { clearTimeout(timer); readyReject(error); reject(error); });
      child.once('exit', code => {
        clearTimeout(timer); children.delete(child);
        if (code === 0 && Number.isInteger(count)) { readyResolve(); resolve(count); }
        else { const error = new Error('数据库子进程测试失败或超时'); readyReject(error); reject(error); }
      });
    });
    // These promises are also awaited below; handlers prevent early child
    // failures becoming unhandled rejections while its peer is starting.
    ready.catch(() => {}); done.catch(() => {}); runs.push(done);
    return { child, ready, done };
  }
  try {
    await pool.query('SELECT 1');
    await store.init();
    const first = worker('increment'), second = worker('increment');
    await Promise.all([first.ready, second.ready]);
    first.child.send('start'); second.child.send('start');
    await Promise.all([first.done, second.done]);
    assert.equal(await worker('read').done, 40, 'fresh process must observe all 40 committed writes');
    console.log('PASS: two independent processes commit 40 increments; a fresh process reads 40');

    await assert.rejects(store.runRequest(() => {
      store.writeRaw({ count: 999 }); throw new Error('intentional business rejection');
    }));
    assert.equal(await store.runRequest(() => store.readRaw().count), 40);
    console.log('PASS: business failure rolls back without publishing state');

    const blocker = await pool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query(`SELECT data FROM "${table}" WHERE id = 'singleton' FOR UPDATE`);
      await assert.rejects(store.runRequest(() => assert.fail('locked request must not execute business')), { code: 'STORAGE_UNAVAILABLE' });
    } finally { await blocker.query('ROLLBACK'); blocker.release(); }
    assert.equal(await store.runRequest(() => store.readRaw().count), 40);
    console.log('PASS: real row-lock timeout fails closed, next request recovers');

    await pool.query(`UPDATE "${table}" SET data = '[]'::jsonb WHERE id = 'singleton'`);
    await assert.rejects(store.runRequest(() => store.readRaw()), { code: 'STORAGE_INVALID_DATA' });
    assert.deepEqual((await pool.query(`SELECT data FROM "${table}" WHERE id = 'singleton'`)).rows[0].data, []);
    await pool.query(`DELETE FROM "${table}" WHERE id = 'singleton'`);
    await assert.rejects(store.runRequest(() => store.readRaw()), { code: 'STORAGE_INVALID_DATA' });
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n, 0);
    console.log('PASS: corrupt or missing state is not silently reinitialized');
  } finally {
    for (const child of children) child.kill('SIGKILL');
    await Promise.allSettled(runs);
    await store.close();
    try { await pool.query(`DROP TABLE IF EXISTS "${table}"`); }
    catch { console.error('仅测试表清理失败，请检查：' + table); process.exitCode = 1; }
    await pool.end();
  }
}

main().catch(() => {
  // Driver errors can contain connection details; never echo raw errors.
  console.error('真实 PostgreSQL 数据库集成测试未通过；请核对测试地址、驱动、TLS 和权限，或检查上一项 PASS 后的测试阶段');
  process.exitCode = 1;
});
