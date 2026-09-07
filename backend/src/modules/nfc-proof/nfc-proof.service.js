const { createChainAnchor } = require('../../shared/chainAnchor');
const { hashValue } = require('../../shared/security');
const crypto = require('crypto');

const NFC_PROOF_CONTRACT = 'SmallWorld NFC Proof v1';
const NFC_SESSION_TTL_MS = 2 * 60 * 1000;
const NFC_PROOF_TTL_MS = 20 * 60 * 1000;
const NFC_TRANSPORT = 'iso_dep_apdu';

// 好友碰面 3D 纪念徽章走同一套数字藏品上链锚定层。
const chainAnchor = createChainAnchor();

function arrayOf(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
  return data[key];
}

// 碰面奖励:好感度 +、积分 +、第 N 次碰面,以及 3D 纪念徽章(幸运掉落)。
// 对应设计的「好友碰面结果」页(NFT + 好感度 + 积分)。
function awardMeetingReward(data, account, proof, options) {
  const samePair = arrayOf(data, 'touchProofs').filter(item => {
    return (item.initiatorUserId === proof.initiatorUserId && item.peerUserId === proof.peerUserId) ||
      (item.initiatorUserId === proof.peerUserId && item.peerUserId === proof.initiatorUserId);
  });
  const timesMet = samePair.length; // 已包含当前这次(调用前已 push)
  const alreadyFriends = options.alreadyFriends === true;

  // 好感度(按用户对存储,双方共享)
  if (!data.affinity || typeof data.affinity !== 'object' || Array.isArray(data.affinity)) {
    data.affinity = {};
  }
  const pairKey = [proof.initiatorUserId, proof.peerUserId].sort().join('__');
  const AFFINITY = options.rewardEligible && options.addAffinity ? 6 : 0;
  const affinityTotal = Math.round(Number(data.affinity[pairKey] || 0)) + AFFINITY;
  data.affinity[pairKey] = affinityTotal;

  // 每个参与者各执行一次；会话保存奖励快照，查询和重试不再次调用。
  if (!data.userPoints || typeof data.userPoints !== 'object' || Array.isArray(data.userPoints)) {
    data.userPoints = {};
  }
  const POINTS = options.rewardEligible ? 6 : 0;
  const pointsTotal = Math.round(Number(data.userPoints[account.id] || 0)) + POINTS;
  data.userPoints[account.id] = pointsTotal;

  // 3D 纪念徽章:幸运掉落(设计:碰面有几率获得,未中奖仅记录)。
  // 掉落结果由完成会话时生成，双方一致且持久化后不重新抽取。
  const dropped = options.rewardEligible && options.badgeDropped;
  let badge = null;
  if (dropped) {
    const serial = arrayOf(data, 'friendMedals').length + 1;
    const medalId = options.createId('friend_medal');
    const tokenId = `SW-MEET-${medalId}`;
    const medal = {
      id: medalId,
      userId: account.id,
      peerUserId: proof.initiatorUserId === account.id ? proof.peerUserId : proof.initiatorUserId,
      proofId: proof.id,
      name: '3D 碰面纪念徽章',
      rarity: 'R',
      tokenId,
      editionNumber: serial,
      earnedAt: proof.createdAt
    };
    chainAnchor.stampNewCollectible(medal);
    arrayOf(data, 'friendMedals').push(medal);
    badge = {
      name: medal.name,
      rarity: medal.rarity,
      tokenId,
      editionNumber: serial,
      chainStatus: medal.chainStatus,
      standard: chainAnchor.standard
    };
  }

  return {
    firstMeeting: !alreadyFriends,
    alreadyFriends,
    timesMet,
    affinity: { added: options.rewardEligible ? 6 : 0, total: affinityTotal },
    points: { awarded: POINTS, total: pointsTotal },
    rewardEligible: options.rewardEligible,
    rewardReason: options.rewardEligible ? '本次为该用户对 UTC 当日首次奖励' : '今日该用户对已领取奖励，仅记录碰面',
    badgeDropped: dropped,
    badge
  };
}

