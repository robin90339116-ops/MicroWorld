# SmallWorld 后端模块 1：Auth 登录注册与会话

## 本轮完成

Auth 已从 `server.js` 拆到：

```text
backend/src/modules/auth/auth.service.js
backend/src/shared/id.js
backend/src/shared/security.js
```

保持兼容的接口：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/profile`
- `POST /api/auth/logout`

## 行为规则

- 邮箱统一转小写并去掉首尾空格。
- 密码长度限制为 8-72 位。
- 密码使用 `PBKDF2-SHA256`，每个账号独立 16 字节 salt。
- 服务端只保存 token 的 SHA-256 摘要，不保存明文 token。
- 同一账号在同一 `deviceId` 登录时，会替换旧会话。
- 会话默认 30 天过期。
- 登录接口按来源 IP 做 1 分钟 10 次限流。
- 个人身份必须包含至少一个兴趣和一个社交意图。

## 当前数据结构

JSON 模式下仍写入：

- `accounts`
- `authSessions`
- `users`

`users` 当前保存线下评分模型需要的基础指标，例如到场次数、复参地点、社交图谱自然度和评价稳定性。

## 迁移到云数据库

腾讯云阶段建议使用 TencentDB for PostgreSQL。Auth 对应建表脚本见：

```text
backend/docs/sql/auth.sql
```

迁移时不要把 `authSessions.tokenHash` 改回明文 token；前端只持有 token，后端只比对 hash。

## 下一步

模块 2 建议做 Profile：

- 把个人中心、隐私设置、兴趣标签、线下足迹从 `server.js` 拆出去。
- 明确 `profile_settings`、`user_metrics`、`user_badges` 表。
- 保持“隐身模式 / 今天不想被发现 / 安全按钮”接口可接入前端。
