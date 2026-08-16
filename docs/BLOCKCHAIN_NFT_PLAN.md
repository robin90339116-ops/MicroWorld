# 数字藏品上链方案(华为云 BCS 联盟链)

当前阶段:**先做好架构,暂不接真链**。默认仍是后端自签「数字藏品凭证」,行为不变;等你开通华为云 BCS、拿到端点与身份证书,改一个开关即可切换到真·链上铸造。

## 关键概念(先说清楚)

- 华为云的「NFT」= **BCS 联盟链(Hyperledger Fabric)上的数字藏品**,不是以太坊公链 ERC-721。
- 写的是 **Fabric 链码(chaincode)**,不是 Solidity 合约;无 gas、无公链钱包;符合中国数字藏品「联盟链、禁二级炒作」的合规取向。
- 适合「证明线下真实相遇」的可验证凭证,不追求公开可交易。

## 已完成(代码侧,本轮)

| 文件 | 作用 |
| --- | --- |
| `backend/src/shared/chainAnchor.js` | 可插拔上链锚定层:`certificate`(默认)+ `huawei-bcs` 两个驱动 |
| `backend/src/modules/place/place.service.js` | 藏品/奖牌发行接入锚定层(不再写死 chainStatus) |
| `backend/chaincode/microworld-collectible/` | 华为云 BCS 用的 Fabric 链码:`MintCollectible` / `QueryCollectible` / `ListByOwner` |
| `backend/.env.example` | 新增链相关配置项 |

设计与「可插拔数据库层」同一套思路:业务代码只对接一个抽象,切换驱动零改动。

- **certificate 模式(默认)**:`chainStatus=digital-certificate`,tokenId 由后端发,metadata 由后端托管。与现状、smoke 完全一致。
- **huawei-bcs 模式**:发行时先标 `pending-mint`,再由 `chainAnchor.mint()` 调用链码 `MintCollectible` 铸造上链,回写 `chainStatus=on-chain` + 交易哈希。

已验证:certificate 默认无回归(smoke 全过);huawei-bcs 未配端点时优雅降级为 certificate,配了端点则正确进入待上链状态。

## 切换到真链需要做的(等你开通 BCS 后)

**你(账号/控制台/密钥,我做不了):**
1. 华为云开通 **BCS**,创建**联盟链**实例与通道(channel)。
2. 部署链码 `backend/chaincode/microworld-collectible` 到该通道(BCS 控制台支持链码安装/实例化)。
3. 准备链码调用入口:BCS 的 REST 网关地址,或 Fabric SDK 连接配置 + 身份证书。
4. 把端点/密钥配到后端环境变量(**私钥/证书只你自己录入,别发我**)。

**配置(服务器环境变量):**
```bash
SMALLWORLD_CHAIN_PROVIDER=huawei-bcs
SMALLWORLD_CHAIN_ENDPOINT=https://<你的BCS链码调用网关>/invoke
SMALLWORLD_CHAIN_CHANNEL=microworld-channel
SMALLWORLD_CHAIN_CODE=microworld-collectible
SMALLWORLD_CHAIN_NAME=huawei-bcs
SMALLWORLD_CHAIN_API_KEY=<如网关需要鉴权>
```

**可能需要我再补的一小步(接真链时):**
- `chainAnchor.js` 里的 `invokeChaincode()` 按「REST 网关 POST {channel,chaincode,function,args}」实现。若你的 BCS 用 Fabric SDK 而非 REST 网关,或字段格式不同,替换这一个方法即可(上层不动)。
- 真链模式建议把 `mint()` 接到发行流程做**异步铸造**(领取即时返回 `pending-mint`,铸造完成再翻成 `on-chain`),避免链上确认拖慢接口。这一步等你端点就绪后我再接,能连真网关联调。

## 碰一碰 → 藏品的关系

碰一碰(NFC)负责产出「真实相遇证明 proof」;藏品/奖牌发行是独立一步,现已统一走锚定层。要做「碰一碰当场掉落相遇藏品」,只需在 NFC 确认成功后调用发行 → 锚定层铸造,是个小增量,等方向和链就绪后接上即可。

## 一句话现状

碰一碰能用了;藏品发行架构已经「链就绪」,但**现在不产生任何链上交易、零成本**;开通 BCS + 配一个开关,即可让碰一碰藏品真正上链。
