'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');

const LEVEL = 'registered-terminal-client-reported-nfc';
const fail = (status, error, message) => ({ status, body: { error, message } });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const entries = data => Array.isArray(data.merchantTerminalSessions) ? data.merchantTerminalSessions : [];

// Operator-owned file only; no public endpoint can grant merchant privileges.
function registry(options = {}) {
  let value;
  try {
    value = options.registry === undefined ? JSON.parse(fs.readFileSync(process.env.SMALLWORLD_MERCHANT_REGISTRY_FILE || '', 'utf8')) : options.registry;
  } catch { return []; }
  if (!Array.isArray(value) || value.length > 10000) return [];
  const keys = new Set();
  const places = new Map();
  for (const row of value) {
    if (!row || typeof row.active !== 'boolean' ||
        ['merchantId', 'placeId', 'accountId', 'deviceId'].some(key => typeof row[key] !== 'string' || !row[key].trim() || row[key].length > 120)) return [];
    const key = JSON.stringify([row.merchantId, row.accountId, row.deviceId]);
    if (keys.has(key)) return [];
    if (places.has(row.merchantId) && places.get(row.merchantId) !== row.placeId) return [];
    places.set(row.merchantId, row.placeId);
    keys.add(key);
  }
  return value.filter(row => row.active);
}

function registration(session, options) {
  return registry(options).find(row => row.merchantId === session.merchantId && row.placeId === session.placeId &&
    row.accountId === session.hostUserId && row.deviceId === session.hostDeviceId);
}

function listTerminals(account, deviceId, options) {
  return { status: 200, body: { terminals: registry(options)
    .filter(row => row.accountId === account.id && row.deviceId === deviceId)
    .map(row => ({ merchantId: row.merchantId, placeId: row.placeId })),
    verificationLevel: LEVEL, hardwareVerified: false, gpsVerified: false } };
}

function issue(data, account, deviceId, body, options) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'INVALID_BODY', '请求正文须为对象');
  const approved = registry(options).find(row => row.accountId === account.id && row.deviceId === deviceId && row.merchantId === body.merchantId);
  if (!approved) return fail(403, 'MERCHANT_NOT_REGISTERED', '此账号与当前设备未登记为该商家终端');
  if (!options.pickPlace(data, approved.placeId)) return fail(404, 'PLACE_NOT_FOUND', '登记地点不存在');
  const touchToken = crypto.randomBytes(32).toString('hex');
  const session = {
    id: options.createId('merchant_session'), purpose: 'merchant', merchantId: approved.merchantId,
    placeId: approved.placeId, hostUserId: account.id, hostDeviceId: deviceId,
    tokenHash: hash(touchToken), status: 'waiting', createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120000).toISOString()
  };
  const sessions = entries(data);
  for (const old of sessions) {
    if (old.hostUserId === account.id && old.hostDeviceId === deviceId && old.status === 'waiting') old.status = 'superseded';
  }
  sessions.push(session);
  data.merchantTerminalSessions = sessions;
  options.persist(data);
  return { status: 201, body: { payload: {
    sessionId: session.id, purpose: 'merchant', touchToken, placeId: session.placeId,
    hostUserId: account.id, expiresAt: session.expiresAt
  }, verificationLevel: LEVEL, hardwareVerified: false, gpsVerified: false } };
}

