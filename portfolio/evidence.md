# 成果证据与实现状态

[返回展示首页](README.md) · 核对日期：2026-09-10 · 基线：`3ca147f`

## 阅读规则

“代码已有”“自动验收通过”“真机验证”“正式上线”不是同义词。以下链接是核对入口；历史文档中的旧状态以较新的验收阶段和代码为准。没有提供真实用户留存、收入或转化成果。

## 产品与功能

| 能力 | 当前证据 | 未完成边界 |
|---|---|---|
| 页面结构与导航 | [历史设计规格](../docs/NAVIGATION_FLOW_SPEC.md)、[当前 Index.ets](../entry/src/main/ets/pages/Index.ets) | 历史规格不等于当前逐页真机效果；玻璃、位置、键盘等待验收 |
| 账号、聊天、兴趣与表单 | [第一阶段记录](../docs/IMPLEMENTATION_ACCEPTANCE.md)、[后端测试目录](../backend/tests/) | 自动回归不等于真实用户体验结果 |
| 个人碰一碰 | [协议实现](../entry/src/main/ets/utils/NfcPeerManager.ets)、[服务端规则](../backend/src/modules/nfc-proof/nfc-proof.service.js) | 双机待验收；当前首次与熟人都需双方确认；非硬件到场认证 |
| 商家到店与地点评价 | [商家服务](../backend/src/modules/merchant-tap/merchant-tap.service.js)、[终端服务](../backend/src/modules/merchant-tap/merchant-terminal.service.js) | 需运营登记及双机验证；不等于静态门贴方案或生产权益上线 |
| 支付与商品评价 | 商家服务端明确拒绝未配置支付与未核验商品评价 | 真实渠道、验签、查单、退款未接入 |
| 纪念凭证 | [chainAnchor.js](../backend/src/shared/chainAnchor.js) 默认 certificate | 无真实铸造成功证明，不称已上线 NFT |
| 地图与定位 | Index.ets 有 MapKit 接入代码及演示坐标 | 真机出图、真实定位未完整验收 |
| AR / 智能导游 | 历史方案与部分入口 | 单独规划，不纳入当前已完成能力 |

## 可核对的工程验收

| 验收内容 | 已通过运行 | 能证明什么 |
|---|---|---|
| 数据库事务与完整接口 | [34188339789](https://github.com/robin90339116-ops/MicroWorld/actions/runs/34188339789) | 隔离 PostgreSQL 中多进程及业务回归，不是华为云上线 |
| 写入拒绝与连接恢复 | [34188694228](https://github.com/robin90339116-ops/MicroWorld/actions/runs/34188694228) | 测试事务失败、回滚及重新连接 |
| TLS 与地址身份校验 | [34198003574](https://github.com/robin90339116-ops/MicroWorld/actions/runs/34198003574) | 临时证书与真实加密连接，不是云端证书轮换验收 |
| 数据库整体崩溃恢复 | [34199436253](https://github.com/robin90339116-ops/MicroWorld/actions/runs/34199436253) | 保留测试卷的 SIGKILL 恢复，不是宿主机断电或跨区容灾 |
| 备份与新表恢复 | [34389954385](https://github.com/robin90339116-ops/MicroWorld/actions/runs/34389954385) | 隔离状态导出恢复，已有表不被覆盖；不是生产备份策略 |
| 镜像与跨容器登录保持 | [34390423015](https://github.com/robin90339116-ops/MicroWorld/actions/runs/34390423015) | 干净镜像、非管理员运行、测试卷保留；本轮 79 项后端测试通过 |

这些运行可能需要仓库访问权限。日志有保留期限；不要将失效链接视为虚假通过，也不要在没有记录时补填结果。完整阶段说明见 [IMPLEMENTATION_ACCEPTANCE.md](../docs/IMPLEMENTATION_ACCEPTANCE.md)。

## 尚未有证据支持的表述

- “不可伪造到场证明”“完全杜绝刷评”。
- “华为云已正式上线”“真实支付已打通”“NFT 已上链发行”。
- “全部页面真机验收通过”“毛玻璃效果已完全复现”。
- “留存提升”“用户规模”“付费转化”等没有真实采集来源的数字。

## 展示访问与发布

本次只新增 portfolio 文件，不改变仓库可见性、协作者权限或既有代码。若求职链接无法让外部招聘方访问，应由仓库所有者在检查完整历史、签名配置、凭据与个人数据后决定分享方式；不要直接将整个私有仓库改为公开来解决访问问题。

优先分享本目录的脱敏展示材料；真实备份、原始访谈、签名配置、商家登记和测试账号令牌不属于求职附件。
