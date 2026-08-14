const PLACE_ROOM_TTL_MS = 30 * 60 * 1000;

function placeRoomToken(req) {
  return String(req.headers['x-place-room-token'] || '').trim();
}

function activePlaceRoomCount(data, placeId) {
  const sessions = Array.isArray(data.placeRoomSessions) ? data.placeRoomSessions : [];
  return sessions.filter(session => {
    return session.placeId === placeId &&
      session.status === 'active' &&
      Date.parse(session.expiresAt) > Date.now();
  }).length;
}

function publicPlacePosts(data, placeId) {
  const posts = Array.isArray(data.placePosts) ? data.placePosts : [];
  return posts
    .filter(post => post.placeId === placeId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 80);
}

function openPlaceRoom(data, place, account, options = {}) {
  const createId = options.createId;
  const secureToken = options.secureToken;
  const hashValue = options.hashValue;
  const persist = options.persist;
  if (typeof createId !== 'function' || typeof secureToken !== 'function' || typeof hashValue !== 'function') {
    return { status: 500, body: { error: 'PLACE_ROOM_DEPENDENCY_MISSING', message: '地点房间依赖未配置' } };
  }

  const token = secureToken() + secureToken();
  const now = new Date();
  data.placeRoomSessions = Array.isArray(data.placeRoomSessions) ? data.placeRoomSessions : [];
  data.placeRoomSessions.forEach(session => {
    if (session.userId === account.id && session.status === 'active') {
      session.status = 'closed';
      session.closedAt = now.toISOString();
    }
  });

  const session = {
    id: createId('place_room'),
    placeId: place.id,
    userId: account.id,
    tokenHash: hashValue(token),
    status: 'active',
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PLACE_ROOM_TTL_MS).toISOString(),
    closedAt: ''
  };
  data.placeRoomSessions.push(session);
  if (typeof persist === 'function') {
    persist(data);
  }

  const placeName = place.shortName || place.name;
  return {
    status: 201,
    body: {
      message: `已进入 ${placeName} 地点公共空间`,
      roomToken: token,
      expiresAt: session.expiresAt,
      onlineCount: activePlaceRoomCount(data, place.id),
      posts: publicPlacePosts(data, place.id),
      guardrails: {
        placeOnly: true,
        roomTokenRequired: true,
        expiresInMinutes: Math.round(PLACE_ROOM_TTL_MS / 60000),
        message: '公共聊天和分享只在当前地点页面内可用'
      }
    }
  };
}

function authenticatePlaceRoom(data, req, placeId, account, options = {}) {
  if (!account) {
    return null;
  }
  const hashValue = options.hashValue;
  if (typeof hashValue !== 'function') {
    return null;
  }
  const token = placeRoomToken(req);
  if (!token) {
    return null;
  }
  const tokenHash = hashValue(token);
  const sessions = Array.isArray(data.placeRoomSessions) ? data.placeRoomSessions : [];
  const session = sessions.find(item => {
    return item.tokenHash === tokenHash &&
      item.placeId === placeId &&
      item.userId === account.id &&
      item.status === 'active' &&
      Date.parse(item.expiresAt) > Date.now();
  });
  if (!session) {
    return null;
  }
  session.lastSeenAt = new Date().toISOString();
  return session;
}

function closePlaceRoom(data, req, placeId, account, options = {}) {
  const session = authenticatePlaceRoom(data, req, placeId, account, options);
  if (session) {
    session.status = 'closed';
    session.closedAt = new Date().toISOString();
    if (typeof options.persist === 'function') {
      options.persist(data);
    }
  }
  return { status: 200, body: { message: '已离开地点公共空间' } };
}

function roomFeed(data, place) {
  return {
    message: '地点广场已同步',
    onlineCount: activePlaceRoomCount(data, place.id),
    posts: publicPlacePosts(data, place.id),
    guardrails: {
      placeOnly: true,
      roomTokenRequired: true,
      publicChatScope: 'current-place'
    }
  };
}

function createPlacePost(data, place, account, body, type, options = {}) {
  const createId = options.createId;
  const placeActivity = options.placeActivity;
  const persist = options.persist;
  if (typeof createId !== 'function') {
    return { status: 500, body: { error: 'PLACE_ROOM_DEPENDENCY_MISSING', message: '地点房间依赖未配置' } };
  }

  const text = String(body.text || '').trim().slice(0, type === 'message' ? 240 : 360);
  if (text.length < 1) {
    return { status: 400, body: { error: 'CONTENT_REQUIRED', message: '请输入要发布的内容' } };
  }

  const activityId = String(body.activityId || '');
  const activity = activityId && typeof placeActivity === 'function' ? placeActivity(place, activityId) : null;
  if (activityId && !activity) {
    return { status: 404, body: { error: 'ACTIVITY_NOT_FOUND', message: '活动或比赛不存在' } };
  }

  data.placePosts = Array.isArray(data.placePosts) ? data.placePosts : [];
  const post = {
    id: createId('place_post'),
    placeId: place.id,
    type,
    authorId: account.id,
    authorName: account.displayName,
    text,
    activityId: activity ? activity.id : '',
    activityTitle: activity ? activity.title : '',
    shareLabel: type === 'share' ? String(body.shareLabel || '地点分享').slice(0, 24) : '',
    createdAt: new Date().toISOString()
  };
  data.placePosts.push(post);
  if (data.placePosts.length > 2000) {
    data.placePosts = data.placePosts.slice(-2000);
  }
  if (typeof persist === 'function') {
    persist(data);
  }

  return {
    status: 201,
    body: {
      message: type === 'message' ? '消息已发布到地点广场' : '内容已分享到地点广场',
      post,
      onlineCount: activePlaceRoomCount(data, place.id),
      guardrails: {
        placeOnly: true,
        roomTokenRequired: true,
        publicChatScope: 'current-place'
      }
    }
  };
}

module.exports = {
  PLACE_ROOM_TTL_MS,
  activePlaceRoomCount,
  authenticatePlaceRoom,
  closePlaceRoom,
  createPlacePost,
  openPlaceRoom,
  placeRoomToken,
  publicPlacePosts,
  roomFeed
};
