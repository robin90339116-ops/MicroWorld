'use strict';
const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { databaseConnectionOptions } = require('../src/shared/postgres-store');

(async () => {
  const url = String(process.env.SMALLWORLD_DATABASE_URL || '').trim();
  if (!url) throw new Error('必须提供测试数据库地址；不会退回文件模式伪报数据库测试通过');
  const config = databaseConnectionOptions(url);
  let Pool;
  try { Pool = require('pg').Pool; } catch { throw new Error('请先安装 backend 的 pg 依赖'); }
  // Never use a caller-supplied production table, even on failure cleanup.
  const table = 'microworld_smoke_' + crypto.randomBytes(12).toString('hex');
  const pool = new Pool(config);
  pool.on('error', () => {});
  try {
    await pool.query('SELECT 1');
    const child = spawn(process.execPath, [path.join(__dirname, 'smoke.js')], {
      env: { ...process.env, SMALLWORLD_DATABASE_TABLE: table, SMALLWORLD_SMOKE_DB_ISOLATED: '1', SMALLWORLD_CHAIN_PROVIDER: 'certificate' },
      stdio: 'inherit'
    });
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    if (code !== 0) throw new Error('数据库接口回归未通过');
    console.log('PostgreSQL isolated HTTP smoke passed; this is not a Huawei Cloud certification.');
  } finally {
    try { await pool.query(`DROP TABLE IF EXISTS "${table}"`); }
    catch { console.error('测试表清理失败，请管理员核对：' + table); process.exitCode = 1; }
    await pool.end();
  }
})().catch(error => {
  // Database errors may embed hosts/users/passwords; do not print raw driver errors.
  console.error(error.code ? '数据库验证失败，请检查测试连接、TLS 与权限' : error.message);
  process.exitCode = 1;
});
