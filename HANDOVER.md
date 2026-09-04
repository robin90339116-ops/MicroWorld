# MicroWorld 项目交接文档

> 面向接手的 AI 编码代理 / 新开发者。
> 最后更新:2026-08-17 · 对应提交 `0c97100`

---

## 1. 一分钟速览

**MicroWorld(微世界)** 是一个 **HarmonyOS 原生社交 App + Node.js 后端**。

核心概念:用 **NFC「碰一碰」** 把线下「两人同时在场」变成不可伪造的数字凭证,再围绕这个凭证做可信社交、商家到店评价和数字藏品激励。

| | |
|---|---|
| 前端 | HarmonyOS ArkUI(ArkTS),单文件 `entry/src/main/ets/pages/Index.ets` 约 4600 行,40+ 页面 |
| 后端 | Node.js **原生 http 模块,零 Web 框架**,11 个业务模块 + 64 个 REST 端点 |
| 唯一外部依赖 | `pg`(仅在启用数据库模式时才加载) |
| 测试 | `backend/tests/smoke.js`,75 个端到端请求 |
| 仓库 | https://github.com/robin90339116-ops/MicroWorld (private) |

---

## 2. 怎么跑起来

### 后端(必须先起,前端依赖它)

```bash
cd backend
npm install          # 只装 pg
SMALLWORLD_BACKEND_HOST=0.0.0.0 npm start   # 监听 8787
```

健康检查:`curl http://127.0.0.1:8787/health`

**必须用 `HOST=0.0.0.0`**,否则真机连不上(只绑 127.0.0.1 时手机访问不到)。

### 跑测试(改后端后必做)

```bash
cd backend && npm run smoke
```

75 个请求全过才算通过。**这是后端唯一的回归防线,改动后一定要跑。**

### 前端

用 **DevEco Studio** 打开项目根目录构建。⚠️ 见第 5 节「做不了的事」。

前端连后端的地址在 `entry/src/main/ets/pages/Index.ets` 顶部:

```ts
const API_BASE_CANDIDATES: string[] = [
  'http://192.168.1.213:8787',  // ← 开发机局域网 IP,换网络要改
  'http://127.0.0.1:8787',
  ...
];
```

---

## 3. 架构地图

```
MicroWorld/
├── entry/src/main/ets/pages/Index.ets   ← 前端几乎全部逻辑在这一个文件
├── entry/src/main/ets/utils/
│   ├── NfcPeerManager.ets               ← 官方 NFC 封装(HCE + ISO-DEP)
│   └── AMapManager.ets                  ← 高德地图封装(未启用,历史遗留)
├── entry/src/main/module.json5          ← 权限 + Map Kit 的 client_id
├── AppScope/app.json5                   ← 包名 com.microworld.app
├── backend/
│   ├── server.js                        ← 入口 + 路由分发 + 世界模块(内联)
│   ├── src/modules/<11 个业务模块>/      ← 每个含 .routes.js + .service.js
│   ├── src/shared/store.js              ← 可插拔持久层(file / Postgres)
│   ├── src/shared/chainAnchor.js        ← 可插拔上链层(certificate / huawei-bcs)
│   ├── chaincode/microworld-collectible/← Fabric 链码(未部署)
│   └── tests/smoke.js                   ← 端到端冒烟测试
├── exports/design/*.dc.html             ← 设计流程图与原型(实现的验收基准)
└── docs/                                ← 部署 / NFC / 上链三份方案文档
```

### 两个关键抽象(改动时别破坏)

**`store.js` — 持久层**
业务模块调用同步的 `readData()` / `writeData()`。底层有两个驱动:
- `file`(默认):JSON 文件
- `postgres`:设置 `SMALLWORLD_DATABASE_URL` 后自动切换(华为云 GaussDB / RDS)

**业务代码永远不要直接碰 fs 或 pg**,只用 store 暴露的接口。

**`chainAnchor.js` — 数字藏品上链层**
- `certificate`(默认):后端自签凭证,零成本零依赖
- `huawei-bcs`:走联盟链铸造(链码已写好,**未部署**)

同样,业务代码只调 `stampNewCollectible()`,不关心底层。

---

## 4. 当前状态:能用 / 不能用

### ✅ 已完成并验证

