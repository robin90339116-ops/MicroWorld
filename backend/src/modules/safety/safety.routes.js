const safetyService = require('./safety.service');

async function requireAuth({ req, res, send, data, authenticate, message }) {
  const auth = authenticate(data, req);
  if (!auth) {
    send(res, 401, { error: 'AUTH_REQUIRED', message });
    return null;
  }
  return auth;
}

async function handleSafetyRoutes({
  req,
  res,
  url,
  send,
  readData,
  readBody,
  authenticate,
  createId,
  persist
}) {
  const options = { createId, persist };

  if (req.method === 'GET' && url.pathname === '/api/safety/home') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再同步安全中心'
    });
    if (!auth) return true;
    send(res, 200, safetyService.safetyHome(data, auth.account));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/safety/reports') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再查看举报记录'
    });
    if (!auth) return true;
    send(res, 200, safetyService.listReports(data, auth.account));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/safety/reports') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再提交举报'
    });
    if (!auth) return true;
    const result = safetyService.createReport(data, auth.account, await readBody(req), options);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/safety/blocks') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再查看黑名单'
    });
    if (!auth) return true;
    send(res, 200, safetyService.listBlocks(data, auth.account));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/safety/blocks') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再拉黑用户'
    });
    if (!auth) return true;
    const result = safetyService.createBlock(data, auth.account, await readBody(req), options);
    send(res, result.status, result.body);
    return true;
  }

  const removeBlockMatch = url.pathname.match(/^\/api\/safety\/blocks\/([^/]+)\/remove$/);
  if (req.method === 'POST' && removeBlockMatch) {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再解除拉黑'
    });
    if (!auth) return true;
    const result = safetyService.removeBlock(data, auth.account, decodeURIComponent(removeBlockMatch[1]), options);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/safety/panic') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再创建安全事件'
    });
    if (!auth) return true;
    const result = safetyService.createPanicEvent(data, auth.account, await readBody(req), options);
    send(res, result.status, result.body);
    return true;
  }

  const resolveEventMatch = url.pathname.match(/^\/api\/safety\/events\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && resolveEventMatch) {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再结束安全事件'
    });
    if (!auth) return true;
    const result = safetyService.resolveSafetyEvent(data, auth.account, decodeURIComponent(resolveEventMatch[1]), options);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/safety/audit') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再查看安全审计'
    });
    if (!auth) return true;
    send(res, 200, safetyService.auditTrail(data, auth.account));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/safety/privacy') {
    const data = readData();
    const auth = await requireAuth({
      req,
      res,
      send,
      data,
      authenticate,
      message: '请先登录后再保存隐私设置'
    });
    if (!auth) return true;
    const result = safetyService.updatePrivacy(data, auth.account, await readBody(req), options);
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleSafetyRoutes
};
