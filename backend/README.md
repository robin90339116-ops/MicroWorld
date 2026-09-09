# MicroWorld 后端

这个后端包含用户注册登录、登录态、探索地点、兴趣、聊天、个人中心、商家碰一碰评价与安全审计。NFC 记录属于客户端报告，不代表硬件认证或真实到场已核验。

当前已经进入“模块化后端 + 云部署”阶段。模块 0-12 已按当前前端契约完成第一轮拆分：Auth、探索、地点、地点公共空间、兴趣/俱乐部、朋友聊天、个人中心、世界、NFC Proof、Review Rating、Merchant Tap 和 Safety 已接入。

功能状态以 [最新验收记录](../docs/IMPLEMENTATION_ACCEPTANCE.md) 为准，不将接口实现等同于真机或生产验收。真实支付未配置时拒绝创建订单，商品评价保持关闭；默认数字凭证未上链。以下暂缓模块统一返回 `501`，避免前端误判为已完成：

- `POST /api/explore/ai-route`
- `POST /api/interests/ai-assistant`

## 启动

```bash
cd backend
npm ci
npm run start:example
```

以上命令需 Node.js 22，读取 `.env.example`，默认监听 `127.0.0.1:8787`。自定义配置使用 `npm run start:local` 读取自行创建的 `.env`；已有环境变量优先于文件。原 `npm start` 不自动读取 `.env`，保留默认监听 `0.0.0.0` 的部署行为。详见 [本地调试与配置安全](../docs/LOCAL_DEMO_SETUP.md)。

可用环境变量：

- `SMALLWORLD_BACKEND_PORT`：监听端口。
- `SMALLWORLD_BACKEND_HOST`：监听地址。
- `SMALLWORLD_DATA_FILE`：JSON 数据文件路径，适合测试时隔离数据。
- `SMALLWORLD_BACKEND_VERSION`：健康检查和模块状态返回的后端版本。
- `SMALLWORLD_CORS_ORIGIN`：CORS 来源，开发环境可用 `*`，生产环境建议配置为明确来源。
世界模块已开放基础列表、创建、物件和访问接口。AI 图像生成供应商仍为可选配置；未配置时会返回本地可复现的视觉占位数据。

模块状态：

```bash
curl http://127.0.0.1:8787/api/system/modules
```

当前前端-后端契约：

```bash
curl http://127.0.0.1:8787/api/system/frontend-contract
```

本地回归测试：

```bash
cd backend
npm run smoke
```

Docker 运行：

```bash
cd backend
docker compose up --build
```

真机或模拟器调试时，手机访问 Mac 上的服务通常不能只依赖 `127.0.0.1` 或某一个局域网 IP。当前 ArkUI 前端会自动尝试：

```text
http://127.0.0.1:8787
http://localhost:8787
http://10.0.2.2:8787
```

如果模拟器无法访问 Mac 的 `127.0.0.1`，可以使用 DevEco/hdc 端口转发；真机运行时需要把候选地址配置为 Mac 当前局域网地址或云端 HTTPS 地址。

## 用户认证

- `POST /api/auth/register`：昵称、邮箱、密码注册，并返回登录令牌。
- `POST /api/auth/login`：邮箱密码登录。
- `GET /api/auth/me`：使用 Bearer Token 恢复登录状态。
- `POST /api/auth/profile`：保存兴趣和线下社交意图。
- `POST /api/auth/logout`：注销当前会话。

注册示例：

```bash
curl -X POST http://127.0.0.1:8787/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"城市书签","email":"city@example.com","password":"MicroWorld123","deviceId":"phone-a"}'
```

除注册、登录和探索公共数据外，NFC 及评价接口需要：

```text
Authorization: Bearer <登录返回的 token>
```

密码使用 PBKDF2-SHA256 和独立随机盐保存，不存储明文密码。会话令牌在服务端只保存 SHA-256 摘要，默认 30 天有效。同一账号在同一设备重新登录时，旧会话会被替换。

## 当前前端对齐

后端以 `entry/src/main/ets/pages/Index.ets` 作为当前 ArkUI 前端契约。底部导航为：

```text
探索 / 兴趣 / 世界 / 聊天 / 我
```

完整对齐检查见 `docs/FRONTEND_BACKEND_ALIGNMENT_AUDIT.md`。

## 兴趣、俱乐部与聊天

