const SAFETY_CONTRACT = 'SmallWorld Safety v1';

const REPORT_TARGET_TYPES = [
  'user',
  'place',
  'chat',
  'moment',
  'room-post',
  'activity',
  'merchant',
  'world'
];

const REPORT_REASONS = [
  '骚扰',
  '不安全行为',
  '虚假信息',
  '冒充',
  '垃圾信息',
  '违规内容',
  '其他'
];

const DEFAULT_PROFILE_SETTINGS = {
  invisible: false,
  todayHidden: false,
  activityNotificationsEnabled: true,
  messageNotificationsEnabled: true,
  preciseLocationEnabled: true,
  nfcEnabled: true
};

function arrayOf(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
  return data[key];
}

function objectOf(data, key) {
  if (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key])) {
    data[key] = {};
  }
  return data[key];
}

function nowIso() {
  return new Date().toISOString();
}

function createIdFrom(options, prefix) {
  return typeof options.createId === 'function' ?
    options.createId(prefix) :
    `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safetyGuardrails() {
  return {
    relationshipRequiredForChat: true,
    privateDataHidden: true,
    reportsAudited: true,
    blocksPreventInteraction: true,
    panicCreatesAuditEvent: true,
    frontendCanRemainUnchanged: true
  };
}

function profileSettingsFor(data, account) {
  const settingsByUser = objectOf(data, 'profileSettings');
  const current = settingsByUser[account.id] || {};
  const settings = {
    ...DEFAULT_PROFILE_SETTINGS,
    ...current
  };
  settingsByUser[account.id] = settings;
  return settings;
}

function publicReport(report) {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    targetUserId: report.targetUserId || '',
    reason: report.reason,
    description: report.description,
    placeId: report.placeId || '',
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

function publicBlock(block) {
  return {
    id: block.id,
    targetUserId: block.targetUserId,
    targetName: block.targetName || '',
    reason: block.reason || '',
    status: block.status,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    removedAt: block.removedAt || ''
  };
}

function publicSafetyEvent(event) {
  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    placeId: event.placeId || '',
    message: event.message || '',
    status: event.status,
    createdAt: event.createdAt,
    resolvedAt: event.resolvedAt || ''
  };
}

function auditEvent(data, account, type, details = {}, options = {}) {
  const event = {
    id: createIdFrom(options, 'safety_event'),
    userId: account.id,
    type,
    severity: details.severity || 'info',
    placeId: details.placeId || '',
    targetType: details.targetType || '',
    targetId: details.targetId || '',
    targetUserId: details.targetUserId || '',
    message: String(details.message || '').slice(0, 500),
    metadata: details.metadata && typeof details.metadata === 'object' ? details.metadata : {},
    status: details.status || 'logged',
    createdAt: nowIso()
  };
  arrayOf(data, 'safetyEvents').push(event);
  return event;
}

function safetyHome(data, account) {
  const reports = arrayOf(data, 'safetyReports').filter(item => item.reporterUserId === account.id);
  const blocks = arrayOf(data, 'blockedUsers').filter(item => item.userId === account.id);
  const events = arrayOf(data, 'safetyEvents').filter(item => item.userId === account.id);
  const settings = profileSettingsFor(data, account);
  return {
    contract: SAFETY_CONTRACT,
    controls: [
      { key: 'privacy', label: '隐私设置', endpoint: 'POST /api/safety/privacy' },
      { key: 'report', label: '举报', endpoint: 'POST /api/safety/reports' },
      { key: 'block', label: '拉黑', endpoint: 'POST /api/safety/blocks' },
      { key: 'panic', label: '安全按钮', endpoint: 'POST /api/safety/panic' }
    ],
    privacy: settings,
    reportCount: reports.length,
    blockCount: blocks.filter(item => item.status === 'active').length,
    openSafetyEventCount: events.filter(item => item.status === 'open').length,
    guardrails: safetyGuardrails()
  };
}

function createReport(data, account, body, options = {}) {
  const targetType = String(body.targetType || '').trim();
  const targetId = String(body.targetId || '').trim().slice(0, 160);
  const reason = String(body.reason || '').trim().slice(0, 80);
  if (!REPORT_TARGET_TYPES.includes(targetType)) {
    return { status: 400, body: { error: 'INVALID_TARGET_TYPE', message: '举报对象类型不正确' } };
  }
  if (!targetId) {
    return { status: 400, body: { error: 'TARGET_REQUIRED', message: '请提供举报对象' } };
  }
  if (!REPORT_REASONS.includes(reason)) {
    return { status: 400, body: { error: 'INVALID_REASON', message: '请选择有效的举报原因' } };
  }

  const createdAt = nowIso();
  const report = {
    id: createIdFrom(options, 'safety_report'),
    reporterUserId: account.id,
    targetType,
    targetId,
    targetUserId: String(body.targetUserId || '').trim().slice(0, 160),
    reason,
    description: String(body.description || '').trim().slice(0, 1000),
    placeId: String(body.placeId || '').trim().slice(0, 120),
    evidenceIds: Array.isArray(body.evidenceIds) ? body.evidenceIds.map(item => String(item).slice(0, 160)).slice(0, 8) : [],
    status: 'open',
    createdAt,
    updatedAt: createdAt
  };
  arrayOf(data, 'safetyReports').push(report);
  const event = auditEvent(data, account, 'report_created', {
    severity: 'medium',
    placeId: report.placeId,
    targetType,
    targetId,
    targetUserId: report.targetUserId,
    message: `举报：${reason}`,
    status: 'logged'
  }, options);

  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 201,
    body: {
      contract: SAFETY_CONTRACT,
      message: '举报已提交',
      report: publicReport(report),
      auditEvent: publicSafetyEvent(event),
      guardrails: safetyGuardrails()
    }
  };
}

function listReports(data, account) {
  const reports = arrayOf(data, 'safetyReports')
    .filter(item => item.reporterUserId === account.id)
    .slice()
    .reverse()
    .map(publicReport);
  return {
    contract: SAFETY_CONTRACT,
    reports,
    reasons: REPORT_REASONS,
    targetTypes: REPORT_TARGET_TYPES,
    guardrails: safetyGuardrails()
  };
}

function createBlock(data, account, body, options = {}) {
  const targetUserId = String(body.targetUserId || '').trim().slice(0, 160);
  if (!targetUserId) {
    return { status: 400, body: { error: 'TARGET_USER_REQUIRED', message: '请提供要拉黑的用户' } };
  }
  if (targetUserId === account.id) {
    return { status: 409, body: { error: 'CANNOT_BLOCK_SELF', message: '不能拉黑自己' } };
  }

  const blocks = arrayOf(data, 'blockedUsers');
  const existing = blocks.find(item => {
    return item.userId === account.id && item.targetUserId === targetUserId && item.status === 'active';
  });
  if (existing) {
    return {
      status: 200,
      body: {
        contract: SAFETY_CONTRACT,
        message: '已在黑名单中',
        block: publicBlock(existing),
        guardrails: safetyGuardrails()
      }
    };
  }

  const createdAt = nowIso();
  const block = {
    id: createIdFrom(options, 'block'),
    userId: account.id,
    targetUserId,
    targetName: String(body.targetName || '').trim().slice(0, 80),
    reason: String(body.reason || '').trim().slice(0, 200),
    status: 'active',
    createdAt,
    updatedAt: createdAt
  };
  blocks.push(block);
  const event = auditEvent(data, account, 'block_created', {
    severity: 'medium',
    targetType: 'user',
    targetId: targetUserId,
    targetUserId,
    message: '用户已加入黑名单',
    status: 'logged'
  }, options);

  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 201,
    body: {
      contract: SAFETY_CONTRACT,
      message: '已拉黑该用户',
      block: publicBlock(block),
      auditEvent: publicSafetyEvent(event),
      guardrails: safetyGuardrails()
    }
  };
}

function listBlocks(data, account) {
  const blocks = arrayOf(data, 'blockedUsers')
    .filter(item => item.userId === account.id)
    .slice()
    .reverse()
    .map(publicBlock);
  return {
    contract: SAFETY_CONTRACT,
    blocks,
    activeBlocks: blocks.filter(item => item.status === 'active'),
    guardrails: safetyGuardrails()
  };
}

function removeBlock(data, account, blockId, options = {}) {
  const block = arrayOf(data, 'blockedUsers').find(item => item.id === blockId && item.userId === account.id);
  if (!block) {
    return { status: 404, body: { error: 'BLOCK_NOT_FOUND', message: '黑名单记录不存在' } };
  }
  if (block.status !== 'active') {
    return {
      status: 200,
      body: {
        contract: SAFETY_CONTRACT,
        message: '该用户已不在黑名单中',
        block: publicBlock(block),
        guardrails: safetyGuardrails()
      }
    };
  }
  const updatedAt = nowIso();
  block.status = 'removed';
  block.updatedAt = updatedAt;
  block.removedAt = updatedAt;
  const event = auditEvent(data, account, 'block_removed', {
    targetType: 'user',
    targetId: block.targetUserId,
    targetUserId: block.targetUserId,
    message: '已解除拉黑',
    status: 'logged'
  }, options);

  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 200,
    body: {
      contract: SAFETY_CONTRACT,
      message: '已解除拉黑',
      block: publicBlock(block),
      auditEvent: publicSafetyEvent(event),
      guardrails: safetyGuardrails()
    }
  };
}

function createPanicEvent(data, account, body, options = {}) {
  const placeId = String(body.placeId || '').trim().slice(0, 120);
  const event = auditEvent(data, account, 'panic', {
    severity: 'high',
    placeId,
    message: String(body.message || '用户触发安全按钮').slice(0, 500),
    metadata: {
      latitude: Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null,
      longitude: Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : null,
      deviceId: String(body.deviceId || '').slice(0, 120)
    },
    status: 'open'
  }, options);

  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 201,
    body: {
      contract: SAFETY_CONTRACT,
      message: '安全事件已创建',
      event: publicSafetyEvent(event),
      guardrails: safetyGuardrails()
    }
  };
}

function resolveSafetyEvent(data, account, eventId, options = {}) {
  const event = arrayOf(data, 'safetyEvents').find(item => item.id === eventId && item.userId === account.id);
  if (!event) {
    return { status: 404, body: { error: 'EVENT_NOT_FOUND', message: '安全事件不存在' } };
  }
  if (event.status === 'resolved') {
    return {
      status: 200,
      body: {
        contract: SAFETY_CONTRACT,
        message: '安全事件已结束',
        event: publicSafetyEvent(event),
        guardrails: safetyGuardrails()
      }
    };
  }
  event.status = 'resolved';
  event.resolvedAt = nowIso();
  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 200,
    body: {
      contract: SAFETY_CONTRACT,
      message: '安全事件已结束',
      event: publicSafetyEvent(event),
      guardrails: safetyGuardrails()
    }
  };
}

function updatePrivacy(data, account, body, options = {}) {
  const settings = profileSettingsFor(data, account);
  const next = { ...settings };
  Object.keys(DEFAULT_PROFILE_SETTINGS).forEach(key => {
    if (typeof body[key] === 'boolean') {
      next[key] = body[key];
    }
  });
  objectOf(data, 'profileSettings')[account.id] = next;
  const event = auditEvent(data, account, 'privacy_updated', {
    message: '隐私设置已更新',
    metadata: {
      invisible: next.invisible,
      todayHidden: next.todayHidden,
      preciseLocationEnabled: next.preciseLocationEnabled,
      nfcEnabled: next.nfcEnabled
    },
    status: 'logged'
  }, options);

  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 200,
    body: {
      contract: SAFETY_CONTRACT,
      message: '隐私设置已保存',
      settings: next,
      auditEvent: publicSafetyEvent(event),
      guardrails: safetyGuardrails()
    }
  };
}

function auditTrail(data, account) {
  const reports = arrayOf(data, 'safetyReports')
    .filter(item => item.reporterUserId === account.id)
    .slice()
    .reverse()
    .map(publicReport);
  const blocks = arrayOf(data, 'blockedUsers')
    .filter(item => item.userId === account.id)
    .slice()
    .reverse()
    .map(publicBlock);
  const events = arrayOf(data, 'safetyEvents')
    .filter(item => item.userId === account.id)
    .slice()
    .reverse()
    .map(publicSafetyEvent);
  return {
    contract: SAFETY_CONTRACT,
    reports,
    blocks,
    events,
    guardrails: safetyGuardrails()
  };
}

function activeBlockedUserIds(data, account) {
  return new Set(arrayOf(data, 'blockedUsers')
    .filter(item => item.userId === account.id && item.status === 'active')
    .map(item => item.targetUserId));
}

module.exports = {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  SAFETY_CONTRACT,
  activeBlockedUserIds,
  auditTrail,
  createBlock,
  createPanicEvent,
  createReport,
  listBlocks,
  listReports,
  removeBlock,
  resolveSafetyEvent,
  safetyGuardrails,
  safetyHome,
  updatePrivacy
};
