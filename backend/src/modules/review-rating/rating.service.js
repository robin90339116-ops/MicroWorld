const RATING_CONTRACT = 'SmallWorld Review Rating v1';
const RATING_DIMENSIONS = ['comfort', 'match', 'safety', 'activity', 'world'];

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function arrayOf(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
  return data[key];
}

function reviewQuality(review) {
  const commentLength = String(review.comment || '').trim().length;
  const scores = review.scores || {};
  const hasAllDimensions = RATING_DIMENSIONS.every(key => {
    return Number.isFinite(scores[key]);
  });
  return (hasAllDimensions ? 0.18 : 0) + Math.min(commentLength / 120, 0.22);
}

function reviewerWeight(data, review, proof) {
  const user = data.users && data.users[review.reviewerUserId] ? data.users[review.reviewerUserId] : {};
  const attendance = Math.min(Number(user.attendanceCount || 1) / 10, 1) * 0.35;
  const graph = Math.min(Number(user.graphDiversity || 0.45), 1) * 0.25;
  const stability = Math.min(Number(user.reviewStability || 0.6), 1) * 0.2;
  const nfc = proof && proof.status === 'completed' ? 1.15 : 0;
  const gps = proof && proof.gpsVerified ? 0.25 : 0;
  const quality = reviewQuality(review);
  return Math.min(2.6, 1 + nfc + gps + attendance + graph + stability + quality);
}

function normalizedRating(place) {
  const rating = place && place.rating ? place.rating : {};
  return {
    comfort: Number.isFinite(rating.comfort) ? rating.comfort : 88,
    match: Number.isFinite(rating.match) ? rating.match : 82,
    safety: Number.isFinite(rating.safety) ? rating.safety : 90,
    activity: Number.isFinite(rating.activity) ? rating.activity : 78,
    world: Number.isFinite(rating.world) ? rating.world : 72
  };
}

function trustLabelFor(score) {
  if (score >= 90) {
    return '高可信';
  }
  if (score >= 78) {
    return '可信';
  }
  return '待积累';
}

function summarizePlaceRating(data, place) {
  const safeData = data || {};
  const reviews = Array.isArray(safeData.reviews) ? safeData.reviews : [];
  const proofs = Array.isArray(safeData.touchProofs) ? safeData.touchProofs : [];
  const placeReviews = reviews.filter(review => review.placeId === place.id && review.status === 'accepted');
  const placeProofs = proofs.filter(proof => proof.placeId === place.id && proof.status === 'completed');

  const baseRating = normalizedRating(place);
  let rating = baseRating;
  let score = Number(place.score || 0);
  let verifiedReviews = Number(place.verifiedReviews || 0) + placeReviews.length;
  let repeatRate = Number(place.repeatRate || 0);

  if (placeReviews.length > 0) {
    const baselineWeight = Math.max(8, Math.min(24, Math.round((place.verifiedReviews || 12) / 2)));
    const weighted = {
      comfort: baseRating.comfort * baselineWeight,
      match: baseRating.match * baselineWeight,
      safety: baseRating.safety * baselineWeight,
      activity: baseRating.activity * baselineWeight,
      world: baseRating.world * baselineWeight,
      score: score * baselineWeight,
      total: baselineWeight
    };

    placeReviews.forEach(review => {
      const proof = proofs.find(item => item.id === review.proofId);
      const weight = reviewerWeight(safeData, review, proof);
      const scores = review.scores || {};
      const reviewScore = average([
        scores.comfort,
        scores.match,
        scores.safety,
        scores.activity,
        scores.world
      ]) / 20;
      weighted.comfort += Number(scores.comfort || 0) * weight;
      weighted.match += Number(scores.match || 0) * weight;
      weighted.safety += Number(scores.safety || 0) * weight;
      weighted.activity += Number(scores.activity || 0) * weight;
      weighted.world += Number(scores.world || 0) * weight;
      weighted.score += reviewScore * weight;
      weighted.total += weight;
    });

    rating = {
      comfort: Math.round(weighted.comfort / weighted.total),
      match: Math.round(weighted.match / weighted.total),
      safety: Math.round(weighted.safety / weighted.total),
      activity: Math.round(weighted.activity / weighted.total),
      world: Math.round(weighted.world / weighted.total)
    };
    score = Math.round((weighted.score / weighted.total) * 10) / 10;
    repeatRate = Math.min(95, Math.max(repeatRate, Math.round(average(placeReviews.map(review => review.repeatVisit ? 80 : 52)))));
  }

  const nfcTouches = Number(place.nfcTouches || 0) + placeProofs.length;
  const attendanceCount = Number(place.attendanceCount || 0);
  const trustScore = Math.min(98, Math.max(
    Number(place.trustScore || 0),
    Math.round(70 + Math.min(verifiedReviews, 60) * 0.35 + Math.min(nfcTouches, 120) * 0.08)
  ));
  const trustLabel = place.trustLabel || trustLabelFor(trustScore);

  return {
    rating,
    score: score.toFixed(1),
    attendanceCount,
    arrivalCount: attendanceCount,
    verifiedReviews,
    reviewTouchCount: verifiedReviews,
    nfcTouches,
    realTouchCount: nfcTouches,
    repeatRate,
    trustScore,
    trustLabel,
    credibleRatingLevel: trustLabel,
    socialPressure: place.socialPressure || '低压力',
    nfcEnabled: place.nfcEnabled !== false,
    socialMetrics: {
      comfort: rating.comfort,
      match: rating.match,
      safety: rating.safety,
      activity: rating.activity,
      world: rating.world,
      trustScore,
      trustLabel,
      attendanceCount,
      nfcTouches,
      repeatRate
    }
  };
}

