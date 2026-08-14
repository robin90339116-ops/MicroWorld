# 模块 8：Profile / 我的页面

## 目标

这个模块服务当前前端的“我”页和所有个人中心子页。它不处理登录注册本身，登录注册仍属于 Auth 模块；它只读取已登录用户的个人展示、隐私设置、兴趣数据、奖杯、动态、俱乐部、日程和碰一碰记录。

## 文件结构

```text
backend/src/modules/profile/
  profile.routes.js
  profile.service.js
```

## 已完成接口

- `GET /api/me/profile`
  - 个人中心首页数据。
  - 返回 `contract: "SmallWorld Profile v1"`。
  - 包含 `display`、`settings`、`privacyGuardrails`、`stats`、`menu`、`trophies`、`moments`、`clubs`、`schedule`、`interestStats`、`nfc`。

- `POST /api/me/settings`
  - 保存个人隐私与通知设置。
  - 当前支持：`invisible`、`todayHidden`、`activityNotificationsEnabled`、`messageNotificationsEnabled`、`preciseLocationEnabled`、`nfcEnabled`。

- `GET /api/me/:feature`
  - 子页数据。
  - 支持 `trophies`、`moments`、`clubs`、`schedule`、`interest-data`、`nfc`、`settings`、`worlds`。
  - 也兼容前端页面名：`meTrophies`、`meMoments`、`meWorld`、`meClubs`、`meSchedule`、`meInterestData`、`meNfc`、`meSettings`。

## 当前数据来源

- 用户基础资料来自 Auth 模块的账号数据。
- 朋友数来自 `data.friends`。
- 个人动态来自 `data.myMoments`。
- 已加入俱乐部当前按用户兴趣优先排序，从 Interest/Club 模块的已认证俱乐部生成。
- 碰一碰信息来自 `data.touchProofs`。
- 设置保存到 `data.profileSettings[userId]`。

## 前端契约重点

- “我的页面”不是普通社交主页，要强调线下足迹、真实见过、隐私开关和碰一碰记录。
- `privacyGuardrails.privateProfileHiddenFromNearby` 用于前端判断是否在附近成员列表隐藏用户。
- `menu[*].endpoint` 已给出子页接口，前端可以直接按菜单进入。
- `worlds` 子页保持占位：世界模块后端暂缓，但我的页面仍可以展示入口。

## 云上迁移建议

后续迁移到 PostgreSQL 时可拆表：

```text
profile_settings(user_id, invisible, today_hidden, activity_notifications_enabled, message_notifications_enabled, precise_location_enabled, nfc_enabled)
user_metrics(user_id, score, attendance_count, repeat_place_count, friend_count, moment_count, nfc_exchange_count)
user_trophies(user_id, trophy_id, name, date, metadata_json)
user_interest_stats(user_id, interest_name, count, pct, source)
```

## 验证

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm run smoke
```
