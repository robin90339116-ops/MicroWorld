function socialGuardrails() {
  return {
    relationshipRequired: true,
    groupsEnabled: false,
    publicRoomsEnabled: false,
    chatType: 'one-to-one',
    sourceRule: '只和真实见过、同地点互动过或共同完成任务的人建立聊天',
    blocksPreventInteraction: true
  };
}

function activeBlockedUserIds(data, account) {
  if (!account || !account.id || !Array.isArray(data.blockedUsers)) {
    return new Set();
  }
  return new Set(data.blockedUsers
    .filter(item => item.status === 'active' && (item.userId === account.id || item.targetUserId === account.id))
    .map(item => item.userId === account.id ? item.targetUserId : item.userId));
}

function publicFriends(data, account = null) {
  if (!account || !account.id) return [];
  const blockedIds = activeBlockedUserIds(data, account);
  const friends = Array.isArray(data.friends) ? data.friends : [];
  const moments = Array.isArray(data.moments) ? data.moments : [];
  // Legacy seed rows without ownership are not real relationships.
  return friends.filter(friend => friend.ownerId === account.id && !blockedIds.has(friend.id)).map((friend, index) => {
    const latestMoment = moments.find(moment => moment.authorId === friend.id) || null;
    return {
      ...friend,
      source: friend.relation || friend.source || '真实见过',
      place: friend.metAt || friend.place || '线下地点',
      momentTime: latestMoment ? latestMoment.time : (friend.momentTime || '刚刚'),
      momentText: latestMoment ? latestMoment.text : (friend.momentText || friend.relation || '新的线下互动记录已同步。'),
      score: Number(friend.score || (156 - index * 18)),
      rank: index + 1,
      relationshipVerified: true,
      chatType: 'direct',
      isGroup: false
    };
  });
}

function directChats(data, account = null) {
  if (!account || !account.id) return [];
  const friends = publicFriends(data, account);
  const visibleFriendIds = new Set(friends.map(friend => friend.id));
  const chats = Array.isArray(data.chats) ? data.chats : [];
  return chats
    .filter(chat => {
      if (Array.isArray(chat.participantIds)) {
        return chat.participantIds.length === 2 && chat.participantIds.includes(account.id) &&
          visibleFriendIds.has(chat.participantIds.find(id => id !== account.id));
      }
      return chat.ownerId === account.id && chat.friendId && visibleFriendIds.has(chat.friendId);
    })
    .map(chat => ({
      ...chat,
      friendId: Array.isArray(chat.participantIds) ? chat.participantIds.find(id => id !== account.id) : chat.friendId,
      type: 'direct',
      isGroup: false,
      group: null,
      friend: friends.find(friend => friend.id === chat.friendId) || null
    }));
}

function publicSocialHome(data, account) {
  const visibleChats = directChats(data, account);
  const chatIds = new Set(visibleChats.map(chat => chat.id));
  const myMoments = listMyMoments(data, account).moments;
  return {
    contract: 'SmallWorld Social Chat v1',
    guardrails: socialGuardrails(),
    friends: publicFriends(data, account),
    chats: visibleChats,
    chatMessages: (data.chatMessages || []).filter(message => chatIds.has(message.chatId))
      .map(message => ({ ...message, mine: message.senderId === account.id })),
    moments: listMoments(data, account).moments,
    myMoments,
    connectionRequests: (data.connectionRequests || []).filter(item => item.recipientId === account.id)
  };
}

function listFriends(data, account = null) {
  const friends = publicFriends(data, account);
  return {
    guardrails: socialGuardrails(),
    friends,
    count: friends.length
  };
}

function getFriend(data, friendId, account = null) {
  const friend = publicFriends(data, account).find(item => item.id === friendId);
  if (!friend) {
    return { status: 404, body: { error: 'FRIEND_NOT_FOUND', message: '朋友不存在或尚未建立连接' } };
  }
  const chat = directChats(data, account).find(item => item.friendId === friend.id) || null;
  return {
    status: 200,
    body: {
      guardrails: socialGuardrails(),
      friend,
      chat
    }
  };
}

