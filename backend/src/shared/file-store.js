'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function storageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parseState(text) {
  let value;
  try { value = JSON.parse(text); } catch {
    throw storageError('STORAGE_INVALID_DATA', '状态文件为空或损坏，原文件已保留；请先检查备份，不能自动重置账号和业务数据');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw storageError('STORAGE_INVALID_DATA', '状态文件结构无效，原文件已保留，禁止自动重建');
  }
  return value;
}

// Single-process JSON store. Atomic replacement is not a multi-process transaction.
// fsImpl is solely an internal fault-injection seam; no request selects it.
function createFileStore({ dataFile, seed, fsImpl = fs }) {
  const target = path.resolve(dataFile);
  const directory = path.dirname(target);
  let initialized = false;

  function assertRegularFile() {
    const stat = fsImpl.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw storageError('STORAGE_UNSAFE_PATH', '状态文件必须是普通文件，不能是目录或符号链接');
    }
  }

  function readExisting() {
    try {
      assertRegularFile();
      return parseState(fsImpl.readFileSync(target, 'utf8'));
    } catch (error) {
      if (String(error.code || '').startsWith('STORAGE_')) throw error;
      throw storageError('STORAGE_READ_FAILED', '状态文件无法读取，原数据未重建；请检查文件、权限和磁盘');
    }
  }

  function serialize(data) {
    try {
      const text = JSON.stringify(data, null, 2);
      parseState(text);
      return text;
    } catch {
      throw storageError('STORAGE_INVALID_WRITE', '待保存状态必须是可序列化的 JSON 对象，原文件未修改');
    }
  }

  function replace(text, createOnly = false) {
    const temporary = path.join(directory, `.${path.basename(target)}.${crypto.randomUUID()}.tmp`);
    let fd;
    let created = false;
    let published = false;
    try {
      fd = fsImpl.openSync(temporary, 'wx', 0o600);
      created = true;
      fsImpl.writeFileSync(fd, text, 'utf8');
      fsImpl.fsyncSync(fd);
      fsImpl.closeSync(fd);
      fd = undefined;
      if (createOnly) {
        // Concurrent first initialization must never overwrite an existing file.
        fsImpl.linkSync(temporary, target);
        published = true;
        fsImpl.unlinkSync(temporary);
      } else {
        fsImpl.renameSync(temporary, target);
        published = true;
      }
      created = false;
      const directoryFd = fsImpl.openSync(directory, 'r');
      try { fsImpl.fsyncSync(directoryFd); } finally { fsImpl.closeSync(directoryFd); }
    } catch (error) {
      if (createOnly && !published && error.code === 'EEXIST') {
        readExisting();
        return;
      }
      if (published) {
        throw storageError('STORAGE_COMMIT_UNCERTAIN', '状态文件已替换但磁盘同步未确认；请重新查询操作结果，不要重复创建订单或奖励');
      }
      throw storageError('STORAGE_WRITE_FAILED', '状态保存失败，原文件未替换；请检查磁盘空间和权限后重试');
    } finally {
      if (fd !== undefined) { try { fsImpl.closeSync(fd); } catch {} }
      // Only remove the unique temporary file created by this operation.
      if (created) { try { fsImpl.unlinkSync(temporary); } catch {} }
    }
  }

  function ready() {
    if (!initialized) throw storageError('STORAGE_NOT_READY', '状态存储尚未完成初始化');
  }

  return {
    kind: 'json-file',
    async init() {
      if (initialized) { readExisting(); return; }
      let missing = false;
      try { assertRegularFile(); } catch (error) {
        if (error.code !== 'ENOENT') throw storageError('STORAGE_READ_FAILED', '状态文件无法安全打开，未重建原数据');
        missing = true;
      }
      if (missing) {
        const text = serialize(seed);
        fsImpl.mkdirSync(directory, { recursive: true, mode: 0o700 });
        replace(text, true);
      }
      readExisting();
      initialized = true;
    },
    readRaw() { ready(); return readExisting(); },
    writeRaw(data) {
      ready();
      const text = serialize(data);
      // Refuse to overwrite external corruption/deletion with a stale snapshot.
      readExisting();
      replace(text);
    },
    async flush() { ready(); },
    async close() {}
  };
}

module.exports = { createFileStore };
