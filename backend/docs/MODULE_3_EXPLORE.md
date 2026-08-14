# SmallWorld 后端模块 3：Explore 探索

## 目标

模块 3 只负责当前前端“探索”页需要的后端能力：

- 附近地点和地标列表。
- 地点地图标记和当前位置距离。
- 地点、兴趣、活动检索。
- 兴趣和距离筛选。
- 地点与活动推荐排序。
- 展示 Review Rating 模块提供的综合评分、五维评分、真实碰触评价数、到场数、复参率和可信等级。
- 路线规划预览、系统导航入口、AI 路线暂缓状态。

它不负责：

- 评价提交、评分权重、评分聚合与可信等级算法：独立模块 Review Rating。
- 地点详情页完整内容：后续模块 4 Place。
- 地点公共聊天：后续模块 5 Place Room。
- AI 线下导游：当前仍按计划返回 501。
- 世界模块：当前仍按计划返回 501。

## 当前文件结构

```text
backend/
  server.js
  src/modules/explore/
    explore.routes.js
    explore.service.js
  src/modules/review-rating/
    rating.service.js
  tests/
    smoke.js
```

### `explore.routes.js`

负责 HTTP 路由适配，当前接管：

- `GET /api/explore/places`
- `POST /api/explore/route-plan`

### `explore.service.js`

负责探索业务逻辑：

- `buildExploreHome(data, searchParams)`
- `listPlaces(data, searchParams)`
- `listActivities(places)`
- `enrichPlace(data, place, origin)`
- `buildRoutePlan(data, body)`
- `geoDistanceMeters(...)`
- `formatDistance(distanceMeters)`

注意：`explore.service.js` 会调用 `review-rating/rating.service.js` 取得评分摘要，但不拥有评价算法。

### `server.js`

当前仍是兼容入口：

- 引入 `explore.routes.js`。
- 保留 `publicPlaces()`、`enrichPlace()`、`buildRoutePlan()` 包装函数，供地点详情、评分、旧代码继续使用。
- 后续模块 4/5 拆完后，可以逐步删除这些兼容包装。

## 当前接口

### `GET /api/explore/places`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `latitude` | 当前纬度，可选 |
| `longitude` | 当前经度，可选 |
| `q` | 搜索关键词，可搜地点、地标、兴趣、活动 |
| `interest` | 兴趣筛选，例如 `读书`、`咖啡`、`摄影` |
| `maxDistance` | 最大距离，单位米 |
| `distance` | 最大距离别名，单位米 |

返回：

```json
{
  "places": [],
  "activities": [],
  "meta": {
    "contract": "SmallWorld Explore v1",
    "frontendRequiredFields": [],
    "filters": {},
    "deferred": {
      "aiRoute": true
    }
  }
}
```

当前前端实际需要的地点字段：

```text
id
name
shortName
tags
score
attendanceCount
nfcTouches
rating.comfort
rating.match
rating.safety
trustLabel
socialPressure
address
introduction
activities
```

本模块额外补充的字段：

```text
arrivalCount
reviewTouchCount
realTouchCount
repeatRate
credibleRatingLevel
mapMarker
socialMetrics
routeEntrypoints
```

这些字段是为了后续把探索页地图、筛选、可信等级、系统导航入口做得更完整。

### `POST /api/explore/route-plan`

请求体：

```json
{
  "placeId": "library",
  "latitude": -37.8136,
  "longitude": 144.9637
}
```

返回：

```json
{
  "placeId": "library",
  "placeName": "State Library",
  "mode": "walking",
  "provider": "system-navigation-preview",
  "distanceMeters": 330,
  "durationMinutes": 6,
  "start": {},
  "destination": {},
  "systemNavigation": {
    "enabled": true
  },
  "aiRoute": {
    "enabled": false,
    "deferred": true
  }
}
```

## 评分与排序逻辑

评分数据来源：

- `src/modules/review-rating/rating.service.js`
- `summarizePlaceRating(data, place)`

探索推荐排序综合：

- 综合评分。
- 社交舒适度。
- 兴趣匹配度。
- 安全感。
- 可信分。
- 到场数。

评分权重、NFC proof 对应评价、用户历史到场稳定度、社交图谱自然度、评价完整度和评论质量都不在探索模块内计算。

## 当前测试覆盖

`backend/tests/smoke.js` 已覆盖：

- 探索接口能返回地点和活动。
- 探索接口返回 `SmallWorld Explore v1` 契约。
- 地点包含前端必需字段。
- 地点包含 `mapMarker`、`socialMetrics`、`routeEntrypoints`。
- 路线规划返回距离、时间、系统导航入口和 AI 暂缓状态。

运行：

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm run smoke
```

## 下一步可删改点

你可以检查后决定：

- 是否要把 `mapMarker` 改成更贴近前端地图组件的字段。
- 是否要把 `socialMetrics` 拆成前端五维评分面板专用结构。
- 是否要把 `routeEntrypoints.aiRoute` 从暂缓状态隐藏，而不是返回给前端。
- 是否把地点搜索从内存过滤升级为数据库全文搜索。
- 是否把推荐排序公式独立到 `explore.ranking.js`。