function observe(data, account, deviceId, sessionId, body, options) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'INVALID_BODY', '请求正文须为对象');
  const session = entries(data).find(row => row.id === sessionId && row.hostUserId === account.id && row.hostDeviceId === deviceId);
  if (!session) return fail(404, 'SESSION_NOT_FOUND', '商家会话不存在');
  if (!registration(session, options)) return fail(403, 'MERCHANT_REVOKED', '商家终端登记已失效');
  if (typeof body.challenge !== 'string' || !/^[a-f0-9]{24}$/.test(body.challenge)) return fail(400, 'INVALID_CHALLENGE', 'NFC 挑战格式无效');
  if (session.status === 'consumed' && session.challenge === body.challenge) return { status: 200, body: { status: 'consumed' } };
  if (session.status !== 'waiting' || !(Date.parse(session.expiresAt) > Date.now())) return fail(409, 'SESSION_CLOSED', '商家会话已结束或过期，请重新发起');
  if (session.challenge && session.challenge !== body.challenge) return fail(409, 'CHALLENGE_CONFLICT', '本次会话已绑定另一次 NFC 交换');
  if (!session.challenge) {
    session.challenge = body.challenge;
    session.observedAt = new Date().toISOString();
    options.persist(data);
  }
  return { status: 200, body: { status: session.status } };
}

function claim(data, account, body, options) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'INVALID_BODY', '请求正文须为对象');
  if (body.purpose !== 'merchant' || typeof body.touchToken !== 'string' || !/^[a-f0-9]{64}$/.test(body.touchToken) ||
      typeof body.challenge !== 'string' || !/^[a-f0-9]{24}$/.test(body.challenge) || body.transport !== 'nfc-isodep') {
    return fail(400, 'MERCHANT_NFC_PROOF_REQUIRED', '请使用 NFC 读取已登记商家终端的一次性凭证');
  }
  const session = entries(data).find(row => row.id === body.sessionId);
  if (!session || session.tokenHash !== hash(body.touchToken)) return fail(404, 'SESSION_NOT_FOUND', '商家凭证无效');
  if (!registration(session, options)) return fail(403, 'MERCHANT_REVOKED', '商家终端登记已失效');
  if (!body.deviceId || body.deviceId === session.hostDeviceId || account.id === session.hostUserId) return fail(409, 'MERCHANT_DEVICE_CONFLICT', '商家和消费者必须使用不同账号与设备');
  if (session.status === 'consumed') {
    const tap = (data.merchantTaps || []).find(row => row.id === session.tapId && row.userId === account.id && row.deviceId === body.deviceId);
    if (tap && session.challenge === body.challenge) return { status: 200, tap };
    return fail(409, 'TOKEN_USED', '凭证已使用');
  }
  if (session.status !== 'waiting' || !(Date.parse(session.expiresAt) > Date.now())) return fail(409, 'SESSION_CLOSED', '商家会话已结束或过期');
  if (!session.challenge) return fail(409, 'TERMINAL_CONFIRMATION_PENDING', '商家终端尚未上报本次交换，请稍后重试');
  if (session.challenge !== body.challenge) return fail(403, 'CHALLENGE_MISMATCH', '双方 NFC 交换记录不一致');
  const tap = {
    id: options.createId('merchant_tap'), sessionId: session.id, placeId: session.placeId, merchantId: session.merchantId,
    userId: account.id, deviceId: body.deviceId, merchantDeviceId: session.hostDeviceId,
    transport: 'nfc-isodep', verificationLevel: LEVEL, hardwareVerified: false, gpsVerified: false,
    status: 'terminal-confirmed', createdAt: new Date().toISOString(),
    evidenceExpiresAt: new Date(Date.now() + 20 * 60000).toISOString()
  };
  if (!Array.isArray(data.merchantTaps)) data.merchantTaps = [];
  data.merchantTaps.push(tap);
  session.status = 'consumed';
  session.tapId = tap.id;
  session.readerUserId = account.id;
  session.readerDeviceId = body.deviceId;
  options.persist(data);
  return { status: 201, tap };
}

function hasEvidence(data, tap, options) {
  const session = entries(data).find(row => row.id === tap.sessionId && row.tapId === tap.id && row.status === 'consumed');
  return Boolean(session && session.readerUserId === tap.userId && session.readerDeviceId === tap.deviceId &&
    session.placeId === tap.placeId && session.merchantId === tap.merchantId && registration(session, options) &&
    tap.verificationLevel === LEVEL);
}

module.exports = { LEVEL, listTerminals, issue, observe, claim, hasEvidence, registry };
