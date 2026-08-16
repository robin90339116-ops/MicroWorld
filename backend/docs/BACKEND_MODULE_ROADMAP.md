# MicroWorld 后端模块拆分路线

## 模块顺序

0. 基础与部署底座：已完成第一轮。
1. Auth：注册、登录、会话、密码、设备。已完成第一轮拆分，见 `docs/MODULE_1_AUTH.md`。
2. Frontend Contract：以当前 ArkUI 原生前端为准，锁定底栏、页面、字段和暂缓模块。已完成第一轮检查，见 `docs/FRONTEND_BACKEND_ALIGNMENT_AUDIT.md`。
3. Explore：探索首页、地点标记、活动推荐、搜索筛选、评分摘要展示、路线。已完成第一轮拆分，见 `docs/MODULE_3_EXPLORE.md`。
4. Place：地点详情、活动比赛、排行榜、奖牌。已完成第一轮拆分，见 `docs/MODULE_4_PLACE.md`。
5. Place Room：地点页公共聊天、分享、房间令牌，保证公共聊天只能从地点页进入。已完成第一轮拆分，见 `docs/MODULE_5_PLACE_ROOM.md`。
6. Interest/Club：兴趣检索、简介、学习方法、关联地标、俱乐部和榜单。已完成第一轮拆分，见 `docs/MODULE_6_INTEREST_CLUB.md`。
7. Social Chat：朋友、一对一聊天、动态，不做群聊。已完成第一轮拆分，见 `docs/MODULE_7_SOCIAL_CHAT.md`。
8. Profile：我的页面、个人资料、兴趣数据、隐私、安全设置。已完成第一轮拆分，见 `docs/MODULE_8_PROFILE.md`。
9. NFC Proof：手机碰一碰会话、确认、proof。已完成第一轮拆分，见 `docs/MODULE_9_NFC_PROOF.md`。
10. Review Rating：真实评价、五维评分、可信等级。已完成第一轮拆分，见 `docs/MODULE_10_REVIEW_RATING.md`。
11. Merchant Tap：商家碰一碰、消费和物品评价。已完成第一轮拆分，见 `docs/MODULE_11_MERCHANT_TAP.md`。
12. Safety：举报、拉黑、安全按钮、审计。已完成第一轮拆分，见 `docs/MODULE_12_SAFETY.md`。
13. Admin：地点、活动、奖牌、用户审核后台。

暂不做：

- AI 线下导游。
- 兴趣 AI 助手。

## 每个模块的完成标准

每个模块完成时都必须满足：

- 有清晰的 routes/service/store 分层。
- 保持现有前端接口兼容。
- 有本地 smoke test 或 curl 验证命令。
- 数据结构能迁移到 PostgreSQL。
- README 记录请求体、响应体和错误码。

## 推荐拆分结构

```text
backend/
  server.js
  package.json
  src/
    app.js
    config/
      env.js
    shared/
      response.js
      auth.js
      id.js
      jsonStore.js
    modules/
      auth/
        auth.routes.js
        auth.service.js
        auth.store.js
      frontend-contract/
      profile/
      explore/
      place/
      place-room/
      chat/
      interest/
      nfc/
      review/
      merchant/
```

当前 `server.js` 会作为兼容入口保留，等一个模块拆完并测试通过，再从旧文件里删除对应逻辑。

## 当前前端契约

真实前端入口：

```text
entry/src/main/ets/pages/Index.ets
```

当前底部导航：

```text
探索 / 兴趣 / 世界 / 聊天 / 我
```

后端必须优先服务这些页面已经调用的接口：

- 登录注册与身份：`/api/auth/register`、`/api/auth/login`、`/api/auth/profile`。
- 探索与地点：`/api/explore/places`、`/api/places/:placeId`、`/api/explore/route-plan`。
- 地点公共空间：`/api/places/:placeId/room/open`、`/room/feed`、`/room/messages`。
- 聊天：`/api/social/home`、`/api/chats/:chatId/messages`。
- 我的页面：`/api/me/profile`、`/api/me/:feature`。
- 真实评价：`/api/nfc/sessions`、`/api/nfc/sessions/confirm`、`/api/reviews/nfc`。

当前前端还没有消费但后端已经准备好的接口：

- 兴趣/俱乐部：`/api/interests...`、`/api/clubs...`。
- 我的页面子数据：`/api/me/trophies`、`/api/me/moments`、`/api/me/clubs`、`/api/me/schedule`、`/api/me/interest-data`、`/api/me/nfc`、`/api/me/settings`。
- 商家碰一碰：`/api/merchant...`。

当前必须保持占位的接口：

- `POST /api/explore/ai-route`
- `POST /api/interests/ai-assistant`
- `/api/worlds...`
