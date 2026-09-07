const { createChainAnchor } = require('../../shared/chainAnchor');

const MERCHANT_TAP_CONTRACT = 'SmallWorld Merchant Tap v1';

// 商家纪念徽章走同一套数字藏品上链锚定层(certificate 默认 / huawei-bcs 可选)。
const chainAnchor = createChainAnchor();

function arrayOf(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
  return data[key];
}

function hasCheckin(tap) {
  return Boolean(tap.checkinAt) || ['checked-in', 'paid', 'reviewed', 'rewarded'].includes(tap.status);
}

// 完成到店评价后发放「商家纪念徽章」(数字藏品)+ 积分,对应设计的「商家碰一碰结果页」。
function awardMerchantReward(data, account, tap, place, options) {
  const placeLabel = place ? (place.shortName || place.name) : '商家';
  const serial = arrayOf(data, 'merchantMedals').filter(item => item.placeId === tap.placeId).length + 7;
  const tokenId = `SW-MERCHANT-${String(tap.placeId).toUpperCase()}-${String(serial).padStart(3, '0')}`;
  const medal = {
    id: options.createId('merchant_medal'),
    userId: account.id,
    placeId: tap.placeId,
    tapId: tap.id,
    name: `${placeLabel}纪念徽章`,
    rarity: 'R',
    tokenId,
    editionNumber: serial,
    earnedAt: new Date().toISOString()
  };
  chainAnchor.stampNewCollectible(medal);
  arrayOf(data, 'merchantMedals').push(medal);

  const AWARD = 5;
  if (!data.userPoints || typeof data.userPoints !== 'object' || Array.isArray(data.userPoints)) {
    data.userPoints = {};
  }
  const total = Math.round(Number(data.userPoints[account.id] || 0)) + AWARD;
  data.userPoints[account.id] = total;

  return {
    medal: {
      name: medal.name,
      rarity: medal.rarity,
      tokenId: medal.tokenId,
      editionNumber: medal.editionNumber,
      chainStatus: medal.chainStatus,
      chainProvider: medal.chainProvider,
      standard: chainAnchor.standard
    },
    points: { awarded: AWARD, total }
  };
}

function merchantGuardrails() {
  return {
    merchantDeviceRequired: true,
    consumerLoginRequired: true,
    distinctConsumerAndMerchantDevices: true,
    separatedFromPhoneToPhoneProof: true,
    doesNotCreateSocialRelationship: true,
    itemReviewScope: 'consumed-item',
    paymentAvailable: false,
    itemReviewAvailable: false
  };
}

function publicMerchantTap(data, tap, options = {}) {
  const place = typeof options.pickPlace === 'function' ? options.pickPlace(data, tap.placeId) : null;
  const orders = arrayOf(data, 'merchantOrders').filter(order => order.tapId === tap.id);
  const itemReviews = arrayOf(data, 'itemReviews').filter(review => review.tapId === tap.id);
  const placeReviews = arrayOf(data, 'merchantPlaceReviews').filter(review => review.tapId === tap.id);
  return {
    ...tap,
    place: place ? {
      id: place.id,
      name: place.name,
      shortName: place.shortName,
      address: place.address || ''
    } : null,
    orders,
    itemReviews,
    placeReviews,
    orderCount: orders.length,
    itemReviewCount: itemReviews.length,
    placeReviewCount: placeReviews.length
  };
}

function listMerchantTaps(data, account, options = {}) {
  const taps = arrayOf(data, 'merchantTaps')
    .filter(tap => tap.userId === account.id)
    .slice(-30)
    .reverse()
    .map(tap => publicMerchantTap(data, tap, options));

  return {
    contract: MERCHANT_TAP_CONTRACT,
    taps,
    count: taps.length,
    guardrails: merchantGuardrails()
  };
}

function createMerchantTap(data, account, body, options) {
  const place = options.pickPlace(data, body.placeId || 'coffee');
  if (!place) {
    return { status: 404, body: { error: 'PLACE_NOT_FOUND', message: '商家地点不存在' } };
  }

  const deviceId = String(body.deviceId || '').slice(0, 120);
  const merchantDeviceId = String(body.merchantDeviceId || 'merchant-nfc-device').slice(0, 120);
  if (!merchantDeviceId) {
    return { status: 400, body: { error: 'MERCHANT_DEVICE_REQUIRED', message: '商家 NFC 设备 ID 缺失' } };
  }
  if (deviceId && deviceId === merchantDeviceId) {
    return { status: 409, body: { error: 'MERCHANT_DEVICE_CONFLICT', message: '用户手机和商家设备不能是同一个设备' } };
  }

  const tap = {
    id: options.createId('merchant_tap'),
    placeId: place.id,
    userId: account.id,
    deviceId,
    merchantDeviceId,
    merchantId: String(body.merchantId || place.id).slice(0, 80),
    transport: String(body.transport || 'merchant_nfc'),
    hardwareVerified: body.hardwareVerified !== false,
    status: 'verified',
    createdAt: new Date().toISOString()
  };

  arrayOf(data, 'merchantTaps').push(tap);
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      message: '已完成商家 NFC 碰一碰',
      tap: publicMerchantTap(data, tap, options),
      place: options.enrichPlace(data, place),
      guardrails: merchantGuardrails()
    }
  };
}

