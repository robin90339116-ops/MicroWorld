const MERCHANT_TAP_CONTRACT = 'SmallWorld Merchant Tap v1';

function arrayOf(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
  return data[key];
}

function merchantGuardrails() {
  return {
    merchantDeviceRequired: true,
    consumerLoginRequired: true,
    distinctConsumerAndMerchantDevices: true,
    separatedFromPhoneToPhoneProof: true,
    doesNotCreateSocialRelationship: true,
    itemReviewScope: 'consumed-item'
  };
}

function publicMerchantTap(data, tap, options = {}) {
  const place = typeof options.pickPlace === 'function' ? options.pickPlace(data, tap.placeId) : null;
  const orders = arrayOf(data, 'merchantOrders').filter(order => order.tapId === tap.id);
  const itemReviews = arrayOf(data, 'itemReviews').filter(review => review.tapId === tap.id);
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
    orderCount: orders.length,
    itemReviewCount: itemReviews.length
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

  const amount = Math.round(Math.max(0, Number(body.amount || 0)) * 100) / 100;
  const order = {
    id: options.createId('merchant_order'),
    tapId,
    placeId: tap.placeId,
    userId: account.id,
    itemName: String(body.itemName || 'Flat White').slice(0, 80),
    amount,
    currency: String(body.currency || 'AUD').slice(0, 8),
    status: 'paid',
    createdAt: new Date().toISOString()
  };

  arrayOf(data, 'merchantOrders').push(order);
  tap.status = 'paid';
  tap.lastOrderId = order.id;
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      message: '支付记录已完成',
      order,
      tap: publicMerchantTap(data, tap, options),
      guardrails: merchantGuardrails()
    }
  };
}

function merchantItemReview(data, account, tapId, body, options) {
  const tap = requireMerchantTap(data, account, tapId);
  if (!tap) {
    return { status: 404, body: { error: 'TAP_NOT_FOUND', message: '商家碰一碰记录不存在' } };
  }

  const stars = Math.max(1, Math.min(5, Number(body.stars || 5)));
  const review = {
    id: options.createId('item_review'),
    tapId,
    placeId: tap.placeId,
    userId: account.id,
    itemName: String(body.itemName || '消费物品').slice(0, 80),
    stars,
    tags: Array.isArray(body.tags) ? body.tags.map(tag => String(tag).slice(0, 24)).slice(0, 8) : [],
    comment: String(body.comment || '').slice(0, 240),
    createdAt: new Date().toISOString()
  };

  arrayOf(data, 'itemReviews').push(review);
  tap.status = 'reviewed';
  tap.lastItemReviewId = review.id;
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: MERCHANT_TAP_CONTRACT,
      message: '消费物品评价已提交',
      review,
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
  merchantPayment,
  publicMerchantTap,
  requireMerchantTap
};
