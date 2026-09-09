'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

async function main() {
  if (!process.argv.includes('--isolated-docker')) throw new Error('explicit isolated mode required');
  const run = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  run(['info', '--format', '{{.ServerVersion}}']);
  const id = 'microworld-image-test-' + crypto.randomBytes(10).toString('hex');
  const image = id + ':test', volume = id + '-data';
  let imageBuilt = false, volumeCreated = false, containerCreated = false;
  let base;
  async function request(route, body, token) {
    const response = await fetch(base + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000)
    });
    return { status: response.status, body: await response.json() };
  }
  async function start() {
    run(['create', '--name', id, '--read-only', '--tmpfs', '/tmp',
      '-p', '127.0.0.1::8787', '-v', `${volume}:/data`,
      '-e', 'SMALLWORLD_CHAIN_PROVIDER=certificate', image]);
    containerCreated = true;
    run(['start', id]);
    const binding = run(['port', id, '8787/tcp']);
    assert.match(binding, /^127\.0\.0\.1:\d+$/);
    base = 'http://' + binding;
    for (let i = 0; i < 30; i++) {
      try { const health = await request('/health'); if (health.status === 200) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error('image did not become healthy');
  }
  function stop() {
    run(['stop', '--time', '15', id]);
    assert.equal(run(['inspect', '--format', '{{.State.ExitCode}}', id]), '0', 'SIGTERM must drain and exit cleanly');
    run(['rm', id]); containerCreated = false;
  }
  try {
    run(['build', '-t', image, path.join(__dirname, '..')]); imageBuilt = true;
    run(['run', '--rm', '--read-only', image, 'node', '-e', `
      const fs=require('fs'),a=require('node:assert/strict');
      a.notEqual(process.getuid(),0); require('pg'); require('./src/shared/database-backup');
      a(fs.existsSync('database-backup.js'));
      for(const p of ['data.json','.env','backups','tests','docs'])a.equal(fs.existsSync(p),false);
    `]);
    console.log('PASS: clean image builds, includes runtime/backup driver, excludes local data, and runs non-root');
    run(['volume', 'create', volume]); volumeCreated = true;
    await start();
    const credentials = { email: 'container@example.test', password: 'ContainerFixture123', displayName: 'Container Test', deviceId: 'container-fixture' };
    const registered = await request('/api/auth/register', credentials);
    assert.equal(registered.status, 201);
    const token = registered.body.token, userId = registered.body.user.id;
    assert.equal(typeof token, 'string');
    stop();
    await start();
    const me = await request('/api/auth/me', undefined, token);
    assert.equal(me.status, 200); assert.equal(me.body.user.id, userId);
    const login = await request('/api/auth/login', credentials);
    assert.equal(login.status, 200); assert.equal(login.body.user.id, userId);
    stop();
    console.log('PASS: read-only non-root container supports registration; account/session survive container replacement; SIGTERM exits cleanly');
  } finally {
    // Only invocation-owned disposable resources are removed, never prune.
    try { if (containerCreated) run(['rm', '-f', id]); }
    finally {
      try { if (volumeCreated) run(['volume', 'rm', volume]); }
      finally { if (imageBuilt) run(['image', 'rm', image]); }
    }
  }
}
main().catch(() => { console.error('隔离后端镜像验收失败，请检查最后一项 PASS 后的阶段；不输出账号或令牌。'); process.exitCode = 1; });
