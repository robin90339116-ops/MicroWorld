# SmallWorld 页面导航流程规格（自 Claude Design 流程图导入）

> 来源：Claude Design 项目「SmallWorld UI pages」中的 `SmallWorld 流程图.dc.html`
> （项目 ID `0a498e37-3d93-4fab-9665-a2f20daa4822`，2026-07-08 版，print 版内容一致）。
> 设计源文件归档于 `exports/design/`。
> 本文档是流程图的文字规格化版本，作为客户端实现基线。
> 标记说明：🆕 = 流程图标注「新增」；✏️ = 标注「已更新 / 改名」。

## 0. 全局规则

- 底部导航五个主 Tab：**探索 · 兴趣 · 世界 · 聊天 · 我**，仅在 5 个主 Tab 页面常驻。
- 详情 / 编辑 / 模态页隐藏底栏，靠返回回到来源页。

## 1. 入口 · ONBOARDING

| 屏 | 名称 | 关键内容 |
|---|---|---|
| welcome | 欢迎 / 启动页 | 到场 · 线下 × 实景 × 虚拟；开始探索；已有账号登录 |
| register | 注册页 | 昵称/邮箱/密码/确认密码；同意用户协议和隐私政策；创建账号 |
| identity | 创建身份页 | 选择兴趣；「你来到 SmallWorld 是为了」；保存并进入 |
| login | 登录页 | 邮箱/密码；创建新账号；登录 |

导航：welcome →(开始探索) register →(创建账号) identity →(保存) 探索首页；welcome →(已有账号登录) login →(登录) 探索首页。

## 2. 探索 · EXPLORE

| 屏 | 名称 | 关键内容 |
|---|---|---|
| explore | 探索首页 | 高德地图 + 地点标记；搜索地点/兴趣/活动；筛选（全部/咖啡/读书…）；3D/2D 切换 |
| exploreCard | 探索·地点卡片 | 点击地点标记弹出卡片：评分★4.8、高可信、简介、查看详情、导航 |
| place | 地点详情页 | 简介、五维分（舒适/安全…）、正在举办的活动、地点广场（公共聊天）入口 |
| placeActivity | 活动 / 比赛详情 | 时间地点、比赛/现场组队/名额、活动简介、规则、奖励 |
| placeChat | 地点公共聊天 | 仅保留最近 1 小时消息；不可加好友；可推荐活动卡片 |
| routePlan | 导航页 | 2D 导航 / AR 实景导航切换；距离/步行时间/低压力标签；开始导航；AI 导游 |
| routePlanAR 🆕 | AR 实景导航页 | 相机实景 + 方向指引（如「左转 80m」）；与 routePlan 相同的信息条与切换 |
| aiRoute | AI 导游 | 今日路线（多站点）、AI 理由（低压力优先） |

导航：explore →(点击地点标记) exploreCard →(点击卡片/查看详情) place；place →(点击活动) placeActivity；place →(点击地点广场) placeChat；place/exploreCard →(导航) routePlan →(点击「AR 实景导航」) routePlanAR；routePlan →(AI 导游按钮) aiRoute；aiRoute 现场碰面后 → NFC 碰一碰流程。

## 3. 兴趣 · INTEREST

| 屏 | 名称 | 关键内容 |
|---|---|---|
| interest | 兴趣首页 | 分类筛选（人文/艺术/运动/生活/户外）；搜索；兴趣卡（难度、周期、俱乐部数、地标数） |
| interestDetail | 兴趣详情页 | 难度/入门周期/社交方式；学习路径；相关俱乐部；关联地标；兴趣 AI 助手入口 |
| clubDetail | 俱乐部详情页 | 认证状态、评分、成员数、频次、复参率；俱乐部排行榜入口；活动；导航；地点广场；加入俱乐部 |
| leaderboard | 排行榜页 | 本月分类俱乐部榜（活跃值）；标出「我的」俱乐部；名次变化 |
| interestAI | 兴趣 AI 助手 | 专属兴趣问答：书单/找搭子/答疑；快捷提示词 |

导航：interest → interestDetail →(点击相关俱乐部) clubDetail →(点击排行榜) leaderboard；interestDetail →(点击兴趣 AI 助手) interestAI。
排行榜头像 →(非好友时) profileDetailReadOnly（见聊天区）。

