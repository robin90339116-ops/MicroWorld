const crypto = require('crypto');
const { createId } = require('../../shared/id');
const { hashValue, secureToken } = require('../../shared/security');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = 'sha256';

const ALLOWED_INTERESTS = ['咖啡', '读书', '摄影', '运动', '桌游', '音乐', '艺术', '电影', '城市探索', '展览', '手作', '宠物'];
const ALLOWED_INTENTS = ['参加线下活动', '遇见同频的人', '探索城市地点', '创造虚拟世界'];

const loginAttempts = new Map();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('hex');
}

function passwordMatches(password, account) {
  if (!account || !account.passwordSalt || !account.passwordHash) {
    return false;
  }
  const actual = Buffer.from(hashPassword(password, account.passwordSalt), 'hex');
  const expected = Buffer.from(account.passwordHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function publicAccount(account) {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    interests: Array.isArray(account.interests) ? account.interests : [],
    socialIntent: account.socialIntent || '',
    profileComplete: account.profileComplete === true,
    createdAt: account.createdAt
  };
}

function createAuthSession(data, userId, deviceId) {
  const token = secureToken() + secureToken();
  const now = new Date();
  const session = {
    id: createId('auth_session'),
    userId,
    tokenHash: hashValue(token),
    deviceId: String(deviceId || '').slice(0, 120),
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  };

  data.authSessions = Array.isArray(data.authSessions) ? data.authSessions : [];
  data.authSessions = data.authSessions.filter(item => {
    return item.userId !== userId || item.deviceId !== session.deviceId;
  });
  data.authSessions.push(session);
  return { token, session };
}

function bearerToken(req) {
  const value = String(req.headers.authorization || '');
  if (!value.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return value.slice(7).trim();
}

function authenticate(data, req) {
  const token = bearerToken(req);
  if (!token) {
    return null;
  }

  const tokenHash = hashValue(token);
  const session = (data.authSessions || []).find(item => item.tokenHash === tokenHash);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  const account = (data.accounts || []).find(item => item.id === session.userId);
  if (!account) {
    return null;
  }

  session.lastSeenAt = new Date().toISOString();
  return { account, session, tokenHash };
}

function loginRateLimited(req) {
  const key = String(req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const recent = (loginAttempts.get(key) || []).filter(value => now - value < 60 * 1000);
  if (recent.length >= 10) {
    loginAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  loginAttempts.set(key, recent);
  return false;
}

function registerAccount(data, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const displayName = String(body.displayName || '').trim();

  if (!validEmail(email)) {
    return { status: 400, body: { error: 'INVALID_EMAIL', message: '请输入有效的邮箱地址' } };
  }
  if (password.length < 8 || password.length > 72) {
    return { status: 400, body: { error: 'INVALID_PASSWORD', message: '密码长度需要为 8-72 位' } };
  }
  if (displayName.length < 2 || displayName.length > 24) {
    return { status: 400, body: { error: 'INVALID_DISPLAY_NAME', message: '昵称长度需要为 2-24 个字符' } };
  }
  if ((data.accounts || []).some(item => item.email === email)) {
    return { status: 409, body: { error: 'EMAIL_EXISTS', message: '这个邮箱已经注册，请直接登录' } };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const account = {
    id: createId('user'),
    email,
    displayName,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    interests: [],
    socialIntent: '',
    profileComplete: false,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
  data.users = data.users && typeof data.users === 'object' ? data.users : {};
  data.accounts.push(account);
  data.users[account.id] = {
    attendanceCount: 0,
    repeatPlaces: [],
    graphDiversity: 0.45,
    reviewStability: 0.6
  };

  const auth = createAuthSession(data, account.id, body.deviceId);
  return {
    status: 201,
    persist: true,
    body: {
      message: '账号创建成功',
      token: auth.token,
      expiresAt: auth.session.expiresAt,
      user: publicAccount(account)
    }
  };
}

function loginAccount(data, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const account = (data.accounts || []).find(item => item.email === email);
  if (!account || account.status !== 'active' || !passwordMatches(password, account)) {
    return { status: 401, body: { error: 'INVALID_CREDENTIALS', message: '邮箱或密码不正确' } };
  }

  const auth = createAuthSession(data, account.id, body.deviceId);
  return {
    status: 200,
    persist: true,
    body: {
      message: '登录成功',
      token: auth.token,
      expiresAt: auth.session.expiresAt,
      user: publicAccount(account)
    }
  };
}

function updateAccountProfile(data, account, body) {
  const displayName = String(body.displayName || account.displayName).trim();
  const interests = Array.isArray(body.interests) ?
    [...new Set(body.interests.map(value => String(value)).filter(value => ALLOWED_INTERESTS.includes(value)))].slice(0, 8) :
    account.interests;
  const socialIntent = String(body.socialIntent || '');

  if (displayName.length < 2 || displayName.length > 24) {
    return { status: 400, body: { error: 'INVALID_DISPLAY_NAME', message: '昵称长度需要为 2-24 个字符' } };
  }
  if (!Array.isArray(interests) || interests.length === 0) {
    return { status: 400, body: { error: 'INTEREST_REQUIRED', message: '请至少选择一个兴趣' } };
  }
  if (!ALLOWED_INTENTS.includes(socialIntent)) {
    return { status: 400, body: { error: 'INVALID_INTENT', message: '请选择一个社交意图' } };
  }

  account.displayName = displayName;
  account.interests = interests;
  account.socialIntent = socialIntent;
  account.profileComplete = true;
  account.updatedAt = new Date().toISOString();

  return {
    status: 200,
    persist: true,
    body: {
      message: '线下社交身份已保存',
      user: publicAccount(account)
    }
  };
}

function logout(data, tokenHash) {
  if (!tokenHash) {
    return false;
  }
  const before = Array.isArray(data.authSessions) ? data.authSessions.length : 0;
  data.authSessions = (data.authSessions || []).filter(item => item.tokenHash !== tokenHash);
  return data.authSessions.length !== before;
}

module.exports = {
  ALLOWED_INTERESTS,
  ALLOWED_INTENTS,
  authenticate,
  bearerToken,
  createAuthSession,
  hashPassword,
  loginAccount,
  loginRateLimited,
  logout,
  normalizeEmail,
  passwordMatches,
  publicAccount,
  registerAccount,
  updateAccountProfile,
  validEmail
};