function guardrails() {
  return {
    phoneToPhoneOnly: true,
    requiresBothConfirmations: true,
    hardwareAttested: false,
    verificationLevel: 'mutual-client-reported-nfc',
    rewardPolicy: 'once-per-pair-per-utc-day',
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
    peer: { userId: isHost ? session.readerUserId || '' : session.hostUserId,
      name: isHost ? session.readerName || '现场用户' : session.hostName || '现场用户' },
    alreadyFriends: session.alreadyFriends === true,
    timesMet: session.timesMet || 0,
    reward: session.rewards ? session.rewards[account.id] || null : null,
    chatId: session.chatId || '',
    proof: session.publicProof || null,
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
  if (['waiting', 'awaiting_host'].includes(session.status) && Date.parse(session.expiresAt) <= Date.now()) {
    session.status = 'expired';
    delete session.touchToken;
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
    if (session.hostUserId === hostUserId && ['waiting', 'awaiting_host'].includes(session.status)) {
      session.status = 'superseded';
      delete session.touchToken;
    }
  });

  const now = new Date();
  const session = {
    id: options.createId('nfc_session'),
    placeId: place.id,
    hostUserId,
    hostName: account.displayName,
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
  if (!session) {
    return { status: 404, body: { error: 'NFC_SESSION_NOT_FOUND', message: '碰触会话不存在或已使用' } };
  }

  if (expireSessionIfNeeded(data, session, options)) {
    return { status: 410, body: { error: 'NFC_SESSION_EXPIRED', message: '碰触会话已过期，请重新发起' } };
  }

  if (['awaiting_host', 'confirmed'].includes(session.status) && session.readerUserId === account.id &&
    session.readerDeviceId === String(body.readerDeviceId || body.deviceId || '').trim() &&
    session.tokenHash === hashValue(String(body.touchToken || '')) && session.apduChallenge === String(body.challenge || '').trim()) {
    return { status: 200, body: publicSession(session, account) };
  }
  if (session.status !== 'waiting') return { status: 409, body: { error: 'NFC_SESSION_CLOSED', message: '会话已绑定或已结束' } };

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

  const blocked = arrayOf(data, 'blockedUsers').some(item => item.status === 'active' &&
    ((item.userId === account.id && item.targetUserId === session.hostUserId) ||
    (item.userId === session.hostUserId && item.targetUserId === account.id)));
  if (blocked) return { status: 403, body: { error: 'USER_BLOCKED', message: '无法与该用户建立连接' } };
  session.readerUserId = account.id;
  session.readerName = account.displayName;
  session.readerDeviceId = readerDeviceId;
  session.apduChallenge = challenge;
  session.readerConfirmedAt = new Date().toISOString();
  session.tokenHash = hashValue(touchToken);
  delete session.touchToken;
  session.status = 'awaiting_host';
  options.persist(data);
  return { status: 202, body: publicSession(session, account) };
}

function decideNfcSession(data, account, sessionId, body, options) {
  const session = arrayOf(data, 'nfcSessions').find(item => item.id === sessionId);
  if (!session || ![session.hostUserId, session.readerUserId].includes(account.id)) {
    return { status: 404, body: { error: 'NFC_SESSION_NOT_FOUND', message: '碰触会话不存在' } };
  }
  if (!['accept', 'cancel'].includes(body.action)) return { status: 400, body: { error: 'INVALID_DECISION', message: '无效的确认操作' } };
  expireSessionIfNeeded(data, session, options);
  if (session.status === 'confirmed' || session.status === 'cancelled') return { status: 200, body: publicSession(session, account) };
  if (!['waiting', 'awaiting_host'].includes(session.status)) {
    return { status: 410, body: { error: 'NFC_SESSION_CLOSED', message: '碰触会话已过期或被替换' } };
  }
  if (body.action === 'cancel') {
    session.status = 'cancelled';
    delete session.touchToken;
    options.persist(data);
    return { status: 200, body: publicSession(session, account) };
  }
  if (account.id !== session.hostUserId || session.status !== 'awaiting_host') {
    return { status: 409, body: { error: 'HOST_CONFIRMATION_REQUIRED', message: '等待被碰方确认' } };
  }
  // Must match the challenge observed by HCE, not a challenge obtained from the status endpoint.
  if (String(body.challenge || '') !== session.apduChallenge) {
    return { status: 403, body: { error: 'CHALLENGE_MISMATCH', message: '两部手机的 NFC 交换记录不一致，请重新碰触' } };
  }
  const blocked = arrayOf(data, 'blockedUsers').some(item => item.status === 'active' &&
    [session.hostUserId, session.readerUserId].includes(item.userId) &&
    [session.hostUserId, session.readerUserId].includes(item.targetUserId));
  if (blocked) return { status: 403, body: { error: 'USER_BLOCKED', message: '无法与该用户建立连接' } };
  return completeSession(data, account, session, options);
}

function completeSession(data, account, session, options) {

  const now = new Date();
  const proof = {
    id: options.createId('touch'),
    nfcSessionId: session.id,
    placeId: session.placeId,
    type: 'phone_to_phone_nfc',
    method: 'nfc',
    transport: NFC_TRANSPORT,
    hardwareVerified: false,
    verificationLevel: 'mutual-client-reported-nfc',
    status: 'completed',
    initiatorUserId: session.hostUserId,
    peerUserId: session.readerUserId,
    deviceA: session.hostDeviceId,
    deviceB: session.readerDeviceId,
    gpsVerified: false,
    antiFraud: {
      physicalDistance: 'not-server-attested',
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
  session.proofId = proof.id;
  delete session.touchToken;

  const pair = [session.hostUserId, session.readerUserId];
  const friends = arrayOf(data, 'friends');
  session.alreadyFriends = pair.every((ownerId, index) => friends.some(item => item.ownerId === ownerId && item.id === pair[1 - index]));
  const day = proof.createdAt.slice(0, 10);
  const rewardEligible = !arrayOf(data, 'touchProofs').some(item => item.rewardDay === day &&
    pair.includes(item.initiatorUserId) && pair.includes(item.peerUserId));
  proof.rewardDay = rewardEligible ? day : '';
  arrayOf(data, 'touchProofs').push(proof);
  session.rewards = {};
  const badgeDropped = crypto.randomInt(10) < 7;
  pair.forEach((userId, index) => {
    const peerId = pair[1 - index];
    if (!friends.some(item => item.ownerId === userId && item.id === peerId)) {
      const peer = arrayOf(data, 'accounts').find(item => item.id === peerId);
      friends.push({ ownerId: userId, id: peerId, name: peer ? peer.displayName : '用户',
        metAt: options.pickPlace(data, session.placeId)?.shortName || '', relation: '双方确认碰面', proofId: proof.id });
    }
    session.rewards[userId] = awardMeetingReward(data, { id: userId }, proof,
      { ...options, alreadyFriends: session.alreadyFriends, rewardEligible, addAffinity: index === 0, badgeDropped });
  });
  const chats = arrayOf(data, 'chats');
  let chat = chats.find(item => Array.isArray(item.participantIds) && item.participantIds.length === 2 && pair.every(id => item.participantIds.includes(id)));
  if (!chat) {
    chat = { id: options.createId('chat'), participantIds: pair, friendId: pair[1], message: '', unread: 0, time: '现在' };
    chats.push(chat);
  }
  session.chatId = chat.id;
  session.timesMet = session.rewards[account.id].timesMet;
  session.publicProof = { id: proof.id, placeId: proof.placeId, createdAt: proof.createdAt, expiresAt: proof.expiresAt,
    verificationLevel: proof.verificationLevel, hardwareVerified: false, gpsVerified: false };
  options.persist(data);

  return {
    status: 201,
    body: {
      ...publicSession(session, account),
      message: '双方已确认碰面，连接已建立；尚无硬件到场认证'
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
    proofs: proofs.map(proof => {
      const session = arrayOf(data, 'nfcSessions').find(item => item.id === proof.nfcSessionId);
      return { id: proof.id, placeId: proof.placeId, createdAt: proof.createdAt,
        peerUserId: proof.initiatorUserId === account.id ? proof.peerUserId : proof.initiatorUserId,
        verificationLevel: proof.verificationLevel || 'legacy-unverified',
        reward: session?.rewards?.[account.id] || null };
    }),
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
  decideNfcSession,
  createNfcSession,
  getNfcSession,
  guardrails,
  listUserProofs,
  publicSession
};