function listChats(data, account = null) {
  return {
    guardrails: socialGuardrails(),
    chats: directChats(data, account)
  };
}

function chatMessages(data, chatId, account = null) {
  const chat = directChats(data, account).find(item => item.id === chatId);
  if (!chat) {
    return { status: 404, body: { error: 'CHAT_NOT_FOUND', message: '对话不存在或不是一对一聊天' } };
  }
  const messages = Array.isArray(data.chatMessages) ? data.chatMessages : [];
  return {
    status: 200,
    body: {
      guardrails: socialGuardrails(),
      chat,
      friend: publicFriends(data, account).find(friend => friend.id === chat.friendId) || null,
      messages: messages.filter(message => message.chatId === chatId)
        .map(message => ({ ...message, mine: message.senderId === account.id }))
    }
  };
}

function createChatMessage(data, account, chatId, body, options = {}) {
  const visible = directChats(data, account).find(item => item.id === chatId);
  const chat = visible && (data.chats || []).find(item => item.id === chatId);
  if (!chat) {
    return { status: 404, body: { error: 'CHAT_NOT_FOUND', message: '对话不存在或不是一对一聊天' } };
  }
  const friend = publicFriends(data, account).find(item => item.id === visible.friendId);
  if (!friend) {
    return { status: 403, body: { error: 'RELATIONSHIP_REQUIRED', message: '只有已经建立真实关系的人才能聊天' } };
  }
  if (activeBlockedUserIds(data, account).has(friend.id)) {
    return { status: 403, body: { error: 'USER_BLOCKED', message: '你已拉黑该用户，不能继续发送消息' } };
  }
  const text = String(body.text || '').trim();
  if (!text || text.length > 500) {
    return { status: 400, body: { error: 'MESSAGE_REQUIRED', message: '请输入消息内容' } };
  }
  const clientMessageId = String(body.clientMessageId || '');
  if (clientMessageId && !/^[a-zA-Z0-9-]{16,80}$/.test(clientMessageId)) {
    return { status: 400, body: { error: 'INVALID_MESSAGE_ID', message: '消息标识无效' } };
  }
  if (clientMessageId) {
    const existing = (data.chatMessages || []).find(item => item.senderId === account.id &&
      item.chatId === chatId && item.clientMessageId === clientMessageId);
    if (existing) {
      if (existing.text !== text) return { status: 409, body: { error: 'MESSAGE_ID_CONFLICT', message: '消息标识已用于其他内容' } };
      return { status: 200, body: { message: '消息已发送', chat: visible, chatMessage: existing } };
    }
  }
  const createId = typeof options.createId === 'function' ? options.createId : prefix => `${prefix}_${Date.now()}`;
  const message = {
    id: createId('chat_message'),
    chatId: chat.id,
    text,
    mine: true,
    senderId: account.id,
    clientMessageId,
    createdAt: new Date().toISOString(),
    time: '刚刚'
  };
  data.chatMessages = Array.isArray(data.chatMessages) ? data.chatMessages : [];
  data.chatMessages.push(message);
  chat.message = text;
  chat.time = '刚刚';
  chat.unread = 0;
  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 201,
    body: {
      message: '消息已发送',
      guardrails: socialGuardrails(),
      chat: {
        ...chat,
        type: 'direct',
        isGroup: false
      },
      chatMessage: message
    }
  };
}