- 注册登录(PBKDF2 加盐哈希 + timingSafeEqual 防时序攻击 + Bearer Token)
- 探索 / 兴趣 / 世界 / 聊天 / 我 五大 Tab 及 40+ 页面
- **商家碰一碰全链路**:碰门贴 → 打卡/支付 → 评价地点/商品 → 纪念徽章 + 积分(端到端实弹验证过)
- **个人碰一碰奖励**:好感度 +6 / 积分 +6 / 第 N 次碰面 / 3D 徽章幸运掉落(实弹验证过)
- 反作弊:一次性令牌、会话 2 分钟过期、双设备 ID 必须相异、同设备自碰拦截
- 冒烟测试 75 个请求全过

### ⚠️ 代码写好但**未验证**

| 功能 | 状态 |
|---|---|
| **NFC 真机碰一碰** | 代码完整(HCE + ISO-DEP),**从未在两台真机上跑通过**。模拟器无法测 NFC |
| **华为地图 Map Kit** | 已接入,**底图至今不显示**。标记点能显示 → 说明初始化成功,是**瓦片授权**问题。详见第 6 节 |
| **华为云部署** | 方案与 Docker 配置齐备,**实际仍跑在本地** |
| **联盟链上链** | 链码写好,**零链上交易**,运行在 certificate 模式 |

### ❌ 已知缺口

**后端自身缺的:**
1. **积分/好感度/徽章「只写不读」** ← 最该先补。`userPoints`、`affinity`、`friendMedals`、`merchantMedals` 只在发放时写入,**没有任何 GET 端点能查回来**,导致「我」页显示不了真实积分,奖励闭环是断的。
2. **NFC 双向确认是假的**。设计要求双方都确认才建立连接,后端目前是单向(reader 确认即出证明)。前端做了「等待对方确认」的观感。
3. `worlds` 模块内联在 `server.js`(约 200 行),没像其他 11 个模块那样拆到 `src/modules/`。不影响功能。

**前后端接入缺口(大头):**
后端 **64 个端点,前端只接了 21 个**。以下后端已完整实现但前端仍用写死假数据:
- 整个 **safety 模块**(举报/拉黑/紧急求助/隐私/审计,8 端点)——前端连页面都没有
- 好友与连接请求、俱乐部详情+排行榜、兴趣详情
- **地标奖牌领取 + 藏品查询** ← 上链架构做好了,前端却没有领取入口
- 碰一碰互评与碰触记录、动态发布、我的设置与 8 个二级页数据

---

## 5. ⚠️ 你(AI 代理)做不了的事

**这些必须由人类操作,不要尝试绕过或假装完成:**

1. **无法编译 / 运行 HarmonyOS**。没有鸿蒙 SDK,前端改动**只能做代码级检查**,必须由人在 DevEco Studio 里 build 验证。
2. **无法测 NFC**。模拟器不支持,需要两台鸿蒙真机。
3. **无法配置华为云 / AGC**。开通服务、生成签名证书、下载 `agconnect-services.json` 都需要人类账号操作。
4. **不要接触密钥**。`agconnect-services.json` 含 `client_secret` 和 `api_key`,已在 `.gitignore` 中,**本地存在但不入库**。`build-profile.json5` 含签名密码(历史遗留,已在库中)。

### 前端改动后唯一可做的自检

没有编译器,至少验证括号平衡:

```bash
node -e '
const s=require("fs").readFileSync("entry/src/main/ets/pages/Index.ets","utf8");
const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;
const po=(s.match(/\(/g)||[]).length,pc=(s.match(/\)/g)||[]).length;
console.log("{ }:",o,c,o===c?"OK":"MISMATCH");
console.log("( ):",po,pc,po===pc?"OK":"MISMATCH");
'
```

---

## 6. 踩过的坑(重要,别重复踩)

### ArkUI 布局陷阱

**① `Scroll` 的 `align` 默认是 `Alignment.Center`**
内容不足一屏时**整页内容会垂直居中悬浮**,看起来像布局错乱。全项目 30 个纵向 Scroll 都已加 `.align(Alignment.Top)` 修复。**新增 Scroll 时务必加上。**

**② `Column` 的 `alignItems` 默认是 `HorizontalAlign.Center`**
导致标题、卡片被水平居中。需要左对齐时显式写 `.alignItems(HorizontalAlign.Start)`。

**③ 容器缺 `.width('100%')` 会宽度塌陷**
塌陷后又被父级居中,表现为「整体向右偏」。曾在聊天详情页出现过。

