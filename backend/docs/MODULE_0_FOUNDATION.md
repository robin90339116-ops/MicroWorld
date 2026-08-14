# SmallWorld 后端模块 0：基础与部署底座

## 目标

模块 0 的目标不是重写业务，而是让现有后端具备稳定的本地运行、自动验证和云部署基础。

已完成：

- 新增 `package.json`，统一使用 `npm start`、`npm run smoke`。
- 新增 `/health` 健康检查，返回版本、运行时间和数据模式。
- 新增 `/api/system/modules`，返回已启用模块、暂缓模块和当前云目标。
- 新增 `.env.example`，集中列出后端环境变量。
- 新增 `Dockerfile`、`.dockerignore`、`docker-compose.yml`。
- 新增 `tests/smoke.js`，验证健康检查、模块状态、当前前端契约、探索地点、注册登录、地点详情、地点公共聊天、兴趣俱乐部、朋友聊天、个人中心、NFC 双手机确认、真实评价和暂缓接口。
- 将 `server.js` 改为可导出服务对象，后续拆模块时可以复用同一个入口。

## 当前模块边界

已接入：

- Auth：注册、登录、会话恢复、退出。
- Profile：个人中心与设置。
- Explore：地点、活动、路线、评分汇总。
- Place：地点详情、活动比赛、排行榜、奖牌凭证。
- Place Room：地点页公共聊天和分享。
- Interest/Club：兴趣检索、兴趣详情、俱乐部、排行榜。
- Social Chat：朋友、一对一聊天、动态。
- NFC Review：两台手机碰一碰 proof 与真实评价。
- Merchant Tap：商家碰一碰、消费与物品评价。

暂缓：

- AI 线下导游后端。
- 世界模块后端。
- 兴趣 AI 助手后端。

## 本地命令

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm start
```

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm run smoke
```

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
docker compose up --build
```

## 下一步

模块 1 Auth 已完成第一轮拆分。

后续模块按当前前端契约推进，优先顺序见 `docs/BACKEND_MODULE_ROADMAP.md`：

1. Explore。
2. Place。
3. Place Room。
4. Interest/Club。
5. Social Chat。
6. Profile。
7. NFC Proof 与 Review Rating。