- `GET /api/interests`：兴趣检索，支持 `q` 和 `category` 查询参数。
- `GET /api/interests/:interestId`：兴趣详情、简介、学习方法、关联地点和俱乐部。
- `GET /api/interests/:interestId/clubs`：某个兴趣下的俱乐部列表。
- `GET /api/clubs/:clubId`：俱乐部详情和绑定地点。
- `GET /api/clubs/:clubId/leaderboard`：俱乐部排行榜。
- `GET /api/social/home`：登录后同步朋友、聊天、聊天消息、动态和连接请求。
- `GET /api/chats`：聊天列表，只包含真实见过或共同互动形成的一对一对话。
- `GET /api/chats/:chatId/messages`：读取对话消息。
- `POST /api/chats/:chatId/messages`：发送消息。
- `GET /api/friends`：朋友列表。
- `GET /api/friends/:friendId`：朋友详情和关系来源。
- `POST /api/friends/:friendId/chat`：从朋友页打开或创建一对一聊天。
- `GET /api/social/moments`：朋友动态。
- `GET /api/social/my-moments`：我的动态。
- `POST /api/social/moments`：发布动态，只展示给真实见过的人。

当前内置兴趣包括：读书/阅读、摄影、桌游、咖啡、音乐、运动、艺术、电影、城市探索、手作和宠物。兴趣 AI 助手接口本轮按要求暂不实现。

## 个人中心

- `GET /api/me/profile`：个人中心首页。
- `GET /api/me/trophies`：比赛奖杯展示。
- `GET /api/me/moments`：个人动态。
- `GET /api/me/clubs`：已加入的俱乐部。
- `GET /api/me/schedule`：个人比赛日程。
- `GET /api/me/interest-data`：兴趣记录数据。
- `GET /api/me/nfc`：碰一碰记录。
- `GET /api/me/settings`：隐私与通知设置。
- `POST /api/me/settings`：保存隐私与通知设置。
- `GET /api/me/worlds`：返回当前账号可见的个人虚拟世界摘要。

## 安全与隐私审计

Safety 模块只补后端能力，不要求当前前端新增入口。当前前端保持原来的设置页结构；后续需要时可以直接接以下接口。

- `GET /api/safety/home`：安全中心摘要、隐私状态、举报/拉黑/安全事件计数。
- `POST /api/safety/privacy`：保存隐私设置，并写入审计；与 `POST /api/me/settings` 使用同一份 `profileSettings` 数据。
- `POST /api/safety/reports`：提交举报，支持用户、地点、聊天、动态、地点公共消息、活动、商家、世界等对象。
- `GET /api/safety/reports`：查看当前用户举报记录。
- `POST /api/safety/blocks`：拉黑用户。
- `GET /api/safety/blocks`：查看黑名单。
- `POST /api/safety/blocks/:blockId/remove`：解除拉黑。
- `POST /api/safety/panic`：创建安全按钮事件。
- `POST /api/safety/events/:eventId/resolve`：结束安全事件。
- `GET /api/safety/audit`：同步当前用户安全审计记录。

拉黑会在后端约束朋友与一对一聊天：被拉黑用户不会出现在朋友列表和聊天列表里，也不能继续读取或发送对应聊天。

## 线下评价接口

- `GET /api/explore/places`：探索页地点、活动、五维评分和真实评价数据。支持 `latitude`、`longitude`、`q`、`interest`、`maxDistance` 查询参数。
- `POST /api/explore/route-plan`：根据当前位置和地点 ID 生成步行距离、预计时间与路线端点。
- `POST /api/explore/ai-route`：既有路线建议接口；AI 线下导游完整版后端本轮按要求暂不扩展。
- `GET /api/places/:placeId`：获取地点简介、开放时间、活动和比赛详情。
- `GET /api/places/:placeId/activities/:activityId`：获取地点内的单个活动或比赛详情。
- `POST /api/places/:placeId/room/open`：从地点页进入短时地点公共空间。
- `GET /api/places/:placeId/room/feed`：读取该地点的公共聊天和分享。
- `POST /api/places/:placeId/room/messages`：发送地点公共消息。
- `POST /api/places/:placeId/room/shares`：分享地点动态、活动或比赛。
- `POST /api/places/:placeId/room/close`：离开地点页并使房间令牌失效。
- `GET /api/places/:placeId/recognition`：读取地标贡献榜、比赛榜、真实到场榜和 NFT 奖牌馆。
- `POST /api/places/:placeId/medals/:medalId/claim`：核验真实行为后领取地标数字藏品凭证。
- `GET /api/collectibles/:tokenId`：读取奖牌唯一编号对应的公开元数据。
- `POST /api/nfc/sessions`：手机 A 领取两分钟有效的一次性 HCE 令牌。
- `POST /api/nfc/sessions/confirm`：手机 B 通过 ReaderMode/ISO-DEP 读取令牌后确认双方身份，生成碰触 proof。
- `GET /api/nfc/sessions/:sessionId`：手机 A 查询手机 B 是否完成真实碰触确认。
- `GET /api/nfc/proofs`：查询当前用户最近的真实碰一碰凭证。
- `POST /api/reviews/nfc`：凭碰触凭证提交评价。
- `GET /api/places/:placeId/rating`：单地点评分汇总。

