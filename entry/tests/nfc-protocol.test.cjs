'use strict';
// Real ETS manager transpiled with the SDK, injected NFC transport; not real hardware.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.HARMONY_TYPESCRIPT_PATH || 'typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/main/ets/utils/NfcPeerManager.ets'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function runtime() {
  let callback, response;
  const callbacks = [], transmissions = [];
  const card = { hasHceCapability: () => true, HceService: class {
    on(_event, handler) { callback = handler; callbacks.push(handler); }
    start() {} stop() {}
    async transmit(bytes) { response = bytes; transmissions.push(bytes); }
  } };
  let rewrite = value => value;
  let delay = async () => {};
  const tag = { ISO_DEP: 1, on() {}, off() {}, getIsoDep() { return {
    connect() {}, setTimeout() {}, resetConnection() {},
    async transmit(command) {
      callback(null, command);
      const bytes = response;
      await delay();
      return rewrite(bytes);
    }
  }; } };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, console, require(name) {
    if (name === '@ohos.nfc.cardEmulation') return { default: card };
    if (name === '@ohos.nfc.tag') return { default: tag };
    if (name === '@ohos.util') return { default: { generateRandomUUID: () => 'abcdef12-3456-7890-abcd-ef1234567890' } };
    throw new Error(name);
  } });
  const make = () => new module.exports.default({ bundleName: 'com.microworld.app', abilityName: 'EntryAbility' });
  const host = make(), reader = make();
  return { host, reader, callbacks, transmissions, rewrite(fn) { rewrite = fn; }, delay(fn) { delay = fn; } };
}
const payload = purpose => ({ purpose, sessionId: 'session', touchToken: 'a'.repeat(64), placeId: 'coffee', hostUserId: 'host', expiresAt: new Date(Date.now() + 60000).toISOString() });

test('merchant purpose, token and observed challenge survive HCE / ISO-DEP exchange', async () => {
  const r = runtime(); let observed, result;
  r.host.startHost(payload('merchant'), () => {}, value => { observed = value; });
  r.reader.startReader(value => { result = value; }, assert.fail);
  await r.reader.readPeerPayload({});
  assert.equal(result.purpose, 'merchant');
  assert.equal(result.challenge, observed);
  assert.equal(result.touchToken, 'a'.repeat(64));
});

test('existing personal hosts explicitly identify as personal without changing token', async () => {
  const r = runtime(); let result;
  r.host.startHost(payload(undefined), () => {});
  r.reader.startReader(value => { result = value; }, assert.fail);
  await r.reader.readPeerPayload({});
  assert.equal(result.purpose, 'personal');
});

test('invalid or expired reader payload dates are rejected', async () => {
  for (const expiresAt of ['bad-date', '2000-01-01T00:00:00Z']) {
    const r = runtime(); let error;
    r.host.startHost(payload('merchant'), () => {});
    r.rewrite(bytes => {
      if (bytes.length === 2) return bytes;
      const value = JSON.parse(Buffer.from(bytes.slice(0, -2)).toString());
      return [...Buffer.from(JSON.stringify({ ...value, expiresAt })), 0x90, 0];
    });
    r.reader.startReader(() => assert.fail('invalid proof accepted'), value => { error = value; });
    await r.reader.readPeerPayload({});
    assert.match(error, /过期/);
  }
});

test('late NFC responses from a cancelled read cannot enter a newly started reader', async () => {
  const r = runtime(); let release;
  r.host.startHost(payload('merchant'), () => {});
  r.reader.startReader(() => assert.fail('old callback'), assert.fail);
  r.delay(() => new Promise(resolve => { release = resolve; }));
  const pending = r.reader.readPeerPayload({});
  await Promise.resolve();
  r.reader.stopReader();
  r.reader.startReader(() => assert.fail('late result entered new flow'), assert.fail);
  r.delay(async () => {});
  release();
  await pending;
});

test('HCE rejects malformed expiration instead of broadcasting a token', async () => {
  const r = runtime(); let error;
  r.host.startHost({ ...payload('merchant'), expiresAt: 'bad-date' }, () => {});
  r.reader.startReader(() => assert.fail('invalid host accepted'), value => { error = value; });
  await r.reader.readPeerPayload({});
  assert.match(error, /有效的碰触令牌/);
});

test('stopped HCE callback cannot transmit from a replacement host session', () => {
  const r = runtime();
  r.host.startHost(payload('merchant'), () => {});
  const oldCallback = r.callbacks[0];
  r.host.stopHost();
  r.host.startHost(payload('personal'), () => {});
  oldCallback(null, [0, 0xa4, 4, 0, 10, ...Buffer.from('F0534D414C4C574F524C44', 'hex'), 0]);
  assert.equal(r.transmissions.length, 0);
});