## 4. 世界 · 实景现场 WORLD / SCENE

| 屏 | 名称 | 关键内容 |
|---|---|---|
| world·scene | 世界 · 实景现场 | 实景现场/虚拟世界子 Tab；相机预览 + AR 标记（隐藏书签、记忆墙）；今日任务；扫描/任务/附近的人 |
| cameraFull | 全屏 AR 相机页 | 全屏相机；已到达（GPS+QR）；AR 标记；今日任务；附近的人 |

导航：world·scene →(点击相机画面) cameraFull（×关闭返回）。现场任务/附近的人 →「建立连接」→ NFC 碰一碰流程。

## 5. 世界 · 虚拟世界 WORLD / SPACES

| 屏 | 名称 | 关键内容 |
|---|---|---|
| world·spaces | 世界 · 虚拟世界 | 我的世界/附近世界/共建中筛选；3D 世界卡（绑定地点、访问数）；＋ 创建 |
| createWorld | 创建小世界页 | 世界名称；绑定真实地点；主题；可见范围；生成小世界 |
| worldDetail | 世界详情页 | 绑定地点、到场后可见、ArkGraphics3D；访问/共建/物件统计；进入建设；共享 |
| worldEditor | 世界建设编辑页 | 选择/移动/旋转/缩放；AI 创造物件（文字生成 → 预览 → 放入世界）；保存 |
| shareWorld 🆕 | 共享世界页 | 谁可以看到（仅受邀朋友/附近所有人）；分享方式：复制链接 / 分享二维码 / 发给聊天好友；完成 |

导航：world·spaces →(＋) createWorld；world·spaces →(进入世界) worldDetail →(进入建设) worldEditor；worldDetail →(点击「共享」) shareWorld。

## 6. 聊天 · CHAT

| 屏 | 名称 | 关键内容 |
|---|---|---|
| chat | 聊天首页 · 对话 | 顶部子 Tab：**对话 / 朋友 / 动态**；只显示真实见过或共同互动的人；会话带「来源」（共同任务/活动）；待确认连接请求 |
| chatDetail | 聊天对话页 | 顶部「你们的共同来源」（地点+任务）；消息流；输入/发送；右上 ••• |
| chatSettings 🆕 | 聊天设置页 | 查找聊天记录；消息免打扰；置顶聊天；设为星标朋友；清空聊天记录；删除好友 |
| chatFriends | 聊天首页 · 朋友（通讯录） | 新的连接请求（含徽标数）；「真实见过 · N 人」列表（兴趣 + 相遇地点） |
| chatMoments | 聊天首页 · 动态（朋友圈式信息流） | 只看真实见过的人的动态；文字 + 地点 + 点赞/评论；＋ 发动态 |
| profileDetail 🆕 | 个人信息详情页 | 头像/昵称/简介；三个入口：比赛奖杯展示 / 个人动态 / 个人虚拟世界；发消息 |
| profileDetailReadOnly 🆕 | 个人信息详情页 · 只读 | 同上三个入口，但 🔒 非好友仅展示公开信息：**不可加好友、不可发消息**（排行榜头像等入口进入） |

导航：chat ↔ chatFriends ↔ chatMoments（同页子 Tab 切换）；chat →(点会话) chatDetail →(•••) chatSettings；chatDetail/chatFriends →(点头像) profileDetail；非好友入口（如排行榜头像）→ profileDetailReadOnly。

## 7. 我 · PROFILE ✏️

| 屏 | 名称 | 关键内容 |
|---|---|---|
| profile ✏️ | 我的页面（已更新） | 头像 + 昵称「城市书签」+ ✦ 328 积分；头像下方 **8 个入口按钮**（见下）；底栏「我」Tab |

8 个二级页面（全部 🆕，隐藏底栏、‹ 返回回我页）：

