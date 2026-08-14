# 模块 4：Place 地点 / 地标详情

## 目标

Place 模块负责用户打开某个地点或地标之后看到的完整详情页数据，包括地点简介、正在进行的活动或比赛、排行榜入口、数字奖牌展示，以及地点页对真实到场和可信评价的摘要展示。

这个模块对应前端里的地点 / 地标详情页，不负责探索列表筛选，也不负责地点公共聊天本身。

## 文件结构

```text
backend/src/modules/place/
  place.routes.js
  place.service.js
```

仍由兼容入口挂载：

```text
backend/server.js
```

## 已接入接口

### GET /api/places/:placeId

返回地点详情页所需数据。

响应核心字段：

```text
place
  id
  name
  shortName
  introduction
  address
  latitude
  longitude
  openingHours
  tags
  activities
  roomRules
  rating
  attendanceCount
  nfcTouches
  revisitRate
  trustLevel
recognitionPreview
  leaderboards
  medalCount
```

### GET /api/places/:placeId/activities/:activityId

返回地点内单个活动或比赛详情。

响应核心字段：

```text
place
activity
  id
  title
  description
  rules
  status
  type
  participants
  capacity
  recognition
    leaderboardMode
    medalEligible
```

### GET /api/places/:placeId/recognition

返回地标排行榜和数字奖牌展示数据。

响应核心字段：

```text
placeId
placeName
rating
leaderboards
  contribution
  competition
  attendance
medals
nftNotice
```

### POST /api/places/:placeId/medals/:medalId/claim

领取地点奖牌。当前要求：

- 必须登录。
- 必须已经打开对应地点页并持有地点房间令牌。
- 必须满足奖牌领取条件。

当前奖牌是 SmallWorld 数字藏品凭证，不标记为已上链 NFT。后续如果接链或腾讯云 / 华为云数字藏品能力，可以从这里扩展。

### GET /api/collectibles/:tokenId

返回已领取奖牌的公开元数据，用于前端展示 NFT / 数字奖牌详情。

## 与其他模块的边界

Place 依赖：

- Explore 模块：复用地点公开展示结构、距离、地图标记和路线入口字段。
- Review Rating 模块：复用五维评分、真实碰触评价数、可信等级摘要。
- NFC Proof 模块：读取真实碰触记录，计算真实到场榜和奖牌进度。
- World 模块数据：只读取共建贡献数量，不提供世界模块后端能力。

Place 不负责：

- 探索页搜索、筛选、地图列表：属于模块 3 Explore。
- 地点评价创建和权重计算：属于模块 10 Review Rating。
- 地点页公共聊天、分享、房间令牌：属于模块 5 Place Room。
- AI 导游、世界模块后端、兴趣 AI 助手：当前版本暂缓。

## 当前数据来源

当前仍使用 JSON 文件存储：

```text
backend/data.json
```

主要读取集合：

```text
places
accounts
touchProofs
reviews
placePosts
competitionResults
worlds
userMedals
```

未来迁移 PostgreSQL 时，建议拆成：

```text
places
place_activities
place_leaderboard_seed_entries
place_medal_catalog
user_place_medals
collectible_metadata
competition_results
```

## 当前完成状态

- 已从 `server.js` 拆出地点详情、活动详情、Recognition、奖牌领取和藏品元数据接口。
- 已删除 `server.js` 中重复的排行榜和奖牌静态目录。
- 已更新 smoke test，覆盖地点详情、活动详情、排行榜和奖牌字段。

## 下一步模块

模块 5 Place Room：地点页公共聊天与分享。它需要保证公共聊天和分享必须从地点详情页打开后才能使用，不能变成全局广场或普通群聊。
