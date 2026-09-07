const socialChatService = require('./social-chat.service');

async function handleSocialChatRoutes({
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

  if (req.method === 'GET' && url.pathname === '/api/social/home') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '登录后才能同步朋友、聊天和动态' });
      return true;
    }
    persist(data);
    send(res, 200, socialChatService.publicSocialHome(data, auth.account));
    return true;
  }

  const chatMessageMatch = url.pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
  if (req.method === 'GET' && chatMessageMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再同步聊天' });
      return true;
    }
    const result = socialChatService.chatMessages(data, chatMessageMatch[1], auth.account);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'POST' && chatMessageMatch) {
    const body = await readBody(req);
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再发送消息' });
      return true;
    }
    const result = socialChatService.createChatMessage(data, auth.account, chatMessageMatch[1], body, options);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/chats') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再同步对话' });
      return true;
    }
    send(res, 200, socialChatService.listChats(data, auth.account));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/friends') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再查看朋友' });
      return true;
    }
    send(res, 200, socialChatService.listFriends(data, auth.account));
    return true;
  }

  const friendChatMatch = url.pathname.match(/^\/api\/friends\/([^/]+)\/chat$/);
  if (req.method === 'POST' && friendChatMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再发起对话' });
      return true;
    }
    const result = socialChatService.startFriendChat(data, friendChatMatch[1], {
      ...options,
      account: auth.account
    });
    send(res, result.status, result.body);
    return true;
  }

  const friendDetailMatch = url.pathname.match(/^\/api\/friends\/([^/]+)$/);
  if (req.method === 'GET' && friendDetailMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再查看朋友' });
      return true;
    }
    const result = socialChatService.getFriend(data, friendDetailMatch[1], auth.account);
    send(res, result.status, result.body);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/social/moments') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再同步动态' });
      return true;
    }
    send(res, 200, socialChatService.listMoments(data, auth.account));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/social/my-moments') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再同步个人动态' });
      return true;
    }
    send(res, 200, socialChatService.listMyMoments(data, auth.account));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/social/moments') {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再发布动态' });
      return true;
    }
    const result = socialChatService.createMoment(data, auth.account, await readBody(req), options);
    send(res, result.status, result.body);
    return true;
  }

  const connectionActionMatch = url.pathname.match(/^\/api\/connections\/([^/]+)\/(accept|decline)$/);
  if (req.method === 'POST' && connectionActionMatch) {
    const data = readData();
    const auth = authenticate(data, req);
    if (!auth) {
      send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录后再处理连接请求' });
      return true;
    }
    const result = socialChatService.updateConnectionRequest(
      data,
      connectionActionMatch[1],
      connectionActionMatch[2] === 'accept',
      {
        ...options,
        account: auth.account
      }
    );
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleSocialChatRoutes
};
