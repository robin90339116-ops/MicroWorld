const placeRoomService = require('./place-room.service');

function roomDependencies(options) {
  return {
    createId: options.createId,
    hashValue: options.hashValue,
    placeActivity: options.placeActivity,
    persist: options.persist,
    secureToken: options.secureToken
  };
}

async function handlePlaceRoomRoutes({
  req,
  res,
  url,
  send,
  readData,
  readBody,
  authenticate,
  pickPlace,
  placeActivity,
  createId,
  secureToken,
  hashValue,
  persist
}) {
  const deps = roomDependencies({ createId, secureToken, hashValue, placeActivity, persist });

  const placeRoomOpenMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/room\/open$/);
  if (req.method === 'POST' && placeRoomOpenMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '登录后才能进入地点公共空间' });
      return true;
    }
    const place = pickPlace(data, placeRoomOpenMatch[1]);
    if (!place) {
      send(res, 404, { error: 'PLACE_NOT_FOUND', message: '地点或地标不存在' });
      return true;
    }
    const result = placeRoomService.openPlaceRoom(data, place, auth.account, deps);
    send(res, result.status, result.body);
    return true;
  }

  const placeRoomCloseMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/room\/close$/);
  if (req.method === 'POST' && placeRoomCloseMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
      return true;
    }
    const result = placeRoomService.closePlaceRoom(data, req, placeRoomCloseMatch[1], auth.account, deps);
    send(res, result.status, result.body);
    return true;
  }

  const placeRoomFeedMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/room\/feed$/);
  if (req.method === 'GET' && placeRoomFeedMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
      return true;
    }
    const place = pickPlace(data, placeRoomFeedMatch[1]);
    const room = place ? placeRoomService.authenticatePlaceRoom(data, req, place.id, auth.account, deps) : null;
    if (!place || !room) {
      send(res, 403, { error: 'PLACE_ROOM_REQUIRED', message: '请从地点页面重新进入公共空间' });
      return true;
    }
    persist(data);
    send(res, 200, placeRoomService.roomFeed(data, place));
    return true;
  }

  const placeRoomMessageMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/room\/messages$/);
  if (req.method === 'POST' && placeRoomMessageMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
      return true;
    }
    const place = pickPlace(data, placeRoomMessageMatch[1]);
    const room = place ? placeRoomService.authenticatePlaceRoom(data, req, place.id, auth.account, deps) : null;
    if (!place || !room) {
      send(res, 403, { error: 'PLACE_ROOM_REQUIRED', message: '公共聊天只能在打开的地点页面使用' });
      return true;
    }
    const result = placeRoomService.createPlacePost(data, place, auth.account, await readBody(req), 'message', deps);
    send(res, result.status, result.body);
    return true;
  }

  const placeRoomShareMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/room\/shares$/);
  if (req.method === 'POST' && placeRoomShareMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
      return true;
    }
    const place = pickPlace(data, placeRoomShareMatch[1]);
    const room = place ? placeRoomService.authenticatePlaceRoom(data, req, place.id, auth.account, deps) : null;
    if (!place || !room) {
      send(res, 403, { error: 'PLACE_ROOM_REQUIRED', message: '公共分享只能在打开的地点页面使用' });
      return true;
    }
    const result = placeRoomService.createPlacePost(data, place, auth.account, await readBody(req), 'share', deps);
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handlePlaceRoomRoutes
};
