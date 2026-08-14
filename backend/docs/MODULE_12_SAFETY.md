# Module 12: Safety

## 目标

Safety 模块负责 SmallWorld 的举报、拉黑、安全按钮、隐私审计。

本模块只补后端，不修改当前前端。当前前端仍保持原来的设置页结构；后续如果需要把“账号与安全 / 隐私设置”做成可点击页面，可以直接接入这里的接口。

## 已完成接口

所有接口都需要登录令牌：

```text
Authorization: Bearer <token>
```

### GET /api/safety/home

同步安全中心摘要。

返回重点字段：

```json
{
  "contract": "SmallWorld Safety v1",
  "controls": [
    { "key": "privacy", "endpoint": "POST /api/safety/privacy" },
    { "key": "report", "endpoint": "POST /api/safety/reports" },
    { "key": "block", "endpoint": "POST /api/safety/blocks" },
    { "key": "panic", "endpoint": "POST /api/safety/panic" }
  ],
  "privacy": {},
  "reportCount": 0,
  "blockCount": 0,
  "openSafetyEventCount": 0
}
```

### POST /api/safety/privacy

保存隐私设置，并写入安全审计。

请求体：

```json
{
  "invisible": true,
  "todayHidden": false,
  "preciseLocationEnabled": true,
  "nfcEnabled": true
}
```

这个接口与当前已有 `POST /api/me/settings` 使用同一份 `profileSettings` 数据。

### POST /api/safety/reports

提交举报。

请求体：

```json
{
  "targetType": "user",
  "targetId": "photo",
  "targetUserId": "photo",
  "reason": "骚扰",
  "placeId": "library",
  "description": "不舒服的现场互动"
}
```

允许的 `targetType`：

```text
user / place / chat / moment / room-post / activity / merchant / world
```

允许的 `reason`：

```text
骚扰 / 不安全行为 / 虚假信息 / 冒充 / 垃圾信息 / 违规内容 / 其他
```

### GET /api/safety/reports

查看当前用户提交过的举报记录。

### POST /api/safety/blocks

拉黑用户。

请求体：

```json
{
  "targetUserId": "photo",
  "targetName": "慢半拍摄影",
  "reason": "不想继续互动"
}
```

拉黑后，后端会在朋友列表、聊天列表、聊天消息读取、发送消息、打开聊天时过滤或拒绝对应用户。

### GET /api/safety/blocks

查看当前用户黑名单。

### POST /api/safety/blocks/:blockId/remove

解除拉黑。

### POST /api/safety/panic

创建安全按钮事件。

请求体：

```json
{
  "placeId": "library",
  "latitude": -37.8136,
  "longitude": 144.9637,
  "deviceId": "phone-a",
  "message": "需要记录当前现场情况"
}
```

### POST /api/safety/events/:eventId/resolve

结束安全事件。

### GET /api/safety/audit

同步当前用户安全审计记录，包含：

- `reports`
- `blocks`
- `events`

## 数据结构

当前 JSON 存储新增三个集合：

```text
safetyReports
blockedUsers
safetyEvents
```

迁移 PostgreSQL 时建议对应三张表：

```text
safety_reports(id, reporter_user_id, target_type, target_id, target_user_id, reason, description, place_id, status, created_at, updated_at)
blocked_users(id, user_id, target_user_id, target_name, reason, status, created_at, updated_at, removed_at)
safety_events(id, user_id, type, severity, place_id, target_type, target_id, target_user_id, message, metadata, status, created_at, resolved_at)
```

## 与当前前端的关系

当前前端不变：

- `我 -> 设置` 仍然只展示既有静态设置列表。
- 登录、个人中心、聊天、地点公共空间继续使用已有接口。
- Safety 接口先作为后端能力就绪，不强制前端新增入口。

后续如果要把设置页里的“账号与安全 / 隐私设置”做成可点页面，可以直接读取：

```text
GET /api/safety/home
GET /api/safety/audit
POST /api/safety/privacy
```

如果要给用户资料页或聊天设置增加举报/拉黑入口，可以直接调用：

```text
POST /api/safety/reports
POST /api/safety/blocks
```

## 验证

```bash
cd backend
npm run smoke
```

Smoke test 会验证：

- 安全中心同步。
- 隐私设置保存。
- 举报创建和列表读取。
- 拉黑创建、朋友/聊天过滤、解除拉黑。
- 安全按钮事件创建与结束。
- 审计列表读取。
