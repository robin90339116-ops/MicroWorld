# 模块 5：Place Room 地点页公共聊天 / 分享

## 目标

Place Room 模块负责地点或地标页面里的公共聊天与分享。它不是全局广场，也不是群聊。用户必须先打开具体地点页面并获取地点房间令牌，之后才能读取该地点的公共 feed、发公共消息或分享活动内容。

核心产品规则：

- 公共聊天必须绑定真实地点。
- 公共分享必须在打开地点或地标页面后才能使用。
- 房间令牌有有效期，默认 30 分钟。
- 离开地点页面或关闭房间后，旧令牌不能继续使用。

## 文件结构

```text
backend/src/modules/place-room/
  place-room.routes.js
  place-room.service.js
```

仍由兼容入口挂载：

```text
backend/server.js
```

## 已接入接口

### POST /api/places/:placeId/room/open

打开地点公共空间，返回 `roomToken`。

要求：

- 必须登录。
- 地点必须存在。

响应核心字段：

```text
roomToken
expiresAt
onlineCount
posts
guardrails
  placeOnly
  roomTokenRequired
  expiresInMinutes
```

### GET /api/places/:placeId/room/feed

同步当前地点的公共 feed。

要求：

- 必须登录。
- 必须带 `X-Place-Room-Token`。
- token 必须属于当前用户和当前地点。
- token 必须仍然有效。

### POST /api/places/:placeId/room/messages

发布地点公共聊天消息。

要求：

- 必须登录。
- 必须带有效地点房间 token。
- 内容不能为空。

消息限制：

```text
message: 240 字以内
```

### POST /api/places/:placeId/room/shares

发布地点分享内容，可以绑定当前地点里的活动或比赛。

要求：

- 必须登录。
- 必须带有效地点房间 token。
- 如果传入 `activityId`，该活动必须属于当前地点。

分享限制：

```text
share: 360 字以内
shareLabel: 24 字以内
```

### POST /api/places/:placeId/room/close

关闭当前地点房间 token。

关闭后：

- token 继续请求 feed 会返回 `PLACE_ROOM_REQUIRED`。
- 需要重新打开地点页面才能再次进入公共空间。

## 数据结构

当前仍使用 JSON 文件存储：

```text
placeRoomSessions
placePosts
```

`placeRoomSessions` 示例：

```text
id
placeId
userId
tokenHash
status
createdAt
lastSeenAt
expiresAt
closedAt
```

`placePosts` 示例：

```text
id
placeId
type
authorId
authorName
text
activityId
activityTitle
shareLabel
createdAt
```

## 与其他模块的边界

Place Room 依赖：

- Auth：确认当前登录用户。
- Place：确认地点存在、活动属于地点。
- Shared security：使用 token hash，不保存明文 room token。

Place Room 提供：

- 地点页公共 feed。
- 地点页公共聊天消息。
- 地点页公共分享。
- `authenticatePlaceRoom` 规则，供 Place 模块领取奖牌时校验“用户确实打开了该地点页面”。

Place Room 不负责：

- 一对一朋友聊天：属于 Social Chat 模块。
- 真实 NFC 到场 proof：属于 NFC Proof 模块。
- 五维评价：属于 Review Rating 模块。
- 地点详情、排行榜、奖牌目录：属于 Place 模块。

## 迁移云数据库建议

未来迁移 PostgreSQL 时建议拆表：

```text
place_room_sessions
place_posts
```

建议索引：

```text
place_room_sessions(token_hash)
place_room_sessions(place_id, user_id, status, expires_at)
place_posts(place_id, created_at desc)
place_posts(activity_id)
```

如果接 Redis，可把短期 room token session 放 Redis，JSON/PostgreSQL 只保留审计记录。

## 当前完成状态

- 已从 `server.js` 拆出地点公共空间路由和服务。
- 已保留 `server.js` 中的薄认证桥接，供 Place 奖牌领取继续复用。
- 已更新 smoke test，覆盖未打开地点页拒绝、打开房间、feed、发消息、分享、关闭后拒绝。

## 下一步模块

模块 6 Interest/Club：兴趣检索、简介、学习方法、关联地标、俱乐部和榜单。
