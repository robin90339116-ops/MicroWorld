# 模块 11：Merchant Tap 商家碰一碰消费评价

## 目标

Merchant Tap 负责用户和商家 NFC 设备之间的轻量碰一碰流程，用于到店、消费记录和消费物品评价。

它和模块 9 NFC Proof 不同：

- NFC Proof 是两部用户手机之间的真实见过证明。
- Merchant Tap 是用户手机和商家设备之间的消费/到店证明。
- Merchant Tap 不自动建立社交关系，也不作为地点五维真实评价的 proof。

## 文件结构

```text
backend/src/modules/merchant-tap/
  merchant-tap.routes.js
  merchant-tap.service.js
```

## 已完成接口

- `GET /api/merchant/taps`
  - 查询当前用户最近的商家碰一碰记录。

- `POST /api/merchant/taps`
  - 用户和商家设备完成一次碰一碰。
  - 请求体：`placeId`、`deviceId`、`merchantDeviceId`、`merchantId`。

- `POST /api/merchant/taps/:tapId/checkin`
  - 基于碰一碰记录完成到店打卡。

- `POST /api/merchant/taps/:tapId/payments`
  - 记录一笔消费。
  - 请求体：`itemName`、`amount`、`currency`。

- `POST /api/merchant/taps/:tapId/item-reviews`
  - 对消费物品提交评价。
  - 请求体：`itemName`、`stars`、`tags`、`comment`。

## 返回契约

成功响应返回：

```text
contract: "SmallWorld Merchant Tap v1"
```

并包含：

```text
guardrails.merchantDeviceRequired
guardrails.consumerLoginRequired
guardrails.distinctConsumerAndMerchantDevices
guardrails.separatedFromPhoneToPhoneProof
guardrails.doesNotCreateSocialRelationship
guardrails.itemReviewScope
```

## 数据结构

当前 JSON 数据：

```text
merchantTaps
merchantOrders
itemReviews
```

## 云上迁移建议

PostgreSQL：

```text
merchant_taps(
  id,
  place_id,
  user_id,
  device_id,
  merchant_device_id,
  merchant_id,
  transport,
  hardware_verified,
  status,
  checkin_at,
  created_at
)

merchant_orders(
  id,
  tap_id,
  place_id,
  user_id,
  item_name,
  amount,
  currency,
  status,
  created_at
)

item_reviews(
  id,
  tap_id,
  place_id,
  user_id,
  item_name,
  stars,
  tags_json,
  comment,
  created_at
)
```

后续可接入：

- 腾讯云 PostgreSQL / TDSQL-C 存主数据。
- Redis 做短时设备 token 和重复提交锁。
- CLS 记录商家设备异常碰触审计。

## 验证

```bash
cd /Users/robinjack/Documents/SmallWorld/backend
npm run smoke
```
