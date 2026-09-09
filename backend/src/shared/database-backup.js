'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const LIMIT = 64 * 1024 * 1024;
function tableName(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value || '')) throw new Error('Invalid backup table');
  return `"${value}"`;
}
function state(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup state');
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function encode(data) {
  const payload = JSON.stringify(state(data));
  const output = JSON.stringify({ format: 'microworld-state', version: 1, createdAt: new Date().toISOString(), sha256: digest(payload), payload });
  if (Buffer.byteLength(output) > LIMIT) throw new Error('Backup exceeds 64 MiB');
  return output;
}
function decode(text) {
  if (Buffer.byteLength(text) > LIMIT) throw new Error('Backup exceeds 64 MiB');
  const backup = JSON.parse(text);
  if (!backup || backup.format !== 'microworld-state' || backup.version !== 1 ||
      typeof backup.payload !== 'string' || backup.sha256 !== digest(backup.payload)) throw new Error('Invalid backup format or checksum');
  return state(JSON.parse(backup.payload));
}
function readBackup(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const info = fs.fstatSync(fd);
    if (!info.isFile() || info.size > LIMIT) throw new Error('Invalid backup file');
    return decode(fs.readFileSync(fd, 'utf8'));
  } finally { fs.closeSync(fd); }
}
function writeBackup(file, data) {
  const output = encode(data);
  const target = path.resolve(file);
  const dir = fs.mkdtempSync(path.join(path.dirname(target), '.microworld-backup-'));
  const temporary = path.join(dir, 'snapshot');
  try {
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, output); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    // Publish a complete file without replacing an existing backup or symlink.
    fs.linkSync(temporary, target);
    const parent = fs.openSync(path.dirname(target), 'r');
    try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
async function exportBackup(pool, table, file) {
  // One SELECT is one consistent committed snapshot. No store.init or seeding.
  const result = await pool.query(`SELECT data FROM ${tableName(table)} WHERE id = 'singleton'`);
  if (result.rows.length !== 1) throw new Error('Missing backup state');
  writeBackup(file, result.rows[0].data);
}
async function restoreBackup(pool, table, file) {
  const name = tableName(table);
  const data = readBackup(file); // Validate before taking any database action.
  const client = await pool.connect();
  let committing = false;
  let releaseError;
  const onError = error => { releaseError = error; };
  client.on('error', onError);
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '3s'");
    // Intentionally no IF NOT EXISTS, DROP, TRUNCATE, or UPDATE: restoration
    // can only create a fresh table, even if another writer races this command.
    await client.query(`CREATE TABLE ${name} (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    await client.query(`INSERT INTO ${name}(id, data) VALUES('singleton', $1::jsonb)`, [JSON.stringify(data)]);
    if (releaseError) throw releaseError;
    committing = true;
    await client.query('COMMIT');
  } catch (error) {
    releaseError = error;
    try { await client.query('ROLLBACK'); } catch {}
    const safe = new Error(committing ? '恢复提交结果不确定，请先核对新表；不会自动重试' : '恢复未完成，请核对文件和数据库权限；已有表禁止覆盖');
    safe.code = committing ? 'RESTORE_COMMIT_UNCERTAIN' : 'RESTORE_FAILED';
    throw safe;
  } finally { client.release(releaseError); client.removeListener('error', onError); }
}
module.exports = { encode, decode, readBackup, writeBackup, exportBackup, restoreBackup };
