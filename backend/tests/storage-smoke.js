'use strict';
// Isolated real-process test: no production data, credentials, ports or database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'microworld-storage-smoke-'));
const dataFile = path.join(directory, 'state.json');
const root = path.resolve(__dirname, '..');
let child;

async function start() {
  child = spawn(process.execPath, ['-e', `
    const app = require('./server');
    app.server.on('listening', () => process.send({ port: app.server.address().port }));
    app.startServer().catch(() => process.exit(1));
    process.on('message', () => app.server.close(() => process.exit(0)));
  `], { cwd: root, env: { ...process.env,
    SMALLWORLD_BACKEND_HOST: '127.0.0.1', SMALLWORLD_BACKEND_PORT: '0',
    SMALLWORLD_DATA_FILE: dataFile, SMALLWORLD_DATABASE_URL: '', SMALLWORLD_CHAIN_PROVIDER: 'certificate',
    SMALLWORLD_MERCHANT_REGISTRY_FILE: ''
  }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('test server startup timeout')), 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('test server exited before ready: ' + code)); });
    child.once('message', message => { clearTimeout(timer); resolve(`http://127.0.0.1:${message.port}`); });
  });
}

async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const current = child;
  await new Promise(resolve => {
    const timer = setTimeout(() => current.kill('SIGKILL'), 5000);
    current.once('exit', () => { clearTimeout(timer); resolve(); });
    if (current.connected) current.send('stop'); else current.kill('SIGTERM');
  });
}

async function request(base, pathname, body, token) {
  const response = await fetch(base + pathname, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  return { status: response.status, body: await response.json() };
}

(async () => {
  try {
    let base = await start();
    const credentials = { email: 'storage-test@example.test', password: 'OnlyForLocalTest123', displayName: 'Storage Test', deviceId: 'storage-test-device' };
    const registered = await request(base, '/api/auth/register', credentials);
    assert.equal(registered.status, 201);
    const token = registered.body.token;
    const userId = registered.body.user.id;
    await stop();
    base = await start();
    const restored = await request(base, '/api/auth/me', undefined, token);
    assert.equal(restored.status, 200); assert.equal(restored.body.user.id, userId);
    const valid = fs.readFileSync(dataFile);
    const corrupt = '{private-test-only-corruption';
    fs.writeFileSync(dataFile, corrupt);
    const rejected = await request(base, '/api/auth/me', undefined, token);
    assert.equal(rejected.status, 503); assert.equal(rejected.body.error, 'STORAGE_INVALID_DATA');
    assert.equal(fs.readFileSync(dataFile, 'utf8'), corrupt);
    assert.ok(!JSON.stringify(rejected.body).includes('private-test-only'));
    fs.unlinkSync(dataFile);
    const missing = await request(base, '/api/auth/me', undefined, token);
    assert.equal(missing.status, 503); assert.equal(fs.existsSync(dataFile), false);
    // Explicit test-only restoration of the captured valid fixture.
    fs.writeFileSync(dataFile, valid);
    await stop(); base = await start();
    const login = await request(base, '/api/auth/login', credentials);
    assert.equal(login.status, 200); assert.equal(login.body.user.id, userId);
    assert.equal(fs.readdirSync(directory).filter(name => name.endsWith('.tmp')).length, 0);
    console.log('Storage process smoke passed: registration/session survive restart; corruption/missing file fails closed without reseeding.');
  } finally {
    await stop();
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