旧的 `/api/nfc/touches/demo` 模拟接口已删除。后端会拒绝同一用户、同一设备、自造 token、过期 token、重复确认和非碰触参与者提交的评价。

探索地点查询示例：

```bash
curl 'http://127.0.0.1:8787/api/explore/places?latitude=-37.8136&longitude=144.9637&interest=读书&maxDistance=3000'
```

路线规划示例：

```bash
curl -X POST http://127.0.0.1:8787/api/explore/route-plan \
  -H 'Content-Type: application/json' \
  -d '{"placeId":"library","latitude":-37.8136,"longitude":144.9637}'
```

地点公共聊天和分享接口除登录令牌外，还必须携带由 `room/open` 返回的短时令牌：

```text
X-Place-Room-Token: <roomToken>
```

地点房间令牌与用户和地点同时绑定，默认 30 分钟有效。打开另一个地点、主动关闭地点页或令牌过期后，旧令牌不能继续发送消息或分享。客户端没有全局公共群聊入口，朋友聊天仍走独立的一对一关系。

## 商家碰一碰评价

商家碰一碰用于“到店、消费、评价物品”的轻量链路，和地点真实 NFC 评价分开存储。

- `POST /api/merchant/taps`：登录用户与商家设备完成一次碰一碰。
- `GET /api/merchant/taps`：查询当前用户最近的商家碰一碰记录。
- `POST /api/merchant/taps/:tapId/checkin`：基于碰一碰记录完成到店打卡。
- `POST /api/merchant/taps/:tapId/payments`：记录一笔消费。
- `POST /api/merchant/taps/:tapId/item-reviews`：对消费物品提交评价。

商家碰一碰返回 `contract: "MicroWorld Merchant Tap v1"`。它不会自动建立社交关系，也不会替代两部用户手机之间的真实见过 proof。

## 地标排行榜与 NFT 奖牌

每个地标提供三种独立排行榜：

- 本周贡献：真实碰触到场、可信评价、地点分享和小世界共建的综合贡献。
- 活动比赛：只统计主办方确认的比赛成绩。
- 真实到场：只统计两部手机通过 NFC ISO-DEP/APDU 形成的碰触记录。

奖牌领取由后端根据碰触证明、评价、比赛成绩和世界共建记录核验，同时要求用户仍持有当前地点页的 `X-Place-Room-Token`。奖牌拥有唯一 `tokenId`、发行编号和公开元数据。当前实现的 `chainStatus` 为 `digital-certificate`，代表 MicroWorld 数字藏品凭证；尚未配置公链合约，所以界面不会把它标记成已上链 NFT。

## 评分模型

后端不会把完整公式公开到前端，只返回概括结果：综合评分、五维线下社交评分、NFC 碰触评价数、真实碰触数、复参率、可信度等级。内部权重综合：

- NFC HCE / ISO-DEP APDU 硬件凭证
- GPS 到场确认
- 复参记录
- 社交图谱自然度
- 历史评价稳定性
- 评价完整度

这符合资料中“真实行为先于主观评价”的原则。

## 暂缓模块

以下接口目前保留占位并统一返回 `501`，等基础模块部署稳定后再单独实现：

- `POST /api/explore/ai-route`：AI 线下导游。
- `POST /api/interests/ai-assistant`：兴趣 AI 助手。

世界模块后端已开放基础列表、创建、物件编辑、发布、协作者和访问接口；AI 图像生成供应商未配置时会回落到本地占位视觉。