function createMoment(data, account, body, options = {}) {
  const text = String(body.text || '').trim().slice(0, 360);
  const place = String(body.place || '真实地点').trim().slice(0, 80);
  if (!text) {
    return { status: 400, body: { error: 'MOMENT_REQUIRED', message: '请输入动态内容' } };
  }
  const createId = typeof options.createId === 'function' ? options.createId : prefix => `${prefix}_${Date.now()}`;
  const displayName = account.displayName || '城市书签';
  const moment = {
    id: createId('moment'),
    authorId: account.id,
    authorName: displayName,
    authorAvatar: displayName.slice(0, 1),
    visibility: 'seen-connections',
    time: '刚刚',
    text,
    place,
    likes: 0,
    comments: 0
  };
  data.moments = Array.isArray(data.moments) ? data.moments : [];
  data.myMoments = Array.isArray(data.myMoments) ? data.myMoments : [];
  data.moments.unshift(moment);
  data.myMoments.unshift(moment);
  data.moments = data.moments.slice(0, 120);
  data.myMoments = data.myMoments.slice(0, 80);
  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 201,
    body: {
      message: '动态已发布，只会展示给真实见过的人',
      guardrails: socialGuardrails(),
      moment
    }
  };
}

function updateConnectionRequest(data, requestId, accepted, options = {}) {
  data.connectionRequests = Array.isArray(data.connectionRequests) ? data.connectionRequests : [];
  const account = options.account;
  const request = data.connectionRequests.find(item => item.id === requestId && account && item.recipientId === account.id);
  if (!request) {
    return { status: 404, body: { error: 'REQUEST_NOT_FOUND', message: '连接请求不存在' } };
  }
  if (accepted) {
    return { status: 409, body: { error: 'NFC_CONFIRMATION_REQUIRED', message: '请通过双方碰一碰确认建立连接' } };
  }
  data.connectionRequests = data.connectionRequests.filter(item => item.id !== requestId);
  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 200,
    body: {
      message: accepted ? `已确认与「${request.name}」的连接` : '已暂不建立连接',
      guardrails: socialGuardrails(),
      connectionRequests: data.connectionRequests.filter(item => item.recipientId === account.id),
      chats: directChats(data, options.account || null)
    }
  };
}

function startFriendChat(data, friendId, options = {}) {
  const friend = publicFriends(data, options.account).find(item => item.id === friendId);
  if (!friend) {
    return { status: 404, body: { error: 'FRIEND_NOT_FOUND', message: '朋友不存在或尚未建立连接' } };
  }
  if (activeBlockedUserIds(data, options.account).has(friendId)) {
    return { status: 403, body: { error: 'USER_BLOCKED', message: '你已拉黑该用户，不能打开聊天' } };
  }
  data.chats = Array.isArray(data.chats) ? data.chats : [];
  let chat = directChats(data, options.account).find(item => item.friendId === friendId);
  if (!chat) {
    chat = {
      id: `chat-${[options.account.id, friendId].sort().join('-')}`,
      friendId,
      participantIds: [options.account.id, friendId],
      message: '你们已经确认真实见过，可以从共同经历开始聊天。',
      time: '现在',
      unread: 0
    };
    data.chats.unshift(chat);
    if (typeof options.persist === 'function') {
      options.persist(data);
    }
  }
  return {
    status: 200,
    body: {
      guardrails: socialGuardrails(),
      chat: {
        ...chat,
        type: 'direct',
        isGroup: false
      },
      friend
    }
  };
}

function listMoments(data, account = null) {
  const visibleIds = new Set(publicFriends(data, account).map(friend => friend.id));
  if (account) visibleIds.add(account.id);
  return {
    guardrails: socialGuardrails(),
    moments: (data.moments || []).filter(moment => visibleIds.has(moment.authorId))
  };
}

function listMyMoments(data, account) {
  const moments = (Array.isArray(data.myMoments) ? data.myMoments : []).filter(moment => {
    return moment.authorId === account.id;
  });
  return {
    guardrails: socialGuardrails(),
    moments
  };
}

module.exports = {
  chatMessages,
  createChatMessage,
  createMoment,
  getFriend,
  listChats,
  listFriends,
  listMoments,
  listMyMoments,
  publicFriends,
  publicSocialHome,
  socialGuardrails,
  startFriendChat,
  updateConnectionRequest
};
