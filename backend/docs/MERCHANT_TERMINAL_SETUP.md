# 商家终端登记与凭证协议

当前已接入服务端协议及 App 商家 HCE/消费者 ISO-DEP 入口，但尚未完成商家双机真机验收。旧演示请求已删除；个人与商家通过 purpose 区分，不能交叉确认。

## 运营登记

1. 分别注册商家与消费者账号，使用不同设备。运营人员核实商家与地点归属；系统不会自动完成营业资质审查。
2. 从可信后端数据核对商家账号 ID 及其登录会话绑定的 deviceId。不要把消费者请求提供的 merchantId、设备号当成授权依据。
3. 在服务器创建仅管理员可写的 `merchant-registry.local.json`（已加入 Git 忽略），例如：

```json
[
  {
    "merchantId": "replace-with-merchant-id",
    "placeId": "replace-with-existing-place-id",
    "accountId": "replace-with-registered-account-id",
    "deviceId": "replace-with-session-device-id",
    "active": true
  }
]
```

4. 设置 `SMALLWORLD_MERCHANT_REGISTRY_FILE` 为该文件的绝对路径。文件缺失、格式错误、重复登记或同一商家映射多个地点时全部拒绝授权。不得把真实登记文件提交 Git。
5. 将 active 改为 false 可撤销。每次发起、上报、兑换、打卡、评价都重新检查文件；已经发放的奖励不自动追回。更换设备需重新登记，安装标识并非硬件身份认证。

## 接口顺序

所有接口都需要各自账号 Bearer token。消费者与商家分别使用自己的 token，禁止相互传输登录令牌。

1. 商家 `GET /api/merchant/terminals` 查看当前账号与当前登录设备的登记列表。
2. 商家 `POST /api/merchant/terminals/sessions`，正文 `{ "merchantId": "..." }`。返回 payload 包括 purpose=merchant、sessionId、一次性 touchToken、地点、商家账号、两分钟过期时间。数据库只保存令牌 SHA-256 摘要。
3. 商家 HCE 广播 payload，消费者 ISO-DEP 读取时生成 12 字节随机 challenge。商家本机观察到该挑战后，调用 `POST /api/merchant/terminals/sessions/:id/observe`，正文 `{ "challenge": "24位小写十六进制" }`。首次上报锁定挑战，不能替换。
4. 消费者 `POST /api/merchant/taps` 提交 payload、同一 challenge、transport=nfc-isodep。设备 ID 取登录会话，地点与商家取服务器登记，不接受消费者指定的值。商家尚未上报时返回 409 / TERMINAL_CONFIRMATION_PENDING，应保留原凭证重试，不生成新订单或奖励。
5. 成功生成 tap 后，20 分钟内首次 `POST /api/merchant/taps/:id/checkin`。重复打卡不延长凭证、不回退状态。随后才能提交 place-reviews；付款及商品评价仍关闭。

同账号同设备兑换重试返回同一 tap，即使原会话已过期；其他用户/设备不能复用。新终端会话替代该账号该设备尚未消费的旧会话。商家与消费者同账号或同设备拒绝。

## 安全与未完成边界

- 验证级别 `registered-terminal-client-reported-nfc`：运营登记身份、匹配客户端交换记录。hardwareVerified/gpsVerified 永远为 false。不声称能阻止两端串通、远程中继、被改造客户端或伪造安装 ID。
- 旧演示 tap 不具备服务端会话证据，即使其 hardwareVerified=true 或状态是 rewarded，也不能继续打卡/评价。旧历史保留，公开返回 legacy-unverified。
- 此协议适用于后续双手机 HCE/ISO-DEP 接入，不支持直接把普通静态门贴当作动态可信凭证；静态门贴方案需要独立设计。
- 当前仅单进程 JSON 模式及模拟 NFC 传输自动回归。多实例一致性、数据库事务、真实商家运营登记、双机前端交互、真机兼容性、跨进程客户端恢复、支付与真链均未验收。不要开放生产权益。
- 终端中止暂依赖两分钟超时或新会话替代；没有商家取消接口或 App 重启恢复。部署生产前还需请求频率限制、会话清理、HTTPS 和监控。

## App 真机操作清单（待执行）

1. 两部支持相应 NFC 能力的鸿蒙手机，登录不同账号、连接同一可用后端。商家账号和设备须先完成上述运营登记。
2. 商家：碰一碰 → 个人 ↔ 商家 → 商家·选择登记终端 → 选择具体登记项，等待 HCE 启动。无登记或系统不支持时应显示错误，不进入假成功。
3. 消费者：同页点击消费者·读取商家手机，贴靠商家手机。读到凭证后点击确认，商家端自动上报挑战；若上报失败，可在商家端重试，消费者也可重试原凭证。
4. 消费者进入登记商家的操作页后打卡，再评价；核对奖励一次性发放。支付仍显示未开通。
5. 核对个人/商家误碰、过期、撤销登记、断网重试、退出页面、切换角色、反复点击和重新登录等场景。停止按钮仅停止本机，不代表撤销已提交服务端结果。
6. 目前商家凭证仅在当前页面内存保留；进程退出后未兑换的会话超时失效，已兑换结果仍存服务器，但本页尚无恢复入口。不要声称商家杀进程恢复已完成。
