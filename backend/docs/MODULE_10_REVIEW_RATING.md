# 模块 10：Review Rating 评价评分

## 目标

评价评分系统是独立后端模块，不属于探索模块，也不属于 NFC Proof 模块。

它负责：

- 使用真实 NFC proof 校验评价资格。
- 五维评分校验与提交。
- 综合评分、五维评分、真实碰触评价数、复参率、可信分和可信等级聚合。
- 给探索页、地点页、排行榜提供只读评分摘要。

它不负责：

- 探索页搜索、筛选、地图标记和路线：模块 3 Explore。
- NFC 会话创建和双手机确认：模块 9 NFC Proof。
- 地点详情、活动、公共聊天：模块 4/5。

## 当前文件结构

```text
backend/src/modules/review-rating/
  rating.routes.js
  rating.service.js
```

## 已完成接口

- `GET /api/places/:placeId/rating`
  - 公开读取单地点评分汇总。
  - 返回 `contract: "SmallWorld Review Rating v1"`。
  - 保留前端兼容字段 `place`。
  - 同时返回 `summary`、`dimensions`、`recentReviews`、`guardrails`。

- `POST /api/reviews/nfc`
  - 登录用户凭两部手机碰一碰生成的 `proofId` 提交真实评价。
  - 请求体：

```json
{
  "placeId": "library",
  "proofId": "touch_xxx",
  "scores": {
    "comfort": 92,
    "match": 88,
    "safety": 95,
    "activity": 86,
    "world": 76
  },
  "comment": "这里适合轻松聊天",
  "repeatVisit": true
}
```

## 五维评分

```text
comfort  社交舒适度
match    兴趣匹配度
safety   安全感
activity 活动质量
world    小世界丰富度
```

每个维度必须是 `0-100` 的数字。

## 评分可信规则

提交评价必须满足：

- `proofId` 存在。
- proof 属于当前地点。
- proof 状态为 `completed`。
- proof transport 为 `iso_dep_apdu`。
- proof `hardwareVerified` 为 `true`。
- 当前评价用户必须是本次碰触双方之一。
- proof 未过期。
- 同一用户对同一个 proof 只能评价一次。

返回中的 `reviewWeight` 根据以下因素计算：

- NFC 硬件 proof。
- GPS 是否验证。
- 用户历史到场数。
- 用户社交图谱多样性。
- 用户评价稳定度。
- 评论完整度。
- 五维评分完整性。

## 评分摘要字段

`summarizePlaceRating(data, place)` 返回：

```text
rating
score
attendanceCount
arrivalCount
verifiedReviews
reviewTouchCount
nfcTouches
realTouchCount
repeatRate
trustScore
trustLabel
credibleRatingLevel
socialPressure
nfcEnabled
socialMetrics
```

## 与其他模块关系

- Explore 调用 `summarizePlaceRating`，只读消费评分摘要。
- Place 调用评分摘要展示地标可信等级、五维评分和奖牌进度。
- NFC Proof 生成 `touchProofs`。
- Review Rating 使用 `touchProofs` 校验评价资格并写入 `reviews`。
- Profile 可从评价和 proof 统计用户线下足迹。

## 云上迁移建议

PostgreSQL 表建议：

```text
reviews(
  id,
  place_id,
  proof_id,
  reviewer_user_id,
  comfort,
  match,
  safety,
  activity,
  world,
  comment,
  repeat_visit,
  status,
  created_at
)

place_rating_snapshots(
  place_id,
  score,
  comfort,
  match,
  safety,
  activity,
  world,
  verified_reviews,
  nfc_touches,
  repeat_rate,
  trust_score,
  trust_label,
  updated_at
)

review_trust_events(
  id,
  review_id,
  proof_id,
  reviewer_user_id,
  weight,
  reason_json,
  created_at
)
```

Redis 可用于：

- 防重复提交短锁。
- 热门地点评分摘要缓存。
- 风控计数器。

## 验证

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm run smoke
```
