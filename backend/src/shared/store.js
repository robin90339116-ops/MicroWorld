'use strict';

// 可插拔状态持久层。
//
// - file 驱动(默认):把整份应用状态写入单个 JSON 文件,保持同步读写,
//   使用同目录临时文件、fsync 和原子替换；异常文件保留并拒绝服务。
//   仅适合单进程使用，不是数据库事务或多实例一致性方案。
// - postgres 驱动:面向华为云 GaussDB(openGauss)/ RDS for PostgreSQL,
//   以「单行 JSONB 文档 + 内存缓存」的方式落库,对上层仍暴露同步的
//   readRaw()/writeRaw(),因此 server.js 里的 readData()/writeData()
//   及所有业务模块无需改成异步。
//
// 只有设置了 SMALLWORLD_DATABASE_URL 时才会加载 postgres 驱动与 `pg` 依赖;
// 未设置时整条数据库代码路径都不会被触及,file 模式保持零第三方依赖。

const { createFileStore } = require('./file-store');

function cloneSeed(seed) {
  return JSON.parse(JSON.stringify(seed));
}

// ---------------------------------------------------------------------------
// Postgres / 华为云 GaussDB(openGauss)/ RDS for PostgreSQL 驱动
// ---------------------------------------------------------------------------
function createPostgresStore({ databaseUrl, seed }) {
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch (error) {
    throw new Error(
      '已设置 SMALLWORLD_DATABASE_URL,但未安装 pg 驱动。请先在 backend 目录执行 `npm install` 再启动。'
    );
  }

  function resolveSsl() {
    const mode = String(process.env.SMALLWORLD_DATABASE_SSL || '').toLowerCase();
    if (mode === 'disable' || mode === 'false' || mode === 'off') {
      return false;
    }
    const ca = process.env.SMALLWORLD_DATABASE_CA;
    if (ca && ca.trim().length > 0) {
      return { ca, rejectUnauthorized: true };
    }
    // 华为云 RDS/GaussDB 默认开启 SSL,证书多为云侧自签。默认建立加密链路但不校验证书链;
    // 生产环境建议把下载的 CA 证书内容放进 SMALLWORLD_DATABASE_CA 以开启完整校验。
    return { rejectUnauthorized: false };
  }

  const tableName = String(process.env.SMALLWORLD_DATABASE_TABLE || 'microworld_state')
    .replace(/[^a-zA-Z0-9_]/g, '') || 'microworld_state';
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: resolveSsl(),
    max: Number(process.env.SMALLWORLD_DATABASE_POOL || 4)
  });

  let cache = null;
  let dirty = false;
  let flushing = null;

  async function persist() {
    if (!dirty) {
      return;
    }
    dirty = false;
    const snapshot = JSON.stringify(cache);
    await pool.query(
      `INSERT INTO ${tableName}(id, data, updated_at) VALUES('singleton', $1::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [snapshot]
    );
  }

  function scheduleFlush() {
    if (flushing) {
      return;
    }
    flushing = Promise.resolve()
      .then(() => persist())
      .catch(error => {
        dirty = true; // 落库失败,保留脏标记等待下次写入或关闭时重试
        console.error(`[MicroWorld] 状态写入数据库失败,将重试: ${error.message}`);
      })
      .finally(() => {
        flushing = null;
        if (dirty) {
          scheduleFlush();
        }
      });
  }

  return {
    kind: 'huawei-gaussdb',
    async init() {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
           id text PRIMARY KEY,
           data jsonb NOT NULL,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`
      );
      const result = await pool.query(`SELECT data FROM ${tableName} WHERE id = 'singleton'`);
      if (result.rows.length > 0 && result.rows[0].data) {
        cache = result.rows[0].data;
      } else {
        cache = cloneSeed(seed);
        await pool.query(
          `INSERT INTO ${tableName}(id, data) VALUES('singleton', $1::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [JSON.stringify(cache)]
        );
      }
    },
    readRaw() {
      // 返回深拷贝,业务模块对返回对象的改动只有在 writeRaw 时才写回缓存/数据库。
      return cloneSeed(cache);
    },
    writeRaw(data) {
      cache = data;
      dirty = true;
      scheduleFlush();
    },
    async flush() {
      // 等待进行中的写入完成,并确保最后一次脏数据落库(关闭前调用)。
      while (flushing) {
        await flushing;
      }
      await persist();
    },
    async close() {
      await pool.end();
    }
  };
}

// ---------------------------------------------------------------------------
// 工厂:按环境变量选择驱动
// ---------------------------------------------------------------------------
function createStore({ databaseUrl, dataFile, seed }) {
  const url = String(databaseUrl || '').trim();
  if (url.length > 0) {
    return createPostgresStore({ databaseUrl: url, seed });
  }
  return createFileStore({ dataFile, seed });
}

module.exports = { createStore, createFileStore, createPostgresStore };
