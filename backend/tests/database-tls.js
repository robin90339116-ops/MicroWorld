'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { databaseConnectionOptions, createPostgresStore } = require('../src/shared/postgres-store');

async function main() {
  if (!process.argv.includes('--isolated-docker')) throw new Error('需要显式选择隔离 Docker 数据库测试');
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('禁止全局禁用 TLS 校验');
  const { Client } = require('pg');
  const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  run('docker', ['info', '--format', '{{.ServerVersion}}']);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-tls-'));
  // Public certificate/config must be readable by the container's postgres
  // account; private fixture keys remain owner-only (0600).
  fs.chmodSync(dir, 0o755);
  const name = 'microworld-tls-' + crypto.randomBytes(10).toString('hex');
  let created = false;
  try {
    for (const stem of ['server', 'untrusted']) {
      run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
        '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost',
        '-keyout', path.join(dir, stem + '.key'), '-out', path.join(dir, stem + '.crt')]);
      fs.chmodSync(path.join(dir, stem + '.key'), 0o600);
    }
    fs.writeFileSync(path.join(dir, 'pg_hba.conf'), 'local all all trust\nhostssl all all all scram-sha-256\nhostnossl all all all reject\n');
    // The only shell operations copy disposable fixtures inside this test
    // container; no host PostgreSQL config or key is changed.
    run('docker', ['create', '--name', name, '-p', '127.0.0.1::5432',
      '-v', `${dir}:/fixtures:ro`, '-e', 'POSTGRES_PASSWORD=isolated_tls_only',
      '-e', 'POSTGRES_USER=microworld_test', '-e', 'POSTGRES_DB=microworld_test',
      '--entrypoint', 'sh', 'postgres:16-alpine', '-c',
      'cp /fixtures/server.key /tmp/server.key && chown postgres:postgres /tmp/server.key && chmod 600 /tmp/server.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/fixtures/server.crt -c ssl_key_file=/tmp/server.key -c hba_file=/fixtures/pg_hba.conf']);
    created = true;
    run('docker', ['start', name]);
    const binding = run('docker', ['port', name, '5432/tcp']);
    assert.match(binding, /^127\.0\.0\.1:\d+$/);
    const port = binding.split(':')[1];
    let url = `postgres://microworld_test:isolated_tls_only@localhost:${port}/microworld_test`;
    const ca = fs.readFileSync(path.join(dir, 'server.crt'), 'utf8');
    const env = { SMALLWORLD_DATABASE_CA: ca, SMALLWORLD_DATABASE_TABLE: 'tls_state' };
    async function connect(address, options) {
      const client = new Client(databaseConnectionOptions(address, options));
      try {
        await client.connect();
        const result = await client.query('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
        return result.rows[0]?.ssl;
      } finally { await client.end(); }
    }
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { ready = await connect(url, env); if (ready) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, 'trusted certificate must establish a real TLS session');
    console.log('PASS: trusted certificate establishes PostgreSQL TLS (pg_stat_ssl=true)');
    for (const options of [{}, { SMALLWORLD_DATABASE_CA: fs.readFileSync(path.join(dir, 'untrusted.crt'), 'utf8') }]) {
      await assert.rejects(connect(url, options), error => /CERT|SELF_SIGNED|ISSUER/.test(error.code || ''));
    }
    console.log('PASS: missing trust and unrelated trust certificate are rejected');
    await assert.rejects(connect(url.replace('@localhost:', '@127.0.0.1:'), env), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    console.log('PASS: certificate identity mismatch is rejected for an IP address');
    await assert.rejects(connect(url, { SMALLWORLD_DATABASE_SSL: 'disable' }), { code: '28000' });
    console.log('PASS: TLS-only database rejects plaintext connections');
    const store = createPostgresStore({ databaseUrl: url, seed: { count: 0 }, env });
    try {
      await store.init();
      await store.runRequest(() => store.writeRaw({ count: 1 }));
      assert.equal(await store.runRequest(() => store.readRaw().count), 1);
    } finally { await store.close(); }
    console.log('PASS: production store commits and reads back over verified TLS');
    const interrupted = new Client(databaseConnectionOptions(url, env));
    interrupted.on('error', () => {});
    try {
      await interrupted.connect();
      await interrupted.query('BEGIN');
      await interrupted.query("UPDATE tls_state SET data = '{\"count\":999}'::jsonb WHERE id = 'singleton'");
      // Target only the container created by this invocation; keep its volume
      // so startup must recover the original cluster, not seed a replacement.
      run('docker', ['kill', '--signal=KILL', name]);
    } finally { await interrupted.end(); }
    run('docker', ['start', name]);
    // Docker can allocate a different ephemeral host port on restart.
    const recoveredBinding = run('docker', ['port', name, '5432/tcp']);
    assert.match(recoveredBinding, /^127\.0\.0\.1:\d+$/);
    url = `postgres://microworld_test:isolated_tls_only@localhost:${recoveredBinding.split(':')[1]}/microworld_test`;
    console.log('Restart endpoint rediscovered; port changed: ' + (recoveredBinding !== binding));
    ready = false;
    for (let i = 0; i < 30; i++) {
      try { ready = await connect(url, env); if (ready) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, 'same database container must recover after SIGKILL');
    // Read directly BEFORE store.init(), which would seed a missing singleton.
    // This ensures accidental data loss/reinitialization cannot pass the test.
    const recovered = new Client(databaseConnectionOptions(url, env));
    try {
      await recovered.connect();
      const rows = (await recovered.query("SELECT data FROM tls_state WHERE id = 'singleton'")).rows;
      assert.deepEqual(rows, [{ data: { count: 1 } }]);
    } finally { await recovered.end(); }
    const restarted = createPostgresStore({ databaseUrl: url, seed: { count: -1 }, env });
    try {
      await restarted.init();
      assert.equal(await restarted.runRequest(() => restarted.readRaw().count), 1);
      await restarted.runRequest(() => restarted.writeRaw({ count: 2 }));
      assert.equal(await restarted.runRequest(() => restarted.readRaw().count), 2);
    } finally { await restarted.close(); }
    console.log('PASS: PostgreSQL SIGKILL recovery preserves committed data, rolls back uncommitted SQL, and accepts new commits');
    const smoke = spawnSync(process.execPath, [path.join(__dirname, 'database-smoke.js')], {
      env: { ...process.env, SMALLWORLD_DATABASE_URL: url, SMALLWORLD_DATABASE_CA: ca, SMALLWORLD_DATABASE_SSL: 'verify-full' },
      stdio: 'inherit', timeout: 120000
    });
    assert.equal(smoke.status, 0, 'complete HTTP regression must pass on verified TLS');
  } finally {
    try { if (created) run('docker', ['rm', '-f', '-v', name]); }
    finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
}

main().catch(() => { console.error('隔离 PostgreSQL TLS 验收失败；检查最后一项 PASS 后的阶段（不输出私钥或连接凭据）'); process.exitCode = 1; });
