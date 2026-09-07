'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/modules/social-chat/social-chat.service');

function fixture() {
  return {
    friends: [{ id: 'b', ownerId: 'a', name: 'B' }, { id: 'a', ownerId: 'b', name: 'A' }, { id: 'demo' }],
    chats: [{ id: 'ab', friendId: 'b', participantIds: ['a', 'b'] }, { id: 'demo-chat', friendId: 'demo' }],
    chatMessages: [{ id: 'one', chatId: 'ab', text: 'hello', senderId: 'a', mine: true }],
    moments: [{ id: 'ma', authorId: 'a' }, { id: 'mc', authorId: 'c' }],
    myMoments: [{ id: 'ma', authorId: 'a' }, { id: 'legacy', authorId: 'me' }],
    connectionRequests: [{ id: 'cb', recipientId: 'b', senderId: 'c' }]
  };
}

test('new account cannot inherit seed friends, messages or connection requests', () => {
  const home = service.publicSocialHome(fixture(), { id: 'c' });
  for (const key of ['friends', 'chats', 'chatMessages', 'myMoments', 'connectionRequests']) assert.deepEqual(home[key], []);
  assert.deepEqual(home.moments.map(item => item.id), ['mc']);
});

test('both conversation members can read; mine is relative to authenticated account', () => {
  const data = fixture();
  assert.equal(service.chatMessages(data, 'ab', { id: 'a' }).body.messages[0].mine, true);
  assert.equal(service.chatMessages(data, 'ab', { id: 'b' }).body.messages[0].mine, false);
  assert.equal(service.chatMessages(data, 'ab', { id: 'c' }).status, 404);
  assert.equal(service.chatMessages(data, 'ab').status, 404);
});

test('send persists exact text; stranger cannot write and whitespace is rejected', () => {
  const data = fixture();
  const options = { createId: () => 'two' };
  assert.equal(service.createChatMessage(data, { id: 'c' }, 'ab', { text: 'intrusion' }, options).status, 404);
  assert.equal(service.createChatMessage(data, { id: 'b' }, 'ab', { text: '   ' }, options).status, 400);
  assert.equal(service.createChatMessage(data, { id: 'b' }, 'ab', { text: '你好' }, options).status, 201);
  const messages = service.chatMessages(data, 'ab', { id: 'a' }).body.messages;
  assert.equal(messages.length, 2);
  assert.equal(messages[1].text, '你好');
  assert.equal(messages[1].mine, false);
});

test('block by either participant stops read and send in both directions', () => {
  const data = fixture();
  data.blockedUsers = [{ userId: 'b', targetUserId: 'a', status: 'active' }];
  for (const id of ['a', 'b']) {
    assert.equal(service.chatMessages(data, 'ab', { id }).status, 404);
    assert.equal(service.createChatMessage(data, { id }, 'ab', { text: 'x' }).status, 404);
  }
});

test('connection requests are scoped to their recipient', () => {
  const data = fixture();
  assert.equal(service.updateConnectionRequest(data, 'cb', false, { account: { id: 'a' } }).status, 404);
  assert.equal(data.connectionRequests.length, 1);
  assert.equal(service.updateConnectionRequest(data, 'cb', false, { account: { id: 'b' } }).status, 200);
  assert.equal(data.connectionRequests.length, 0);
});

test('starting a conversation reuses a shared member-scoped chat', () => {
  const data = fixture();
  assert.equal(service.startFriendChat(data, 'b', { account: { id: 'a' } }).body.chat.id, 'ab');
  assert.equal(service.startFriendChat(data, 'a', { account: { id: 'b' } }).body.chat.id, 'ab');
  assert.equal(service.startFriendChat(data, 'b', { account: { id: 'c' } }).status, 404);
});

test('retry after response loss does not duplicate messages; conflicting reuse fails', () => {
  const data = fixture();
  const account = { id: 'a' };
  const body = { text: 'hello again', clientMessageId: 'retry-message-0001' };
  const first = service.createChatMessage(data, account, 'ab', body);
  assert.equal(first.status, 201);
  assert.equal(service.createChatMessage(data, account, 'ab', body).status, 200);
  assert.equal(data.chatMessages.length, 2);
  assert.equal(service.createChatMessage(data, account, 'ab', { ...body, text: 'changed' }).status, 409);
  assert.equal(service.createChatMessage(data, account, 'ab', { text: 'x'.repeat(501) }).status, 400);
});
