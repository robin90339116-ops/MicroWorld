const placeService = require('./place.service');

async function handlePlaceRoutes({
  req,
  res,
  url,
  send,
  readData,
  authenticate,
  authenticatePlaceRoom,
  createId,
  persist
}) {
  const activityDetailMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/activities\/([^/]+)$/);
  if (req.method === 'GET' && activityDetailMatch) {
    const data = readData();
    const result = placeService.getActivityDetail(data, activityDetailMatch[1], activityDetailMatch[2]);
    send(res, result.status, result.body);
    return true;
  }

  const placeRecognitionMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/recognition$/);
  if (req.method === 'GET' && placeRecognitionMatch) {
    const data = readData();
    const place = placeService.pickPlace(data, placeRecognitionMatch[1]);
    if (!place) {
      send(res, 404, { error: 'PLACE_NOT_FOUND', message: '地点或地标不存在' });
      return true;
    }
    const auth = authenticate(data, req);
    send(res, 200, placeService.placeRecognition(data, place, auth ? auth.account : null));
    return true;
  }

  const placeMedalClaimMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/medals\/([^/]+)\/claim$/);
  if (req.method === 'POST' && placeMedalClaimMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '登录后才能领取地标奖牌' });
      return true;
    }
    const place = placeService.pickPlace(data, placeMedalClaimMatch[1]);
    const room = place ? authenticatePlaceRoom(data, req, place.id, auth.account) : null;
    if (!place || !room) {
      send(res, 403, {
        error: 'PLACE_ROOM_REQUIRED',
        message: '奖牌只能在打开对应地标页面时领取'
      });
      return true;
    }
    const result = placeService.claimPlaceMedal(data, place, auth.account, placeMedalClaimMatch[2], {
      createId,
      persist
    });
    send(res, result.status, result.body);
    return true;
  }

  const collectibleMatch = url.pathname.match(/^\/api\/collectibles\/([^/]+)$/);
  if (req.method === 'GET' && collectibleMatch) {
    const data = readData();
    const result = placeService.getCollectible(data, collectibleMatch[1]);
    send(res, result.status, result.body);
    return true;
  }

  const placeDetailMatch = url.pathname.match(/^\/api\/places\/([^/]+)$/);
  if (req.method === 'GET' && placeDetailMatch) {
    const data = readData();
    const result = placeService.getPlaceDetail(data, placeDetailMatch[1], url.searchParams);
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handlePlaceRoutes
};
