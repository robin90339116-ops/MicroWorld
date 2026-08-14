const profileService = require('./profile.service');

async function handleProfileRoutes({
  req,
  res,
  url,
  send,
  readData,
  readBody,
  authenticate,
  persist
}) {
  if (req.method === 'GET' && url.pathname === '/api/me/profile') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再同步个人中心' });
      return true;
    }
    const body = profileService.profileHome(data, auth.account);
    persist(data);
    send(res, 200, body);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/me/settings') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再保存设置' });
      return true;
    }
    const result = profileService.updateProfileSettings(data, auth.account, await readBody(req), { persist });
    send(res, result.status, result.body);
    return true;
  }

  const meFeatureMatch = url.pathname.match(/^\/api\/me\/([^/]+)$/);
  if (req.method === 'GET' && meFeatureMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再同步个人数据' });
      return true;
    }
    const body = profileService.profileFeature(data, auth.account, meFeatureMatch[1]);
    persist(data);
    send(res, 200, body);
    return true;
  }

  return false;
}

module.exports = {
  handleProfileRoutes
};