| 屏 | 名称 | 关键内容 |
|---|---|---|
| meTrophies | 比赛奖杯展示 | 🏆 城市探索赛 / 🥈 读书马拉松 / 🎖 碰一碰挑战 / 🏅 咖啡地图任务 |
| meMoments | 个人动态 | 我的动态列表（地点 + 时间 + 文字） |
| meWorld | 个人虚拟世界 | 「城市书签的书屋」；12 位朋友到访过；世界简介 |
| meClubs | 已加入的俱乐部 | 📖 城市读书会 48 位成员；☕ 手冲咖啡社 32 位成员 |
| meSchedule | 个人比赛日程 | 日期卡（7月12 城市探索赛复赛 · CBD 起点；7月20 读书马拉松 · State Library） |
| meInterestData | 兴趣记录数据 | 读书 24 次；咖啡 18 次 等次数统计 |
| meNfc | 碰一碰信息 | 开关：开启后靠近的朋友可直接交换名片；「碰一碰已开启」；累计交换次数 |
| meSettings | 设置 | 账号与安全 / 隐私设置 / 通知设置 / 退出登录 |

## 8. NFC 碰一碰 · TAP TO REVIEW

### 8.1 人对人（碰一碰 · 个人）

| 屏 | 名称 | 关键内容 |
|---|---|---|
| p2p-wait | ① 待碰触 | 两部手机背靠背；对方也要打开碰一碰；当前地点 GPS+QR 已验证 ✓ |
| p2p-sense | ② 感应到对方 | 「碰到了！」；对方卡片（兴趣、距 0.3m）；确认碰到本人 |
| p2p-confirm | ③ 双向确认见面 | 你们的共同来源（地点+共同任务）；你已确认 ✓，等待对方确认 |
| p2p-done | ④ 连接建立（首次见面） | 可信连接已建立；可信度 +1；进入聊天 / 开启比赛活动 / 返回首页 |
| p2p-friend 🆕 | 好友碰面结果（免确认） | 第 N 次真实碰面；**NFT 幸运掉落**（3D 纪念徽章 · 稀有度 R · 编号，未中奖仅记录）；好感度 +6；积分 +6；收下并进入聊天 |

导航：p2p-wait →(两机贴近) p2p-sense →(首次见面·需确认) p2p-confirm →(双方确认后) p2p-done；p2p-sense →(已是好友·免确认) p2p-friend。

### 8.2 人对商家（碰一碰 · 商家）

| 屏 | 名称 | 关键内容 |
|---|---|---|
| p2b-tap | ① 碰商家设备 | 碰商家 NFC 门贴或扫店内二维码；已认证商家 |
| p2b-redeem | ② 支付 / 打卡 | GPS 匹配 ✓ 到店确认；选择操作：到店打卡（城市足迹 +1）/ 支付；支付成功 → 去评价 |
| p2b-rate | ③ 评价地点 | 到店打卡后才可评价（更可信）；星级 + 标签（环境好/咖啡赞/适合独处）+ 文字；提交评价 |
| p2b-reward ✏️ | 商家碰一碰结果页（改名 · 新增 NFT） | 已评价；地点可信度已更新；**3D 商家纪念徽章**（稀有度 R · 编号）；积分 +5；进入活动 / 进入店铺 / 回到世界 |
| p2b-rate-item 🆕 | 评价消费物品 | 支付后才可评价；商品卡（燕麦拿铁 · 中杯 · ¥28）；星级 + 标签（口感好/分量足）+ 文字；提交评价 |

导航：p2b-tap →(碰到门贴) p2b-redeem；p2b-redeem →(到店打卡) p2b-rate →(提交评价) p2b-reward；p2b-redeem →(支付) p2b-rate-item →(提交评价) p2b-reward。

## 9. 实现清单（相对当前工程的增量）

1. 🆕 routePlanAR：AR 实景导航页（导航页加实景/2D 切换入口）。
2. 🆕 shareWorld：世界详情「共享」→ 共享世界页。
3. 聊天首页三子 Tab：对话 / 朋友(通讯录+连接请求) / 动态(信息流)。
4. 🆕 chatSettings：聊天对话页 ••• → 聊天设置。
5. 🆕 profileDetail / profileDetailReadOnly：个人信息详情页（好友完整版 / 非好友只读版）。
6. ✏️ profile：我的页面改为头像 + 8 入口按钮。
7. 🆕 8 个我·二级页面：meTrophies / meMoments / meWorld / meClubs / meSchedule / meInterestData / meNfc / meSettings。
8. 🆕 p2p-friend：好友碰面免确认结果页（NFT 掉落 + 好感度）。
9. ✏️ p2b-reward：商家结果页改名 + NFT 徽章展示。
10. 🆕 p2b-rate-item：评价消费物品页（支付分支）。
