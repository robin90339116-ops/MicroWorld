'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

for (const script of ['database-integration.js', 'database-smoke.js']) {
  test(`${script} fails explicitly without a database URL`, () => {
    const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
      env: { ...process.env, SMALLWORLD_DATABASE_URL: '' }, encoding: 'utf8', timeout: 5000
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /数据库/);
    assert.doesNotMatch(result.stdout, /PASS|passed|listening/);
  });
}
test('database worker refuses direct use against a caller-selected business table', () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'helpers/postgres-worker.js'), 'increment'], {
    env: { ...process.env, SMALLWORLD_DATABASE_TABLE: 'microworld_state', SMALLWORLD_DATABASE_URL: 'postgres://invalid/never_connect' },
    encoding: 'utf8', timeout: 5000
  });
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /postgres:\/\//);
});
