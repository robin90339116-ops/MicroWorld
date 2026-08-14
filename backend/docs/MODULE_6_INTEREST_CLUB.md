# 模块 6：Interest/Club 兴趣与俱乐部

## 目标

Interest/Club 模块负责兴趣页的基础后端能力：兴趣检索、兴趣简介、学习方法、入门建议、关联地点、关联俱乐部，以及俱乐部详情和俱乐部排行榜。

这个模块服务底部导航里的“兴趣”页。它不是 AI 兴趣助手，AI 兴趣助手在当前版本继续保持 501 占位。

## 文件结构

```text
backend/src/modules/interest-club/
  interest-club.routes.js
  interest-club.service.js
```

仍由兼容入口挂载：

```text
backend/server.js
```

## 已接入接口

### GET /api/interests

兴趣检索与筛选。

查询参数：

```text
q
category
```

响应核心字段：

```text
contract
categories
topics
  id
  name
  category
  glyph
  summary
  beginnerLevel
  learningDuration
  socialStyle
  tags
  learningSteps
  tools
  clubs
  places
```

### GET /api/interests/:interestId

兴趣详情。

用于前端打开某个兴趣后展示完整简介、学习方法、关联地点和俱乐部。

### GET /api/interests/:interestId/clubs

返回某个兴趣下的全部俱乐部。

### GET /api/clubs/:clubId

俱乐部详情。

响应会带上：

```text
club
interest
```

其中 `club.place` 会包含绑定地标或地点的基础信息。

### GET /api/clubs/:clubId/leaderboard

俱乐部排行榜。

当前排行榜按真实到场、活动贡献和可信互动综合计算，不以聊天热度计分。

## 与其他模块的边界

Interest/Club 依赖：

- Place：用于把兴趣和俱乐部绑定到真实地点。
- Profile：个人中心会复用已认证俱乐部列表作为“已加入的俱乐部”展示来源。

Interest/Club 不负责：

- AI 兴趣助手：当前版本继续由 `/api/interests/ai-assistant` 返回 501。
- 地点详情、活动比赛、奖牌：属于 Place 模块。
- 地点公共聊天与分享：属于 Place Room 模块。
- 一对一聊天：属于 Social Chat 模块。

## 当前数据来源

当前仍使用模块内静态目录：

```text
INTEREST_TOPICS
INTEREST_CLUBS
CLUB_LEADERBOARD
```

未来迁移 PostgreSQL 时建议拆表：

```text
interest_topics
interest_topic_tags
interest_topic_steps
interest_topic_tools
clubs
club_place_bindings
club_leaderboard_entries
```

建议索引：

```text
interest_topics(category)
clubs(interest_id)
clubs(place_id)
club_leaderboard_entries(club_id, score desc)
```

## 当前完成状态

- 已从 `server.js` 拆出兴趣检索、兴趣详情、俱乐部详情和俱乐部榜单接口。
- 已删除 `server.js` 中重复的兴趣 / 俱乐部静态目录和旧函数。
- 已让个人中心通过 Interest/Club 模块读取已认证俱乐部。
- 已更新 smoke test，覆盖兴趣搜索、详情、俱乐部列表、俱乐部详情和排行榜。

## 下一步模块

模块 7 Social Chat：朋友、一对一聊天、动态，不做群聊。
