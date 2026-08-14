const ratingService = require('./rating.service');

async function handleRatingRoutes({
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
  const ratingMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/rating$/);
  if (req.method === 'GET' && ratingMatch) {
    const data = readData();
    const place = pickPlace(data, ratingMatch[1]);
    if (!place) {
      send(res, 404, { error: 'PLACE_NOT_FOUND', message: '地点不存在' });
      return true;
    }
    send(res, 200, ratingService.getPlaceRating(data, place, { enrichPlace }));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/reviews/nfc') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再评价' });
      return true;
    }
    const result = ratingService.submitNfcReview(data, auth.account, await readBody(req), {
      pickPlace,
      enrichPlace,
      createId,
      persist
    });
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleRatingRoutes
};