**④ 毛玻璃 `backgroundBlurStyle` 的两个前提**
- **背后必须有内容**才能模糊。底栏若是独立一行(下方无内容),真机上就是一块实心板。当前实现是把底栏叠在内容之上。
- **不要同时设 `backgroundColor` 纯色**,会盖住模糊材质。
- **模拟器不渲染模糊**,只有真机能看到。

### 后端 / 构建陷阱

**⑤ 数据文件为空或损坏会导致全部接口 500**
原实现只在文件不存在时 seed。已修复为「内容为空或 JSON 解析失败也重建」。

**⑥ Dockerfile 曾漏拷 `src/` 目录**,镜像启动即崩。已修。

### HarmonyOS 工程陷阱

**⑦ 改包名会连锁破坏签名**
`AppScope/app.json5` 的 `bundleName` 必须与 AGC 注册的包名一致(当前 `com.microworld.app`)。改包名后**必须在 DevEco 重新生成签名**,否则报:
`The bundleName in app.json5 does not match the bundleName in the generated SigningConfigs`

改包名时还要同步这两处:
- `entry/src/main/resources/base/profile/nfc_card_emulation.json`(HCE 服务名)
- `Index.ets` 里 `NfcPeerManager` 的 `bundleName`

**⑧ Map Kit 底图不显示的排查结论**
标记点能画出来 → 说明 `MapComponent` 初始化成功、controller 拿到了。**只有底图瓦片没加载**,指向**授权**而非代码问题。

已确认无误的配置:
- `module.json5` 模块级 metadata `client_id` = `2017717227310064640`(与 `agconnect-services.json` 的 `client.client_id` 一致,注意**不是** `oauth_client.client_id`)
- `agconnect-services.json` 已放在 `entry/src/main/resources/rawfile/`

**尚未完成的一步**:AGC 里刚开启地图服务,但**签名 profile 生成于开启之前**(证书时间 8/16 15:29),profile 内嵌的授权清单里没有地图。**必须重新生成签名**才能生效。用户尝试过取消/重勾「自动生成签名」,但勾会自动弹回 → 自动签名失败,可能原因:真机未连接(自动签名需注册设备 UDID)、调试证书配额满、账号登录态过期。

---

## 7. 待办事项(按建议优先级)

### P0 — 补上断掉的闭环
1. **加积分/好感度/徽章的查询端点**,并接进「我」页。现在用户碰一碰拿了奖励**看不到**,这是最明显的功能断裂。
2. **加地标奖牌领取入口**。后端 `/api/places/:id/medals/:id/claim` 和 `/api/collectibles/:id` 都好了,数字藏品架构也搭好了,但前端没有任何入口。

### P1 — 让假数据变真
3. 碰一碰记录页接 `/api/nfc/proofs`
4. 好友页与连接请求接 `/api/friends`、`/api/connections/:id/accept|decline`
5. 排行榜接 `/api/clubs/:id/leaderboard`
6. 动态页接 `/api/social/moments`

### P2 — 结构与功能完善
7. NFC 改成真双向确认(需要后端加双方确认状态机)
8. `worlds` 模块从 `server.js` 拆到 `src/modules/`
9. safety 模块 8 个端点对应的前端页面(原型期可延后)

### 阻塞中(等人类完成外部配置)
- Map Kit 底图 ← 等重新生成签名
- 真机 NFC 联调 ← 等两台鸿蒙真机
- 华为云部署 ← 等开通 RDS/ECS

---

## 8. 代码约定

- **前端**:所有页面都是 `Index.ets` 里的 `@Builder` 方法,通过 `this.page` 字符串状态切换。新增页面 = 加一个 `@Builder` + 在 `build()` 的 if/else 链里加分支。
- **后端**:每个模块 `xxx.routes.js`(路由匹配 + 鉴权)+ `xxx.service.js`(纯业务逻辑,返回 `{status, body}`)。service 层不碰 req/res。
- **改后端必跑** `npm run smoke`。
- **设计基准**:`exports/design/SmallWorld 流程图.dc.html` 是页面与流转的权威依据,实现有疑问时以它为准。

---

## 9. 一句话总结现状

**核心业务闭环(碰一碰 → 到场证明 → 评价 → 奖励)已跑通并有测试保障;主要工作量在「把后端已有的 43 个端点接进前端」,以及等人类完成华为云/签名/真机这三项外部配置。**
