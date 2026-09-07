const nfcProofService = require('./nfc-proof.service');

async function handleNfcProofRoutes({
  req,
  res,
  url,
  send,
  readData,
  readBody,
  authenticate,
  pickPlace,
  createId,
  secureToken,
  persist
}) {
  const options = { pickPlace, createId, secureToken, persist };

  if (req.method === 'POST' && url.pathname === '/api/nfc/sessions') {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再发起 NFC 碰触' });
      return true;
    }
    const result = nfcProofService.createNfcSession(data, auth.account, { ...body, hostDeviceId: auth.session.deviceId }, options);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/nfc/sessions/confirm') {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再确认 NFC 碰触' });
      return true;
    }
    const result = nfcProofService.confirmNfcSession(data, auth.account, { ...body, readerDeviceId: auth.session.deviceId }, options);
    send(res, result.status, result.body);
    return true;
  }

  const decisionMatch = url.pathname.match(/^\/api\/nfc\/sessions\/([^/]+)\/decision$/);
  if (req.method === 'POST' && decisionMatch) {
    // Read the body before the state snapshot: concurrent decisions cannot overwrite a completed session.
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
      return true;
    }
    const result = nfcProofService.decideNfcSession(data, auth.account, decisionMatch[1], body, options);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/nfc/proofs') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再查看碰触凭证' });
      return true;
    }
    send(res, 200, nfcProofService.listUserProofs(data, auth.account));
    return true;
  }

  const sessionMatch = url.pathname.match(/^\/api\/nfc\/sessions\/([^/]+)$/);
  if (req.method === 'GET' && sessionMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
      return true;
    }
    const result = nfcProofService.getNfcSession(data, auth.account, sessionMatch[1], { persist });
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleNfcProofRoutes
};
