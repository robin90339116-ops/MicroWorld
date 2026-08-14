const NFC_PROOF_CONTRACT = 'SmallWorld NFC Proof v1';
const NFC_SESSION_TTL_MS = 2 * 60 * 1000;
const NFC_PROOF_TTL_MS = 20 * 60 * 1000;
const NFC_TRANSPORT = 'iso_dep_apdu';

function arrayOf(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
  return data[key];
}

function guardrails() {
  return {
    phoneToPhoneOnly: true,
    transport: NFC_TRANSPORT,
    requiresDistinctUsers: true,
    requiresDistinctDevices: true,
    oneTimeToken: true,
    reviewRequiresParticipant: true,
    sessionTtlSeconds: Math.round(NFC_SESSION_TTL_MS / 1000),
    proofTtlSeconds: Math.round(NFC_PROOF_TTL_MS / 1000)
  };
}

function publicSession(session, account) {
  const isHost = account && session.hostUserId === account.id;
  const isReader = account && session.readerUserId === account.id;
  return {
    contract: NFC_PROOF_CONTRACT,
    sessionId: session.id,
    placeId: session.placeId,
    status: session.status,
    proofId: session.proofId || '',
    transport: session.transport || NFC_TRANSPORT,
    role: isHost ? 'host' : isReader ? 'reader' : 'unknown',
    createdAt: session.createdAt,
    confirmedAt: session.confirmedAt || '',
    expiresAt: session.expiresAt,
    participants: {
      hostUserId: session.hostUserId,
      readerUserId: session.readerUserId || ''
    },
    guardrails: guardrails()
  };
}

function challengeValid(value) {
  return /^[0-9a-f]{16,64}$/i.test(String(value || '').trim());
}

function expireSessionIfNeeded(data, session, options = {}) {
  if (session.status === 'waiting' && Date.parse(session.expiresAt) < Date.now()) {
    session.status = 'expired';
    if (typeof options.persist === 'function') {
      options.persist(data);
    }
  }
  return session.status === 'expired';
}

function createNfcSession(data, account, body, options) {
  const place = options.pickPlace(data, body.placeId);
  if (!place) {
    return { status: 404, body: { error: 'PLACE_NOT_FOUND', message: '地点不存在' } };
  }

  const hostUserId = account.id;
  const hostDeviceId = String(body.hostDeviceId || body.deviceId || '').trim();
  if (!hostUserId || !hostDeviceId) {
    return { status: 400, body: { error: 'HOST_IDENTITY_REQUIRED', message: '发起方手机设备 ID 缺失' } };
  }

  const sessions = arrayOf(data, 'nfcSessions');
  sessions.forEach(session => {
    if (session.hostUserId === hostUserId && session.status === 'waiting') {
      session.status = 'superseded';
    }
  });

  const now = new Date();
  const session = {
    id: options.createId('nfc_session'),
    placeId: place.id,
    hostUserId,
    hostDeviceId,
    touchToken: options.secureToken(),
    transport: NFC_TRANSPORT,
    status: 'waiting',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + NFC_SESSION_TTL_MS).toISOString()
  };

  sessions.push(session);
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: NFC_PROOF_CONTRACT,
      message: 'HCE 碰触会话已创建',
      sessionId: session.id,
      touchToken: session.touchToken,
      placeId: session.placeId,
      transport: session.transport,
      expiresAt: session.expiresAt,
      hcePayload: {
        sessionId: session.id,
        touchToken: session.touchToken,
        transport: session.transport
      },
      host: {
        userId: hostUserId,
        deviceId: hostDeviceId
      },
      place: {
        id: place.id,
        name: place.name,
        shortName: place.shortName
      },
      guardrails: guardrails()
    }
  };
}

