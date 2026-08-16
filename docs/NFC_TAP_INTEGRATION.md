# 碰一碰(华为官方 NFC)接入说明

本轮把碰一碰接到了**华为官方 NFC 接口**,并打通了「前端 UI → 官方 NFC(HCE / ISO-DEP)→ 后端 NFC 证明」全链路。因当前无鸿蒙真机,代码已就绪、可日后上真机测试(NFC 无法在模拟器验证)。

## 用到的官方能力

- `@ohos.nfc.cardEmulation`(HCE / 主机卡模拟)—— 被碰方广播令牌。
- `@ohos.nfc.tag`(ISO-DEP / APDU)—— 主动碰方读取令牌。

封装在 `entry/src/main/ets/utils/NfcPeerManager.ets`(本轮之前已存在,本轮把它接进了新原生 UI)。

## 本轮改动

1. **UI**:`entry/src/main/ets/pages/Index.ets`
   - 新增碰一碰页 `NfcTouchPage`(角色选择:被碰 / 主动碰 → 实时状态 → 结果)。
   - 新增方法 `startNfcHost` / `startNfcReader` / `confirmNfcTouch` / `stopNfc`,把 `NfcPeerManager` 接到后端 NFC 证明接口。
   - 入口:「我 → 碰一碰信息」页顶部「开始碰一碰」按钮进入。
   - 生命周期:离开该页 / 页面销毁时自动 `stop()` NFC,避免残留占用。
2. **HCE 声明**:
   - `entry/src/main/resources/base/profile/nfc_card_emulation.json`(声明 AID `F0534D414C4C574F524C44`)。
   - `entry/src/main/module.json5` 的 EntryAbility 增加 `metadata` 引用该 profile。
   - 权限 `ohos.permission.NFC_TAG`、`ohos.permission.NFC_CARD_EMULATION` 此前已声明。

## 端到端流程

```
被碰手机(host)                        主动碰手机(reader)
  开始碰一碰 → 选「被碰」                 开始碰一碰 → 选「主动碰」
  POST /api/nfc/sessions                启动 ISO-DEP Reader
  拿到 sessionId + touchToken            贴靠 → 读取对方令牌(APDU)
  HCE 广播令牌  ───────────贴靠───────▶  校验挑战/有效期
                                        POST /api/nfc/sessions/confirm
                                        后端签发碰触证明 proofId
                                        UI 显示「真实见过 +1 + 凭证」
```

后端这条链路已被冒烟测试覆盖(`backend/tests/smoke.js` 的 NFC 段),功能正常。

## 真机测试步骤(需两部支持 NFC/HCE 的鸿蒙真机)

1. 两部真机都装本 App 并登录(各自不同账号)。
2. 后端可达(本地同网 `10.0.2.2`/局域网 IP,或上华为云后用云地址)。
3. A 机:我 → 碰一碰信息 → 开始碰一碰 → 选「被碰 · 展示令牌」。
4. B 机:同路径 → 选「主动碰 · 读取」。
5. 两机背部贴靠,B 机应显示「碰一碰成功 · 凭证 …」。

## 需要你在真机上确认的点

- **HCE profile schema**:不同 DevEco / HarmonyOS SDK 版本对 `nfc_card_emulation.json` 的字段可能略有差异。若 DevEco 对该文件或 `metadata` 报 schema 错,按你当前 SDK 的「Card Emulation / HCE」文档微调即可,**要声明的 AID 是 `F0534D414C4C574F524C44`**。
- **设备号唯一性**:前端为每台设备生成随机 `nfcDeviceId`,保证双机碰触时 host 与 reader 设备号不同(后端要求)。如需稳定设备标识,可后续替换为系统设备 ID。
- NFC 与 HCE 需在系统设置里开启;部分机型 HCE 需默认支付/NFC 应用授权。