function requireMerchantTap(data, account, tapId) {
  return arrayOf(data, 'merchantTaps').find(item => item.id === tapId && item.userId === account.id) || null;
}

function merchantCheckin(data, account, tapId, options) {
  const tap = requireMerchantTap(data, account, tapId);
  if (!tap) {
    return { status: 404, body: { error: 'TAP_NOT_FOUND', message: '商家碰一碰记录不存在' } };
  }

  tap.checkinAt = new Date().toISOString();
  tap.status = 'checked-in';
  options.persist(data);

  return {
    status: 200,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      message: '到店打卡成功',
      tap: publicMerchantTap(data, tap, options),
      guardrails: merchantGuardrails()
    }
  };
}

function merchantPayment(data, account, tapId, body, options) {
  const tap = requireMerchantTap(data, account, tapId);
  if (!tap) {
    return { status: 404, body: { error: 'TAP_NOT_FOUND', message: '商家碰一碰记录不存在' } };
  }

  // No provider adapter has been configured. Never trust a client-reported
  // amount, transaction ID or success flag as proof of payment.
  return {
    status: 503,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      error: 'PAYMENT_NOT_CONFIGURED',
      message: '真实支付尚未开通，未创建订单或扣款，请使用商家现有收款方式；暂不开放 App 商品评价',
      guardrails: merchantGuardrails()
    }
  };
}

function merchantItemReview(data, account, tapId, body, options) {
  const tap = requireMerchantTap(data, account, tapId);
  if (!tap) {
    return { status: 404, body: { error: 'TAP_NOT_FOUND', message: '商家碰一碰记录不存在' } };
  }

  // Legacy orders were generated without provider verification. They must not
  // unlock reviews. Re-enable only with server-verified, order-bound eligibility.
  return {
    status: 403,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      error: 'VERIFIED_PAYMENT_REQUIRED',
      message: '商品评价需要支付平台核验的订单；真实支付尚未开通，旧模拟记录和线下付款不能解锁评价',
      guardrails: merchantGuardrails()
    }
  };
}

// 设计 p2b-rate:到店打卡后评价地点(店铺评分),完成即发放商家纪念徽章 + 积分。
function merchantPlaceReview(data, account, tapId, body, options) {
  const tap = requireMerchantTap(data, account, tapId);
  if (!tap) {
    return { status: 404, body: { error: 'TAP_NOT_FOUND', message: '商家碰一碰记录不存在' } };
  }
  if (!hasCheckin(tap)) {
    return { status: 403, body: { error: 'CHECKIN_REQUIRED', message: '到店打卡后才可评价地点，更可信' } };
  }
  const existing = arrayOf(data, 'merchantPlaceReviews').find(item => item.tapId === tapId);
  if (existing) {
    return { status: 409, body: { error: 'ALREADY_REVIEWED', message: '本次商家碰一碰已评价过该地点' } };
  }

  const stars = Math.max(1, Math.min(5, Number(body.stars || 5)));
  const place = typeof options.pickPlace === 'function' ? options.pickPlace(data, tap.placeId) : null;
  const review = {
    id: options.createId('merchant_place_review'),
    tapId,
    placeId: tap.placeId,
    userId: account.id,
    stars,
    tags: Array.isArray(body.tags) ? body.tags.map(tag => String(tag).slice(0, 24)).slice(0, 8) : [],
    comment: String(body.comment || '').slice(0, 240),
    createdAt: new Date().toISOString()
  };
  arrayOf(data, 'merchantPlaceReviews').push(review);

  const reward = awardMerchantReward(data, account, tap, place, options);
  tap.status = 'rewarded';
  tap.placeReviewId = review.id;
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      message: '感谢你的真实到店评价，地点可信度已更新',
      review,
      reward,
      tap: publicMerchantTap(data, tap, options),
      guardrails: merchantGuardrails()
    }
  };
}

module.exports = {
  MERCHANT_TAP_CONTRACT,
  createMerchantTap,
  listMerchantTaps,
  merchantCheckin,
  merchantGuardrails,
  merchantItemReview,
  merchantPlaceReview,
  merchantPayment,
  publicMerchantTap,
  requireMerchantTap
};
