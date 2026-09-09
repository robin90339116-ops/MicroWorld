'use strict';
const { databaseConnectionOptions } = require('./src/shared/postgres-store');
const { exportBackup, restoreBackup } = require('./src/shared/database-backup');

(async () => {
  const [mode, file, target, ...extra] = process.argv.slice(2);
  if (!file || extra.length || !['export', 'restore'].includes(mode) ||
      (mode === 'restore' && !target) || (mode === 'export' && target)) {
    throw new Error('用法：npm run db:backup -- export 文件路径；或 restore 文件路径 全新表名');
  }
  if (!process.env.SMALLWORLD_DATABASE_URL) throw new Error('必须配置数据库地址；不会回退文件模式');
  const { Pool } = require('pg');
  const pool = new Pool(databaseConnectionOptions(process.env.SMALLWORLD_DATABASE_URL));
  pool.on('error', () => {});
  try {
    if (mode === 'export') await exportBackup(pool, process.env.SMALLWORLD_DATABASE_TABLE || 'microworld_state', file);
    else await restoreBackup(pool, target, file);
    console.log(mode === 'export' ? '备份已写入；包含敏感业务数据，请加密保管，禁止提交 Git。' : '已恢复到全新表；未切换业务配置，请独立验收后再安排切换。');
  } finally { await pool.end(); }
})().catch(error => {
  console.error(error.code === 'RESTORE_COMMIT_UNCERTAIN' ? error.message : '备份/恢复未完成：请检查参数、文件、证书、权限及目标是否已存在；不会覆盖现有备份或表。');
  process.exitCode = 1;
});
