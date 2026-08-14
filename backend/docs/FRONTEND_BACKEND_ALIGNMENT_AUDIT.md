# SmallWorld 当前前端与后端对齐检查

检查日期：2026-07-20

## 结论

当前前端真正的入口是：

- `entry/src/main/ets/pages/Index.ets`：HarmonyOS WebView 外壳。
- `entry/src/main/resources/rawfile/smallworld_prototype.html`：实际 App 页面、底栏、交互和 API 调用。

因此后端模块必须按 `smallworld_prototype.html` 的页面和接口来对齐，而不是按旧版“探索/实景/世界/聊天/我”拆法对齐。现在底栏已经变成：

```text
探索 / 兴趣 / 世界 / 聊天 / 我
```

其中“实景”已经并入“世界”页，“兴趣”是新的第二个 Tab。

## 后端状态接口

- `GET /health`：服务健康检查。
- `GET /api/system/modules`：当前模块状态、云目标和底栏契约。
- `GET /api/system/frontend-contract`：当前前端页面契约、关键接口、暂缓模块。

## 当前前端实际调用的接口

| 前端页面 | 前端调用 | 后端状态 |
| --- | --- | --- |
| 登录 / 注册 | `POST /api/auth/login`、`POST /api/auth/register` | 已接入 |
| 创建身份 | `POST /api/auth/profile` | 已接入 |
| 启动同步 | `GET /health` | 已接入 |
| 探索 | `GET /api/explore/places` | 已接入 |
| 地点详情 | `GET /api/places/:placeId` | 已接入 |
| 地点公共聊天 | `POST /api/places/:placeId/room/open`、`GET /room/feed`、`POST /room/messages` | 已接入 |
| 路线规划 | `POST /api/explore/route-plan` | 已接入 |
| AI 路线入口 | `POST /api/explore/ai-route` | 按计划返回 501 |
| 聊天首页 | `GET /api/social/home` | 已接入 |
| 一对一对话 | `GET/POST /api/chats/:chatId/messages` | 已接入 |
| 我的页面同步 | `GET /api/me/profile` | 已接入 |
| NFC 会话 | `POST /api/nfc/sessions` | 已接入 |
| NFC 评价 | `POST /api/reviews/nfc` | 已接入，但前端还缺完整双机确认 UI |

## 按当前前端重新划分模块

### 1. Auth 与身份

前端页面：`login`、`register`、`identity`

后端已完成：

- 注册、登录、登出。
- Bearer Token 会话。
- 密码 PBKDF2-SHA256 哈希。
- 设备级会话替换。
- 兴趣与社交意图保存。

当前可继续拆分到独立模块，不影响前端。

### 2. 探索

前端页面：`explore`、`place`、`placeActivity`、`placeChat`、`routePlan`、`routePlanAR`、`aiRoute`

后端已完成：

- 地点列表。
- 地点简介、地址、真实到场数、真实碰触评价数、复参率、可信等级。
- 五维评分：社交舒适度、兴趣匹配度、安全感、活动质量、小世界丰富度。
- 地点内活动/比赛。
- 地点详情。
- 地点公共聊天和分享的短时房间令牌。
- 路线距离与时间计算。
- 地标排行榜和数字藏品奖牌数据。

注意：

- 地图 SDK 属于前端/客户端能力，后端只提供坐标、地点与路线数据。
- 当前 WebView 原型内是轻量地图视觉，不依赖模拟器里的高德原生地图。
- AI 路线入口按你的要求暂不写后端，统一返回 501。

### 3. 兴趣

前端页面：`interest`、`interestDetail`、`clubDetail`、`interestAI`

后端已准备：

- `GET /api/interests`
- `GET /api/interests/:interestId`
- `GET /api/interests/:interestId/clubs`
- `GET /api/clubs/:clubId`
- `GET /api/clubs/:clubId/leaderboard`

当前差异：

- 前端兴趣页仍主要使用静态展示，没有主动调用这些接口。
- 兴趣 AI 助手后端按计划暂不写，返回 501。

### 4. 世界

前端页面：`world`、`cameraFull`、`createWorld`、`worldDetail`、`worldEditor`、`shareWorld`

当前状态：

