const merchantTapService = require('./merchant-tap.service');

async function handleMerchantTapRoutes({
  req,
  res,
  url,
  send,
  readData,
  readBody,
  authenticate,
  pickPlace,
  enrichPlace,
  createId,
  persist
}) {
  const options = { pickPlace, enrichPlace, createId, persist };

  if (req.method === 'GET' && url.pathname === '/api/merchant/taps') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再查看商家碰一碰记录' });
      return true;
    }
    send(res, 200, merchantTapService.listMerchantTaps(data, auth.account, options));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/merchant/taps') {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再进行商家碰一碰' });
      return true;
    }
    const result = merchantTapService.createMerchantTap(data, auth.account, { ...body, deviceId: auth.session.deviceId }, options);
    send(res, result.status, result.body);
    return true;
  }

  const merchantCheckinMatch = url.pathname.match(/^\/api\/merchant\/taps\/([^/]+)\/checkin$/);
  if (req.method === 'POST' && merchantCheckinMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再打卡' });
      return true;
    }
    const result = merchantTapService.merchantCheckin(data, auth.account, merchantCheckinMatch[1], options);
    send(res, result.status, result.body);
    return true;
  }

  const merchantPaymentMatch = url.pathname.match(/^\/api\/merchant\/taps\/([^/]+)\/payments$/);
  if (req.method === 'POST' && merchantPaymentMatch) {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再记录支付' });
      return true;
    }
    const result = merchantTapService.merchantPayment(data, auth.account, merchantPaymentMatch[1], body, options);
    send(res, result.status, result.body);
    return true;
  }

  const merchantItemReviewMatch = url.pathname.match(/^\/api\/merchant\/taps\/([^/]+)\/item-reviews$/);
  if (req.method === 'POST' && merchantItemReviewMatch) {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再评价消费物品' });
      return true;
    }
    const result = merchantTapService.merchantItemReview(data, auth.account, merchantItemReviewMatch[1], body, options);
    send(res, result.status, result.body);
    return true;
  }

  const merchantPlaceReviewMatch = url.pathname.match(/^\/api\/merchant\/taps\/([^/]+)\/place-reviews$/);
  if (req.method === 'POST' && merchantPlaceReviewMatch) {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再评价地点' });
      return true;
    }
    const result = merchantTapService.merchantPlaceReview(data, auth.account, merchantPlaceReviewMatch[1], body, options);
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleMerchantTapRoutes
};