function ratingGuardrails() {
  return {
    requiresNfcProof: true,
    proofTransport: 'iso_dep_apdu',
    proofMustBeHardwareVerified: true,
    reviewerMustBeTouchParticipant: true,
    oneReviewPerProofPerUser: true,
    dimensions: RATING_DIMENSIONS
  };
}

function validScoreSet(scores) {
  if (!scores || typeof scores !== 'object') {
    return false;
  }
  return RATING_DIMENSIONS.every(key => {
    return Number.isFinite(scores[key]) && scores[key] >= 0 && scores[key] <= 100;
  });
}

function recentAcceptedReviews(data, placeId) {
  return arrayOf(data, 'reviews')
    .filter(review => review.placeId === placeId && review.status === 'accepted')
    .slice(-20)
    .reverse()
    .map(review => ({
      id: review.id,
      placeId: review.placeId,
      reviewerUserId: review.reviewerUserId,
      scores: review.scores,
      comment: review.comment,
      repeatVisit: review.repeatVisit,
      status: review.status,
      createdAt: review.createdAt
    }));
}

function getPlaceRating(data, place, options = {}) {
  const summary = summarizePlaceRating(data, place);
  const enriched = typeof options.enrichPlace === 'function' ?
    options.enrichPlace(data, place, options.origin || null) :
    { ...place, ...summary };

  return {
    contract: RATING_CONTRACT,
    place: enriched,
    summary,
    dimensions: RATING_DIMENSIONS.map(key => ({
      key,
      value: summary.rating[key]
    })),
    recentReviews: recentAcceptedReviews(data, place.id),
    guardrails: ratingGuardrails()
  };
}

function submitNfcReview(data, account, body, options) {
  const place = options.pickPlace(data, body.placeId);
  if (!place) {
    return { status: 404, body: { error: 'PLACE_NOT_FOUND', message: '地点不存在' } };
  }

  const proof = arrayOf(data, 'touchProofs').find(item => item.id === body.proofId);
  if (!proof || proof.status !== 'completed' || proof.placeId !== place.id ||
      proof.transport !== 'iso_dep_apdu' || proof.hardwareVerified !== true) {
    return { status: 403, body: { error: 'NFC_PROOF_REQUIRED', message: '必须先由两部手机完成真实 NFC 碰一碰，才能评价' } };
  }

  if (Date.parse(proof.expiresAt) < Date.now()) {
    return { status: 403, body: { error: 'NFC_PROOF_EXPIRED', message: '碰触凭证已过期，请重新到场碰触' } };
  }

  const reviewerUserId = account.id;
  if (reviewerUserId !== proof.initiatorUserId && reviewerUserId !== proof.peerUserId) {
    return { status: 403, body: { error: 'NOT_TOUCH_PARTICIPANT', message: '只有本次碰触的双方可以评价' } };
  }

  const reviews = arrayOf(data, 'reviews');
  const alreadyReviewed = reviews.some(review => review.proofId === proof.id && review.reviewerUserId === reviewerUserId);
  if (alreadyReviewed) {
    return { status: 409, body: { error: 'ALREADY_REVIEWED', message: '一次真实碰触只能提交一次评价' } };
  }

  const scores = body.scores || {};
  if (!validScoreSet(scores)) {
    return { status: 400, body: { error: 'INVALID_SCORES', message: '评分维度必须是 0-100 的数字' } };
  }

  const review = {
    id: options.createId('review'),
    placeId: place.id,
    proofId: proof.id,
    reviewerUserId,
    scores,
    comment: String(body.comment || '').slice(0, 240),
    repeatVisit: Boolean(body.repeatVisit),
    status: 'accepted',
    createdAt: new Date().toISOString()
  };

  reviews.push(review);
  const enriched = options.enrichPlace(data, place);
  const weight = reviewerWeight(data, review, proof);
  options.persist(data);

  return {
    status: 201,
    body: {
      contract: RATING_CONTRACT,
      message: '已基于手机碰一碰凭证提交真实评价',
      proofId: proof.id,
      review,
      reviewWeight: Number(weight.toFixed(2)),
      place: enriched,
      summary: summarizePlaceRating(data, place),
      guardrails: ratingGuardrails()
    }
  };
}

module.exports = {
  RATING_CONTRACT,
  RATING_DIMENSIONS,
  average,
  getPlaceRating,
  normalizedRating,
  ratingGuardrails,
  recentAcceptedReviews,
  reviewQuality,
  reviewerWeight,
  submitNfcReview,
  summarizePlaceRating,
  trustLabelFor,
  validScoreSet
};