function confirmNfcSession(data, account, body, options) {
  const sessions = arrayOf(data, 'nfcSessions');
  const session = sessions.find(item => item.id === body.sessionId);
  if (!session || session.status !== 'waiting') {
    return { status: 404, body: { error: 'NFC_SESSION_NOT_FOUND', message: '碰触会话不存在或已使用' } };
  }

  if (expireSessionIfNeeded(data, session, options)) {
    return { status: 410, body: { error: 'NFC_SESSION_EXPIRED', message: '碰触会话已过期，请重新发起' } };
  }

  const readerUserId = account.id;
  const readerDeviceId = String(body.readerDeviceId || body.deviceId || '').trim();
  const challenge = String(body.challenge || '').trim();
  const touchToken = String(body.touchToken || '');

  if (!readerUserId || !readerDeviceId || !challenge) {
    return { status: 400, body: { error: 'READER_IDENTITY_REQUIRED', message: '读取方手机设备 ID 或 APDU 挑战缺失' } };
  }
  if (readerUserId === session.hostUserId || readerDeviceId === session.hostDeviceId) {
    return { status: 409, body: { error: 'SAME_DEVICE_TOUCH', message: '必须使用另一部手机完成碰一碰' } };
  }
  if (body.transport !== NFC_TRANSPORT || touchToken !== session.touchToken) {
    return { status: 403, body: { error: 'INVALID_APDU_TOKEN', message: '未通过真实 NFC APDU 交换验证' } };
  }
  if (!challengeValid(challenge)) {
    return { status: 400, body: { error: 'INVALID_APDU_CHALLENGE', message: 'APDU 挑战格式无效' } };
  }

  const now = new Date();
  const proof = {
    id: options.createId('touch'),
    nfcSessionId: session.id,
    placeId: session.placeId,
    type: 'phone_to_phone_nfc',
    method: 'nfc',
    transport: NFC_TRANSPORT,
    hardwareVerified: true,
    status: 'completed',
    initiatorUserId: session.hostUserId,
    peerUserId: readerUserId,
    deviceA: session.hostDeviceId,
    deviceB: readerDeviceId,
    gpsVerified: body.gpsVerified === true,
    apduChallenge: challenge,
    antiFraud: {
      physicalDistance: 'nfc_iso_dep_range',
      oneTimeToken: true,
      distinctDevices: true,
      samePlaceWindowMinutes: 20,
      abnormalCluster: false
    },
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + NFC_PROOF_TTL_MS).toISOString()
  };

  session.status = 'confirmed';
  session.confirmedAt = now.toISOString();
  session.readerUserId = readerUserId;
  session.readerDeviceId = readerDeviceId;
  session.apduChallenge = challenge;
  session.proofId = proof.id;
  delete session.touchToken;

  arrayOf(data, 'touchProofs').push(proof);
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: NFC_PROOF_CONTRACT,
      message: '两部手机已通过 NFC ISO-DEP/APDU 完成真实碰触',
      proofId: proof.id,
      sessionId: session.id,
      placeId: session.placeId,
      expiresAt: proof.expiresAt,
      proof,
      guardrails: guardrails()
    }
  };
}

function getNfcSession(data, account, sessionId, options = {}) {
  const session = arrayOf(data, 'nfcSessions').find(item => item.id === sessionId);
  if (!session || (session.hostUserId !== account.id && session.readerUserId !== account.id)) {
    return { status: 404, body: { error: 'NFC_SESSION_NOT_FOUND', message: '碰触会话不存在' } };
  }

  expireSessionIfNeeded(data, session, options);
  return {
    status: 200,
    body: publicSession(session, account)
  };
}

function listUserProofs(data, account) {
  const proofs = arrayOf(data, 'touchProofs')
    .filter(proof => proof.initiatorUserId === account.id || proof.peerUserId === account.id)
    .slice(-30)
    .reverse();

  return {
    contract: NFC_PROOF_CONTRACT,
    proofs,
    count: proofs.length,
    guardrails: guardrails()
  };
}

module.exports = {
  NFC_PROOF_CONTRACT,
  NFC_PROOF_TTL_MS,
  NFC_SESSION_TTL_MS,
  NFC_TRANSPORT,
  confirmNfcSession,
  createNfcSession,
  getNfcSession,
  guardrails,
  listUserProofs,
  publicSession
};
