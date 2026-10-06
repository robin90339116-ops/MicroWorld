# MicroWorld 项目交接文档

> 面向接手的 AI 编码代理 / 新开发者。
> 最后更新:2026-10-06 · 对应提交:见 `git log -1`(本次:功能闭环与前端接入补齐)

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

### ✅ 本轮已补齐(2026-10-06)

- **积分 / 好感度 / 徽章可读回**:`GET /api/me/rewards`(含碰面 / 商家 / 地标三类徽章与好感度列表);`/api/me/profile` 的 `display.score`、`stats.points/medalCount`、`rewards` 均来自真实发放数据。前端「我」页显示真实积分,新增「我的藏品与积分」页(含 `/api/collectibles/:tokenId` 凭证详情)。
- **地标奖牌领取入口**:地点页按进度展示奖牌,达标可一键领取(领取前自动打开该地标房间获取令牌)。修复了 `requestAt` 仅对含 `/room/` 的路径附带房间令牌、导致领取必 403 的 bug。
- **安全中心页**(`/api/safety/*` 全部 7 个端点):隐私三开关、举报 / 拉黑 / 解除、安全按钮 / 标记解决、审计记录。设置页已加入口。
- **连接请求**:朋友页展示待处理请求;「暂不」走 `/connections/:id/decline`;「接受」按后端规则必须经双方碰一碰,按钮直接跳转碰一碰。
- 排行榜 / 俱乐部详情接 `/api/clubs/:id(/leaderboard)`;碰一碰互评接 `/api/reviews/nfc`(确认后出现互评卡);动态发布接 `POST /api/social/moments`;地点广场「分享」接 `/room/shares`,离开时调用 `/room/close`;「我」的奖杯 / 俱乐部 / 日程 / 兴趣数据四个二级页接 `/api/me/:page`。
- 前端调用路径 23 → 32;冒烟测试新增「奖励读回与展示一致」及「奖牌领取闭环(含无令牌 403 契约)」断言。

### 仍未接入(均为有意为之或非功能性)

- `/api/friends*`:与 `/api/social/home` 返回同一份好友 / 聊天数据,前端已通过后者消费。
- `/api/interest-ai`:后端**有意**返回 501(冒烟测试断言此行为),前端兴趣 AI 页为本地规则助手。
- `/api/system/*`:诊断用途。
- `worlds` 模块仍内联在 `server.js`(约 200 行),功能完整,仅架构不一致。

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

**⑥b 房间令牌只对部分路径发送**
`requestAt` 原先只在路径含 `/room/` 时附带 `X-Place-Room-Token`;地标奖牌领取路径是 `/medals/:id/claim`,令牌漏发 → 后端 `PLACE_ROOM_REQUIRED` 403。已改为 `/room/` 或 `/medals/` 都附带;新增需要房间令牌的接口时记得同步这个条件。

**⑥c 「接受连接请求」后端故意返回 409**
`/api/connections/:id/accept` 固定返回 `NFC_CONFIRMATION_REQUIRED`——建立连接必须经双方碰一碰,这是产品规则不是 bug;前端只提供「暂不」与「去碰一碰」。

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

### 已完成(2026-10-06)
P0 / P1 全部完成;原 P2 中「NFC 真双向确认」已由后端实现(`124317a`),安全中心页已做。详见 §4。

### P2 — 结构与打磨
1. `worlds` 模块从 `server.js` 拆到 `src/modules/`(纯重构)
2. 碰一碰互评目前提交固定五维分数,可做成可调评分 UI
3. 安全中心「举报 / 拉黑」对象固定为当前聊天对象,可扩展为任意用户
4. 前端逻辑测试(`entry/tests/*.cjs`)未进 CI(需 HarmonyOS SDK 自带的 TypeScript 路径)

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

**核心业务闭环(碰一碰 → 到场证明 → 评价 → 奖励 → 读回展示)已完整打通并有测试保障;后端可用端点已基本全部接入前端(未接者均为有意为之);剩余阻塞项全部是需要人类完成的外部配置(地图签名 / 真机 NFC / 华为云)与一次尚未执行的用户访谈。**