- 前端是本地交互和展示壳。
- 后端 `/api/worlds...` 按你的要求暂不实现，统一返回 501。
- MR/AR 作为补充显示方式目前只应保留接口计划，不进入后端实现。

重要边界：

- “实景”已经合并进世界页。
- 当前版本不把世界模块算作后端已完成模块。

### 5. 聊天

前端页面：`chat`、`chatFriends`、`chatMoments`、`chatDetail`、`chatSettings`、`profileDetail`

后端已完成：

- `GET /api/social/home` 返回朋友、一对一聊天、聊天消息、动态、连接请求。
- `GET /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/messages`
- `GET /api/friends`
- `GET /api/friends/:friendId`
- `POST /api/friends/:friendId/chat`

当前对齐原则：

- 后端不返回群聊。
- 聊天关系只来自真实见过、共同任务或共同地点互动。
- 地点公共聊天只存在于地点详情页的房间里，不进入聊天 Tab。

### 6. 我

前端页面：`profile`、`meTrophies`、`meMoments`、`meWorld`、`meClubs`、`meSchedule`、`meInterestData`、`meNfc`、`meSettings`

后端已准备：

- `GET /api/me/profile`
- `GET /api/me/trophies`
- `GET /api/me/moments`
- `GET /api/me/clubs`
- `GET /api/me/schedule`
- `GET /api/me/interest-data`
- `GET /api/me/nfc`
- `GET /api/me/settings`
- `POST /api/me/settings`

当前差异：

- 前端“我的页面”仍在使用本地数组渲染。
- 后端已经补齐与当前 UI 结构一致的菜单、奖杯、动态、俱乐部、日程、兴趣数据、碰一碰信息和设置行，后续可以直接把页面切到接口数据。
- `GET /api/me/worlds` 返回世界后端暂缓状态。

### 7. NFC 真实评价

后端已完成完整链路：

1. 手机 A：`POST /api/nfc/sessions`
2. 手机 B：`POST /api/nfc/sessions/confirm`
3. 手机 A/B：`GET /api/nfc/sessions/:sessionId`
4. 任一碰触参与者：`POST /api/reviews/nfc`

后端会拒绝：

- 同一用户或同一设备伪造碰触。
- 非 `iso_dep_apdu` 的碰触。
- 过期 token。
- 重复确认。
- 非碰触参与者提交评价。

当前差异：

- 前端原型目前只有“创建 NFC 会话”和“提交评价”入口，没有完整手机 B 确认、手机 A 轮询 proof 的 UI。
- 后端 smoke test 已覆盖完整双账号 NFC 碰触和评价流程。

### 8. 商家碰一碰

后端已完成：

- 商家碰一碰。
- 到店打卡。
- 消费记录。
- 商品评价。

当前差异：

- 当前前端没有接入商家碰一碰页面。

## 暂缓模块

这些不是遗漏，是当前版本按你的要求先不写：

- AI 线下导游后端：`POST /api/explore/ai-route`
- 世界模块后端：`/api/worlds...`
- 兴趣 AI 助手后端：`POST /api/interests/ai-assistant`

## 本次检查后的代码调整

- 模块状态按当前底栏和 WebView 前端重新描述。
- 新增 `GET /api/system/frontend-contract`。
- 聊天朋友数据补齐 `source`、`place`、`momentTime`、`momentText`、`score`、`rank`。
- 我的页面后端补齐菜单、奖杯、动态、俱乐部、日程、兴趣记录、NFC 信息和设置行。
- smoke test 扩展为当前前端主链路回归：探索、地点详情、地点公共聊天、兴趣、俱乐部、聊天、个人中心、NFC 双手机确认、真实评价和暂缓接口。

## 下一步建议

如果继续一个模块一个模块做，建议顺序是：

1. 探索模块拆分：`explore.routes/service/store`，因为它是首页和演示核心。
2. 地点模块拆分：地点详情、活动比赛、排行榜、奖牌。
3. 地点公共房间模块拆分：确保公共聊天只能从地点页进入。
4. 兴趣模块前端接后端：把当前静态兴趣页换成接口数据。
5. 我的页面前端接后端：把当前静态数组换成 `/api/me/profile`。
6. NFC 前端双机确认 UI：把后端已完成的真实碰触流程接到手机 A/B。
7. 再单独进入世界模块、AI 导游、兴趣 AI 助手。
