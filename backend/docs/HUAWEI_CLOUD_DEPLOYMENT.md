> 当前状态：已通过 GitHub Actions 中真实 PostgreSQL 16 的隔离验收，尚未连接华为云。以下云部署步骤需实际验证；openGauss 不作为已验证兼容目标。验收证据、TLS 与测试入口以 STORAGE_RELIABILITY.md 为准。

# MicroWorld 华为云部署指引(登录注册 + 数据存储)

本文档说明如何把 MicroWorld 后端(现有 Node 服务)部署到**华为云**,并用**华为云数据库**承载登录注册与全部业务数据。

采用的是「方案 A」:复用现有后端代码与登录注册逻辑,计划把持久化从本地 JSON 文件切换到华为云 RDS for PostgreSQL。部署并验收成功后，前端将 API 地址指向云端。

---

## 0. 架构

```
鸿蒙 App(原生 ArkUI, entry/src/main/ets/pages/Index.ets)
        │  HTTPS
        ▼
华为云 ECS / CCE 上的 Node 后端(本仓库 backend/)
        │  Postgres 协议(SSL)
        ▼
华为云 RDS for PostgreSQL（待实际部署验证）
        └─ 单表 microworld_state 存整份应用状态(含账号、登录态、地点、世界、聊天…)
```

- **登录注册**:仍由后端 `src/modules/auth` 处理(邮箱 + 密码 + 设备号),账号与登录态持久化到华为云数据库。
- **数据存储**:后端通过可插拔持久层 `src/shared/store.js` 写入数据库。未配置数据库时自动回退到本地 JSON 文件,不影响本地开发。

> 说明:如果你要的是「华为账号一键登录(Account Kit)」那种体验,那是另一条路线(需要前端集成华为账号 SDK),本方案未包含。本方案的「登录注册」是 App 自己的邮箱密码账号体系,数据存在华为云。

---

## 1. 分工(重要)

**我(Claude)已经完成的代码侧改动:**
- 可插拔持久层：原子文件保存或请求级 PostgreSQL 事务；HTTP 响应等待 COMMIT。真实云端和 openGauss 兼容性须实测。
- `backend/server.js` 接入 store;启动时建表/装载,关闭时落库。
- `backend/Dockerfile` 修正(补上 `src/` 拷贝与依赖安装,原镜像会缺模块崩溃)。
- `backend/package.json` 增加 `pg` 依赖。
- `backend/.env.example` 增加数据库配置项。
- `backend/docker-compose.db.yml` 本地用 Postgres 验证数据库链路。

**需要你(账号持有者)在华为云控制台完成的**(这些涉及账号、实名、付费与密钥,我无法代做):
- 注册/实名华为云账号,完成结算配置。
- 开通并创建数据库实例,设置数据库密码。
- 开通计算资源(ECS 或 CCE)、镜像仓库 SWR。
- 在服务器上填入连接串等**凭证**(密码类信息只应由你本人录入,不要发我)。

---

## 2. 先在本地验证数据库链路(强烈建议,免得上云才发现问题)

先用本地 PostgreSQL 验证基础读写链路；这不能替代云端网络、证书和数据库版本验收：

```bash
cd backend
docker compose -f docker-compose.db.yml up --build
```

另开一个终端验证:

```bash
curl http://127.0.0.1:8787/health
# 期望看到  "dataMode":"postgres"
```

或者用现有全链路冒烟测试打数据库模式(需先 `npm install`):

```bash
cd backend
npm install
SMALLWORLD_DATABASE_URL="postgres://microworld:microworld@127.0.0.1:5433/microworld" \
SMALLWORLD_DATABASE_SSL=disable \
npm run smoke:db
# 期望结尾:SmallWorld backend smoke test passed.
```

本地通过后，云端仍需单独验收网络、TLS、权限、备份恢复和实际数据库版本，不能只换连接串就视为上线完成。

---

## 3. 开通华为云数据库

当前目标与待评估选项：

- **RDS for PostgreSQL**(最省心,标准 Postgres)。
- **GaussDB(openGauss)** 不属于当前已验证目标，需单独完成驱动、SQL 与事务兼容性测试后再考虑。

控制台步骤(以 RDS for PostgreSQL 为例):
1. 华为云控制台 → 搜索「RDS」→ 购买数据库实例 → 引擎选 **PostgreSQL**。
2. 选择与后端服务器**同一区域(Region)和 VPC**,内网互通、延迟低、更安全。
3. 设置管理员密码(**记牢,别发给任何人,包括我**)。
4. 实例创建后,进入实例 → 新建数据库,库名如 `microworld`。
5. 记录:**内网 IP / 域名、端口(默认 5432)、用户名、密码、库名**。
6. 安全组 / 白名单:放通后端服务器所在网段访问数据库端口;**不要**对公网 `0.0.0.0/0` 开放数据库端口。
7. TLS：检查实例实际配置。本驱动默认强制校验证书；若系统信任库无法验证实例证书，配置可信 CA 到 `SMALLWORLD_DATABASE_CA`，不可通过关闭校验绕过生产连接失败。

