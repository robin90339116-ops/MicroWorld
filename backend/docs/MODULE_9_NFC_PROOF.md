# 模块 9：NFC Proof 手机碰一碰证明

## 目标

这个模块负责两部手机之间的真实 NFC 碰一碰证明。它只生成可信 `touchProof`，不直接计算评分，也不提交评价。评价提交和五维评分聚合属于模块 10 Review Rating。

## 文件结构

```text
backend/src/modules/nfc-proof/
  nfc-proof.routes.js
  nfc-proof.service.js
```

## 已完成接口

- `POST /api/nfc/sessions`
  - 手机 A 发起 HCE 会话。
  - 需要登录。
  - 请求体：`placeId`、`hostDeviceId`。
  - 返回两分钟有效的 `sessionId` 和 `touchToken`。

- `POST /api/nfc/sessions/confirm`
  - 手机 B 使用 ReaderMode / ISO-DEP 读取手机 A 的令牌后确认。
  - 需要登录。
  - 请求体：`sessionId`、`touchToken`、`readerDeviceId`、`transport: "iso_dep_apdu"`、`challenge`、`gpsVerified`。
  - 成功后生成 `touchProof`。

- `GET /api/nfc/sessions/:sessionId`
  - 手机 A 或手机 B 查询会话状态。
  - 返回 `waiting`、`confirmed`、`expired`、`superseded` 等状态。

- `GET /api/nfc/proofs`
  - 查询当前用户最近的碰一碰 proof。
  - 当前前端暂未强依赖，但后续“我的 - 碰一碰信息”可以直接使用。

## 核心规则

- 必须是两部不同手机。
- 必须是两个不同登录用户。
- 必须使用 `iso_dep_apdu` 传输。
- `touchToken` 一次性使用，确认后立即从会话里删除。
- 发起会话有效期为 2 分钟。
- 生成的 proof 可用于 20 分钟内提交真实评价。
- 同一用户发起新的 waiting 会话时，旧 waiting 会话会变为 `superseded`。

## 与其他模块关系

- Place / Explore 只提供地点数据。
- NFC Proof 生成 `touchProofs`。
- Review Rating 使用 `touchProofs` 校验 `POST /api/reviews/nfc`。
- Profile 从 `touchProofs` 读取用户碰一碰记录。

## 返回契约

所有 NFC Proof 成功响应带：

```text
contract: "SmallWorld NFC Proof v1"
guardrails.phoneToPhoneOnly: true
guardrails.transport: "iso_dep_apdu"
```

## 上云建议

短期：

- `nfc_sessions` 放 PostgreSQL。
- `touchToken` 建议只保存哈希，Redis 里放两分钟 TTL。
- `touch_proofs` 放 PostgreSQL，保留审计字段。

后续反作弊可增加：

- 同地点短时间异常聚集检测。
- 同设备多账号检测。
- GPS 与地点范围校验。
- APDU challenge-response 签名。

## 验证

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm run smoke
```
