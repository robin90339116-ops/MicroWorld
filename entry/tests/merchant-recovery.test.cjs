'use strict';
// Exercise actual page recovery methods without rendering ArkUI or accessing a device.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.HARMONY_TYPESCRIPT_PATH || 'typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/main/ets/pages/Index.ets'), 'utf8');
const names = ['cancelMerchantSession', 'sendMerchantCancellation', 'restoreMerchantSession', 'applyMerchantSnapshot', 'saveMerchantStage'];
const methods = names.map(name => {
  const match = new RegExp(`^  private (?:async )?${name}\\(`, 'm').exec(source);
  assert.ok(match, name);
  const end = source.indexOf('\n  private ', match.index + 1);
  assert.ok(end > match.index, name);
  return source.slice(match.index, end);
});
const compiled = ts.transpileModule(`export default class Page { ${methods.join('\n')} }`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
class ApiResponseError extends Error { constructor(status) { super(String(status)); this.status = status; } }
const checkpoint = (stage = 'confirm') => ({ ownerUserId: 'buyer', baseUrl: 'https://backend.example', sessionId: 's',
  role: 'reader', stage, placeId: 'coffee', expiresAt: '2000-01-01T00:00:00Z', touchToken: 'a'.repeat(64),
  challenge: 'b'.repeat(24), hostUserId: 'host' });
function harness(saved = checkpoint()) {
  let stored = structuredClone(saved), failWrite = false;
  const calls = [];
  const vault = {
    async loadMerchant() { return structuredClone(stored); },
    async saveMerchant(value) { calls.push('save:' + value.stage); if (failWrite) throw new Error('storage unavailable'); stored = structuredClone(value); },
    async clearMerchant() { calls.push('clear'); stored = null; }
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, SessionVault: vault, ApiResponseError,
    clearTimeout() {}, clearInterval() {}, console });
  const page = new module.exports.default();
  Object.assign(page, { authToken: 'auth', currentUserId: 'buyer', apiBaseUrl: 'https://backend.example',
    merchantRecord: structuredClone(saved), merchantBusy: false, merchantGeneration: 0, merchantStatus: '',
    merchantPollTimer: -1, merchantTimer: -1, merchantReviewed: false, merchantCanConfirm: false,
    nfcManager: { stop() { calls.push('stop'); } },
    stopNfc() { this.merchantGeneration++; this.merchantRecord = null; },
    go(value) { this.page = value; }, startMerchantPolling() { calls.push('poll'); },
    activateMerchantHost() { calls.push('hce'); },
    mapValue(value) { return value && typeof value === 'object' ? value : {}; },
    textValue(value, fallback = '') { return typeof value === 'string' ? value : fallback; },
    numberText(value, fallback = '0') { return typeof value === 'number' ? String(value) : fallback; },
    async apiPost() { calls.push('post'); return { session: { id: 's', role: 'reader', status: 'cancelled' } }; },
    async apiGet() { calls.push('get'); throw new ApiResponseError(404); }
  });
  return { page, calls, stored: () => stored, failWrites() { failWrite = true; } };
}

test('cancel requires durable intent before network call; failed save never sends cancellation', async () => {
  const h = harness(); h.failWrites();
  await h.page.cancelMerchantSession();
  assert.equal(h.calls.includes('post'), false);
  assert.equal(h.stored().stage, 'confirm');
  assert.match(h.page.merchantStatus, /取消未确认/);
});

test('confirmed server cancellation clears checkpoint only after save and response', async () => {
  const h = harness(); await h.page.cancelMerchantSession();
  assert.ok(h.calls.indexOf('save:cancel') < h.calls.indexOf('post'));
  assert.ok(h.calls.indexOf('post') < h.calls.indexOf('clear'));
  assert.equal(h.stored(), null);
  assert.match(h.page.merchantStatus, /服务端已取消/);
});

test('restart with cancellation intent retries cancel instead of confirming or opening NFC', async () => {
  const h = harness(checkpoint('cancel'));
  await h.page.restoreMerchantSession();
  assert.equal(h.calls.filter(value => value === 'post').length, 1);
  assert.equal(h.calls.includes('hce'), false);
  assert.equal(h.stored(), null);
});

test('expired local record recovers committed reward using GET only, without mint/confirmation', async () => {
  const h = harness();
  h.page.apiGet = async () => { h.calls.push('get'); return { session: {
    id: 's', role: 'reader', status: 'consumed', tapId: 'tap', placeName: 'Coffee', checkedIn: true, reviewed: true,
    reward: { medal: { tokenId: 'original-token', name: 'Original' }, points: { awarded: 5, total: 10 } }
  } }; };
  await h.page.restoreMerchantSession();
  assert.equal(h.calls.includes('post'), false);
  assert.equal(h.page.merchantCanContinue, true);
  assert.match(h.page.merchantRewardBadge, /original-token/);
  assert.equal(h.stored().sessionId, 's');
});

test('reader GET 404 retains checkpoint and requires explicit confirmation', async () => {
  const h = harness(); await h.page.restoreMerchantSession();
  assert.equal(h.page.merchantCanConfirm, true);
  assert.equal(h.calls.includes('post'), false);
  assert.equal(h.calls.includes('clear'), false);
  assert.equal(h.page.merchantPending.challenge, 'b'.repeat(24));
});

test('cancel losing race displays committed result and keeps recovery record', async () => {
  const h = harness();
  h.page.apiPost = async () => { h.calls.push('post'); throw new ApiResponseError(409); };
  h.page.apiGet = async () => ({ session: { id: 's', role: 'reader', status: 'consumed', tapId: 'tap' } });
  await h.page.cancelMerchantSession();
  assert.match(h.page.merchantStatus, /不能取消/);
  assert.equal(h.calls.includes('clear'), false);
  assert.equal(h.page.merchantCanContinue, true);
});

test('invalid server response never destroys the saved intent', async () => {
  const h = harness(); h.page.apiPost = async () => ({ session: { id: 'other', role: 'reader', status: 'cancelled' } });
  await h.page.cancelMerchantSession();
  assert.equal(h.calls.includes('clear'), false);
  assert.equal(h.stored().stage, 'cancel');
});
