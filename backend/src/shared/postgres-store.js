'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const { checkServerIdentity } = require('node:tls');

function failure(code, message) { const error = new Error(message); error.code = code; return error; }
function cloneState(value) {
  let clone;
  try { clone = JSON.parse(JSON.stringify(value)); } catch {}
  if (!clone || typeof clone !== 'object' || Array.isArray(clone)) throw failure('STORAGE_INVALID_DATA', '数据库状态结构无效，禁止自动覆盖重建');
  return clone;
}

function databaseConnectionOptions(databaseUrl, env = process.env) {
  let parsed;
  try { parsed = new URL(databaseUrl); } catch { throw failure('STORAGE_CONFIGURATION', '数据库连接地址无效'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || [...parsed.searchParams.keys()].some(key => /^ssl/i.test(key))) {
    throw failure('STORAGE_CONFIGURATION', '请使用 PostgreSQL 地址；TLS 参数仅通过专用环境变量配置');
  }
  const mode = String(env.SMALLWORLD_DATABASE_SSL || '').toLowerCase();
  if (!['', 'verify-full', 'disable', 'false', 'off'].includes(mode)) throw failure('STORAGE_CONFIGURATION', '数据库 TLS 模式无效');
  const ssl = ['disable', 'false', 'off'].includes(mode) ? false : {
    rejectUnauthorized: true,
    // pg passes an existing socket to TLS; for IP connections there may be no
    // SNI hostname. Validate the configured endpoint, never TLS's fallback host.
    checkServerIdentity: (_host, cert) => checkServerIdentity(parsed.hostname.replace(/^\[|\]$/g, ''), cert),
    ...(env.SMALLWORLD_DATABASE_CA ? { ca: env.SMALLWORLD_DATABASE_CA } : {})
  };
  const max = Number(env.SMALLWORLD_DATABASE_POOL || 4);
  if (!Number.isInteger(max) || max < 1 || max > 32) throw failure('STORAGE_CONFIGURATION', '数据库连接池大小须为 1–32');
  return { connectionString: databaseUrl, ssl, max, connectionTimeoutMillis: 5000, query_timeout: 5000 };
}

function createPostgresStore({ databaseUrl, seed, PoolClass, env = process.env }) {
  const table = env.SMALLWORLD_DATABASE_TABLE || 'microworld_state';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(table)) throw failure('STORAGE_CONFIGURATION', '数据库表名无效');
  const config = databaseConnectionOptions(databaseUrl, env);
  let Pool = PoolClass;
  if (!Pool) {
    try { Pool = require('pg').Pool; } catch { throw failure('STORAGE_CONFIGURATION', '数据库模式需要安装 pg 驱动，请在 backend 目录安装依赖'); }
  }
  const pool = new Pool(config);
  // Idle connection errors must not terminate Node or expose credential-bearing errors.
  pool.on('error', () => {});
  const contexts = new AsyncLocalStorage();
  const name = `"${table}"`;
  let initialized = false;
  let closed = false;
  function current() {
    const context = contexts.getStore();
    if (!context || !context.active) throw failure('STORAGE_TRANSACTION_REQUIRED', '数据库读写必须位于请求事务内');
    return context;
  }

  return {
    kind: 'postgres',
    async init() {
      if (closed) throw failure('STORAGE_CLOSED', '数据库连接已关闭');
      if (initialized) return;
      try {
        await pool.query(`CREATE TABLE IF NOT EXISTS ${name} (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
        await pool.query(`INSERT INTO ${name}(id, data) VALUES('singleton', $1::jsonb) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(cloneState(seed))]);
        const result = await pool.query(`SELECT data FROM ${name} WHERE id = 'singleton'`);
        cloneState(result.rows[0]?.data);
        initialized = true;
      } catch (error) {
        if (String(error.code || '').startsWith('STORAGE_')) throw error;
        throw failure('STORAGE_UNAVAILABLE', '数据库初始化失败，请检查连接、证书和数据库权限');
      }
    },
    async runRequest(work) {
      if (!initialized || closed) throw failure('STORAGE_UNAVAILABLE', '数据库尚未就绪或已关闭');
      if (contexts.getStore()) throw failure('STORAGE_TRANSACTION_REQUIRED', '不支持嵌套请求事务');
      let client;
      let committing = false;
      let context;
      let releaseError;
      let connectionLost = false;
      const onConnectionError = () => { connectionLost = true; };
      try {
        client = await pool.connect();
        client.on('error', onConnectionError);
        await client.query('BEGIN');
        await client.query("SET LOCAL statement_timeout = '5s'");
        await client.query("SET LOCAL lock_timeout = '3s'");
        await client.query("SET LOCAL idle_in_transaction_session_timeout = '10s'");
        const result = await client.query(`SELECT data FROM ${name} WHERE id = 'singleton' FOR UPDATE`);
        context = { data: cloneState(result.rows[0]?.data), dirty: false, active: true };
        const response = await contexts.run(context, work);
        context.active = false;
        if (connectionLost) throw failure('STORAGE_UNAVAILABLE', '数据库连接已中断，本次事务未确认提交');
        if (context.dirty) {
          const updated = await client.query(`UPDATE ${name} SET data = $1::jsonb, updated_at = now() WHERE id = 'singleton'`, [JSON.stringify(context.data)]);
          if (updated.rowCount !== 1) throw failure('STORAGE_INVALID_DATA', '数据库状态行丢失，未重新创建');
        }
        committing = true;
        await client.query('COMMIT');
        committing = false;
        return response;
      } catch (error) {
        if (context) context.active = false;
        releaseError = error;
        if (client) { try { await client.query('ROLLBACK'); } catch {} }
        if (committing) throw failure('STORAGE_COMMIT_UNCERTAIN', '数据库提交结果未确认，请先查询原操作结果；不会自动重放订单或奖励');
        if (String(error.code || '').startsWith('STORAGE_') || error.response) throw error;
        throw failure('STORAGE_UNAVAILABLE', '数据库操作失败或超时，本次请求未确认成功；请检查连接后重试');
      } finally {
        if (client) {
          client.release(releaseError);
          client.removeListener('error', onConnectionError);
        }
      }
    },
    readRaw() { return cloneState(current().data); },
    writeRaw(data) { const context = current(); context.data = cloneState(data); context.dirty = true; },
    async flush() {}, // No deferred writes: each request waits for its own COMMIT.
    async close() { closed = true; await pool.end(); }
  };
}

module.exports = { createPostgresStore, databaseConnectionOptions };
