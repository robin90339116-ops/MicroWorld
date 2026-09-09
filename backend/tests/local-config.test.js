'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');

function loadExample(extra = {}) {
  // Do not inherit developer database credentials or start a server against user data.
  const result = spawnSync(process.execPath, ['--env-file=.env.example', '-e',
    'console.log(JSON.stringify([process.env.SMALLWORLD_BACKEND_HOST, process.env.SMALLWORLD_DATABASE_URL, process.env.SMALLWORLD_CHAIN_PROVIDER]))'],
  { cwd: root, env: { ...extra }, encoding: 'utf8' });
  assert.equal(result.status, 0, 'Example configuration must load with Node.js 22+');
  return JSON.parse(result.stdout);
}

test('example configuration is loopback-only, file-backed and not connected to a chain', () => {
  assert.deepEqual(loadExample(), ['127.0.0.1', '', 'certificate']);
});

test('explicit process configuration overrides example values without exposing secrets', () => {
  assert.deepEqual(loadExample({ SMALLWORLD_BACKEND_HOST: '0.0.0.0' }), ['0.0.0.0', '', 'certificate']);
});

test('local start requires its env file; deployment start remains unchanged', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
  assert.equal(scripts.start, 'node server.js');
  assert.equal(scripts['start:local'], 'node --env-file=.env server.js');
  assert.equal(scripts['start:example'], 'node --env-file=.env.example server.js');
});
