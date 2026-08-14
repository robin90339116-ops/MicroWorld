# MicroWorld HarmonyOS App Prototype

“MicroWorld”是一个聚焦线下社交的 HarmonyOS App 原型：用户在真实地点到场、完成 AR 互动或共同任务后，才能建立更深层关系。

## 当前已完成

- HarmonyOS ArkUI 工程骨架
- 欢迎页、创建身份页
- 探索首页、地点详情页
- 兴趣检索、兴趣详情、学习路径、俱乐部与关联地标
- 世界页内的实景 AR、现场成员、3D 私有世界与创建工具
- 聊天页（对话 / 朋友通讯录 / 动态信息流三个子页）、聊天详情页、聊天设置页
- 个人信息详情页（好友完整版 / 非好友只读版）
- 我页面（头像 + 8 个入口）及 8 个二级页面：比赛奖杯、个人动态、个人虚拟世界、已加入俱乐部、比赛日程、兴趣数据、碰一碰信息、设置
- 俱乐部详情页、俱乐部排行榜页、兴趣 AI 助手
- AR 实景导航页（2D / AR 切换）、共享世界页（可见范围 + 链接 / 二维码 / 发给好友）
- 双手机 NFC HCE / ISO-DEP 真实碰触评价 MVP
- NFC 碰一碰扩展：好友碰面免确认结果页（NFT 掉落 + 好感度）、商家碰一碰流程（碰门贴 → 打卡 / 支付 → 评价地点 / 评价消费物品 → 纪念徽章）
- 静态移动端预览：`prototype/index.html`
- 页面导航规格：`docs/NAVIGATION_FLOW_SPEC.md`（自 Claude Design 流程图导入，设计源文件在 `exports/design/`）

## 已加入开发计划

- AI 线下导游：兴趣路线、到场讲解、低压力破冰、实景节点提示和足迹总结
- AI 导游作为探索、地点详情和世界实景模式的跨页面能力，不新增普通聊天式底部 Tab
- 详细计划见 `docs/AI_OFFLINE_GUIDE_PLAN.md`

## 产品原则

- 先到场，再互动
- 先共同经历，再建立关系
- 先双向确认，再聊天
- 以兴趣地点、活动、AR 任务、小世界内容自然破冰
- 评价系统围绕线下社交质量，而不是普通点评

## 在 DevEco Studio 中继续开发

1. 用 DevEco Studio 打开本目录。
2. 如 SDK 或 hvigor 版本不同，让 DevEco Studio 按提示同步或升级工程配置。
3. 主页面源码在 `entry/src/main/ets/pages/Index.ets`。
4. 资源与页面注册在 `entry/src/main/resources/base/` 和 `entry/src/main/module.json5`。

## 快速预览

不用鸿蒙环境时，可以直接在浏览器打开：

`prototype/index.html`

这个预览用于确认信息架构、页面节奏和核心交互，后续再把样式和组件继续迁到 ArkUI。
