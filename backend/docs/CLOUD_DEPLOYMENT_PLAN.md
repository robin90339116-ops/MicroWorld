# SmallWorld 后端上云计划：腾讯云 + 华为云混合

## 推荐分工

核心业务后端建议先放在腾讯云，HarmonyOS 生态能力放在华为云。

腾讯云负责：

- Node.js API 服务：CloudBase Run 或 CVM。
- 数据库：TencentDB for PostgreSQL，第二选择 MySQL。
- 缓存：TencentDB for Redis。
- 文件与图片：COS。
- 日志：CLS。
- HTTPS 入口：CloudBase Run 自带域名/自定义域名，或 CVM + Nginx + 证书。

华为云 / 华为生态负责：

- AppGallery Connect 应用项目配置。
- 崩溃、性能、运营分析。
- 推送通知。
- FunctionGraph 承接少量 HarmonyOS 生态事件或异步任务。

原则：核心业务数据先只放一个主云。SmallWorld 这种社交产品如果一开始双云同时写数据库，会很快遇到用户、聊天、评价、NFC proof 的一致性问题。

## 第一阶段：JSON 单机部署

适合演示和早期真机测试。

部署方式：

- 首选：腾讯云 CloudBase Run，直接部署 Docker 容器。
- 备选：腾讯云 CVM，安装 Node.js 后用 `npm start` 或 Docker Compose。

需要配置：

- `SMALLWORLD_BACKEND_HOST=0.0.0.0`
- `SMALLWORLD_BACKEND_PORT=8787`
- `SMALLWORLD_DATA_FILE=/data/smallworld-data.json`
- `SMALLWORLD_CORS_ORIGIN=*`，生产环境改成明确来源。

官方文档入口：

- 腾讯云 CloudBase Run Node.js 容器化部署：https://cloud.tencent.com/document/product/1243/49237
- 腾讯云 CVM 手动搭建 Node.js 环境：https://cloud.tencent.com/document/product/213/38237

## 第二阶段：数据库化

把 `backend/data.json` 迁移到 PostgreSQL。

建议表：

- `users`
- `auth_sessions`
- `places`
- `place_activities`
- `place_room_sessions`
- `place_posts`
- `friends`
- `chats`
- `chat_messages`
- `moments`
- `nfc_sessions`
- `touch_proofs`
- `reviews`
- `place_medals`
- `user_medals`
- `merchant_taps`
- `merchant_orders`
- `item_reviews`

这一步完成后，后端才能可靠支持多人同时使用和云端扩容。

## 第三阶段：生产化

补齐：

- Redis：登录限流、地点房间在线状态、短期 NFC token。
- COS：用户头像、地点图片、奖牌图片、未来世界模块资源。
- CLS：接口日志、错误日志、NFC proof 审计日志。
- 数据备份：PostgreSQL 自动备份 + COS 归档。
- API 网关或 Nginx：HTTPS、域名、限流。

## 华为云侧

官方文档入口：

- 华为云 FunctionGraph Node.js 函数开发：https://support.huaweicloud.com/intl/en-us/devg-functiongraph/functiongraph_02_0410.html
- 华为云 FunctionGraph 支持 Node.js 运行时：https://support.huaweicloud.com/usermanual-functiongraph/functiongraph_01_0151.html
- AppGallery Connect：https://developer.huawei.com/consumer/cn/service/josp/agc/index.html

华为云侧不建议一开始承载核心 SmallWorld 业务数据库。它更适合作为 HarmonyOS 发布、质量、推送与生态能力入口。