连接串格式:

```
postgres://用户名:密码@数据库内网地址:5432/microworld
```

---

## 4. 部署后端

### 方案 1:ECS + Docker(最简单,推荐先用这个)

1. 购买一台华为云 **ECS**(2 核 4G 起,Linux),与数据库同 VPC。
2. 安装 Docker。
3. 把 `backend/` 目录上传到服务器(git clone 或 scp)。
4. 构建并运行:

```bash
cd backend
docker build -t microworld-backend .
docker run -d --name microworld-backend \
  -p 8787:8787 \
  -e SMALLWORLD_BACKEND_HOST=0.0.0.0 \
  -e SMALLWORLD_BACKEND_PORT=8787 \
  -e SMALLWORLD_CORS_ORIGIN="https://你的前端来源" \
  -e SMALLWORLD_DATABASE_URL="postgres://用户名:密码@数据库内网地址:5432/microworld" \
  --restart unless-stopped \
  microworld-backend
```

5. 验证:`curl http://127.0.0.1:8787/health` → `"dataMode":"postgres"`。
6. 安全组:对外只放通 App 需要访问的端口(建议前面加一层带 HTTPS 的反向代理,见第 6 节),数据库端口绝不对公网开放。

### 方案 2:CCE(K8s,需要弹性/多副本时再用)

1. 把镜像推到华为云 **SWR**(容器镜像服务):

```bash
# 登录 SWR(指令在 SWR 控制台「登录指令」里获取)
docker tag microworld-backend swr.<region>.myhuaweicloud.com/<组织>/microworld-backend:latest
docker push swr.<region>.myhuaweicloud.com/<组织>/microworld-backend:latest
```

2. 在 CCE 集群创建 Deployment + Service,环境变量同上,`SMALLWORLD_DATABASE_URL` 建议用 K8s Secret 注入。
3. 用 ELB 对外暴露并挂 HTTPS 证书。

> 多副本时请注意:当前持久层把整份状态作为单文档读改写,适合单副本或低并发原型。若要真正多副本高并发,需要把状态拆成规范化表(可作为下一阶段)。

---

## 5. 登录注册怎么走

无需额外改动。App 里已有的注册/登录页会调用后端:

- `POST /api/auth/register` → 创建账号,写入华为云数据库。
- `POST /api/auth/login` → 校验密码,签发登录态 token(存库)。
- `POST /api/auth/profile` → 保存线下社交身份(兴趣、社交意图)。

所有账号数据都落在华为云数据库的 `microworld_state` 表里。

---

## 6. 让前端指向云端 + HTTPS / CORS

1. **前端 API 地址**:编辑 `entry/src/main/ets/pages/Index.ets` 顶部的 `API_BASE_CANDIDATES`,加入你的云端地址(放在最前面优先尝试):

```ts
const API_BASE_CANDIDATES: string[] = [
  'https://api.你的域名.com',   // 华为云后端(生产)
  'http://127.0.0.1:8787',
  'http://10.0.2.2:8787'
];
```

2. **HTTPS**:鸿蒙应用默认不允许明文 HTTP 访问公网。生产务必给后端配 HTTPS。做法:
   - 用华为云 **ELB / DNS + 证书**,或在 ECS 上用 Nginx/Caddy 做反代并申请证书(华为云 SCM 可申请免费证书)。
   - 反代把 `https://api.你的域名.com` 转发到容器的 `8787`。
3. **CORS**:把 `SMALLWORLD_CORS_ORIGIN` 设为你的前端来源,别在生产用 `*`。

---

## 7. 环境变量速查

| 变量 | 说明 |
| --- | --- |
| `SMALLWORLD_DATABASE_URL` | 设置后切换到华为云数据库;格式 `postgres://user:pass@host:5432/db` |
| `SMALLWORLD_DATABASE_TABLE` | 状态表名,默认 `microworld_state`,自动建表 |
| `SMALLWORLD_DATABASE_SSL` | 留空或 `verify-full`=加密并校验证书；`disable`=关 TLS（仅本地测试） |
| `SMALLWORLD_DATABASE_CA` | 生产可放 CA 证书内容以开启完整校验 |
| `SMALLWORLD_DATABASE_POOL` | 连接池大小,默认 4 |
| `SMALLWORLD_CORS_ORIGIN` | 生产设为前端来源,别用 `*` |
| `SMALLWORLD_BACKEND_PORT` / `_HOST` | 监听端口/地址 |

---

## 8. 安全提醒

- 数据库密码、CA、token 只在服务器环境变量里配置,**不要提交进 git、不要发给我**。
- 数据库端口只在内网 / 安全组白名单内开放,不要暴露公网。
- 生产用 HTTPS + 明确的 CORS 来源。
- 上线前跑一遍第 2 节的数据库模式冒烟测试。
