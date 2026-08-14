# 模块 7：Social Chat 朋友 / 一对一聊天 / 动态

## 目标

Social Chat 模块负责聊天页的后端能力：朋友列表、一对一会话、消息、动态、个人动态和连接请求处理。

这个模块明确不做群聊。SmallWorld 的聊天关系必须来自真实见过、同地点互动、共同活动或共同小世界经历。

## 文件结构

```text
backend/src/modules/social-chat/
  social-chat.routes.js
  social-chat.service.js
```

仍由兼容入口挂载：

```text
backend/server.js
```

## 已接入接口

### GET /api/social/home

聊天页首页聚合数据。

响应核心字段：

```text
contract
guardrails
friends
chats
chatMessages
moments
myMoments
connectionRequests
```

`guardrails` 固定表达当前社交规则：

```text
relationshipRequired: true
groupsEnabled: false
publicRoomsEnabled: false
chatType: one-to-one
```

### GET /api/friends

返回朋友列表。

朋友字段会带：

```text
relationshipVerified
chatType: direct
isGroup: false
source
place
momentText
```

### GET /api/friends/:friendId

返回朋友详情和对应一对一会话。

### POST /api/friends/:friendId/chat

发起或打开与某个朋友的一对一聊天。

要求：

- 必须登录。
- `friendId` 必须已经是朋友关系。
- 不会创建群聊。

### GET /api/chats

返回一对一会话列表。

所有会话都带：

```text
type: direct
isGroup: false
group: null
friend
```

### GET /api/chats/:chatId/messages

返回某个一对一会话的消息。

### POST /api/chats/:chatId/messages

发送消息。

要求：

- 必须登录。
- 只能发给已经建立真实关系的朋友。
- 只支持一对一会话。

### GET /api/social/moments

同步好友动态。

### GET /api/social/my-moments

同步我的动态。

### POST /api/social/moments

发布动态。

动态不会成为全局广场内容，当前 visibility 为：

```text
seen-connections
```

### POST /api/connections/:requestId/accept

接受连接请求。

### POST /api/connections/:requestId/decline

拒绝连接请求。

## 数据结构

当前仍使用 JSON 文件：

```text
friends
chats
chatMessages
moments
myMoments
connectionRequests
```

## 与其他模块的边界

Social Chat 依赖：

- Auth：所有聊天、朋友和动态接口都要求登录。
- NFC Proof / Place / Place Room：这些模块产生关系来源，但不由 Social Chat 直接创建 proof。

Social Chat 不负责：

- 地点页公共聊天：属于 Place Room。
- 群聊：当前版本不做。
- 世界共建空间消息：世界模块后端当前暂缓。
- 五维评价：属于 Review Rating。

## 迁移云数据库建议

未来迁移 PostgreSQL 时建议拆表：

```text
friend_edges
direct_chats
chat_messages
social_moments
connection_requests
```

建议索引：

```text
friend_edges(user_id, friend_id)
direct_chats(user_id, friend_id)
chat_messages(chat_id, created_at)
social_moments(author_id, created_at)
connection_requests(target_user_id, status)
```

## 当前完成状态

- 已从 `server.js` 拆出朋友、一对一聊天、动态和连接请求接口。
- 已删除 `server.js` 中旧社交聊天函数和旧路由块。
- 已为返回数据补上 `guardrails`，明确不做群聊。
- 已更新 smoke test，覆盖朋友、会话、消息、动态和连接请求。

## 下一步模块

模块 8 Profile：我的页面、个人资料、兴趣数据、隐私、安全设置。
