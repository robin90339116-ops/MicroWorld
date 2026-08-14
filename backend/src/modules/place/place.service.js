const exploreService = require('../explore/explore.service');
const ratingService = require('../review-rating/rating.service');

const PLACE_LEADERBOARD_SEEDS = {
  library: [
    { userId: 'seed_library_1', displayName: '林间书页', attendanceCount: 18, contributionCount: 14, competitionPoints: 920, score: 1280, change: 1 },
    { userId: 'seed_library_2', displayName: '城市手帐', attendanceCount: 16, contributionCount: 17, competitionPoints: 760, score: 1190, change: 0 },
    { userId: 'seed_library_3', displayName: '墨尔本书签', attendanceCount: 13, contributionCount: 11, competitionPoints: 840, score: 1080, change: 2 },
    { userId: 'seed_library_4', displayName: '安静读者', attendanceCount: 12, contributionCount: 9, competitionPoints: 690, score: 930, change: -1 },
    { userId: 'seed_library_5', displayName: '拱顶漫游者', attendanceCount: 10, contributionCount: 12, competitionPoints: 610, score: 880, change: 3 }
  ],
  coffee: [
    { userId: 'seed_coffee_1', displayName: '慢半拍摄影', attendanceCount: 15, contributionCount: 16, competitionPoints: 880, score: 1210, change: 2 },
    { userId: 'seed_coffee_2', displayName: '浅烘地图', attendanceCount: 17, contributionCount: 13, competitionPoints: 640, score: 1120, change: 0 },
    { userId: 'seed_coffee_3', displayName: '巷口光影', attendanceCount: 11, contributionCount: 14, competitionPoints: 790, score: 1050, change: 1 },
    { userId: 'seed_coffee_4', displayName: '雨后坚果香', attendanceCount: 13, contributionCount: 10, competitionPoints: 570, score: 910, change: -2 },
    { userId: 'seed_coffee_5', displayName: '城市杯垫', attendanceCount: 9, contributionCount: 12, competitionPoints: 520, score: 820, change: 1 }
  ],
  boardgame: [
    { userId: 'seed_boardgame_1', displayName: '卡牌北风', attendanceCount: 21, contributionCount: 12, competitionPoints: 1180, score: 1390, change: 0 },
    { userId: 'seed_boardgame_2', displayName: '新手保护员', attendanceCount: 19, contributionCount: 16, competitionPoints: 960, score: 1270, change: 2 },
    { userId: 'seed_boardgame_3', displayName: '第三回合', attendanceCount: 15, contributionCount: 10, competitionPoints: 1020, score: 1160, change: -1 },
    { userId: 'seed_boardgame_4', displayName: '桌边观察者', attendanceCount: 14, contributionCount: 15, competitionPoints: 720, score: 1010, change: 1 },
    { userId: 'seed_boardgame_5', displayName: '规则说明书', attendanceCount: 12, contributionCount: 13, competitionPoints: 680, score: 930, change: 0 }
  ]
};

const PLACE_MEDAL_CATALOG = {
  library: [
    {
      id: 'first-bookmark',
      name: '第一枚城市书签',
      glyph: '签',
      rarity: '常见',
      accentColor: '#2E7D62',
      description: '在 State Library 完成一次真实手机碰一碰到场。',
      condition: '完成 1 次真实碰触',
      criteria: 'touch',
      goal: 1,
      editionSize: 5000,
      seededOwners: 326
    },
    {
      id: 'trusted-reader',
      name: '可信共读者',
      glyph: '读',
      rarity: '稀有',
      accentColor: '#496A7A',
      description: '在这里完成真实碰触，并提交一条五维可信评价。',
      condition: '提交 1 条真实碰触评价',
      criteria: 'review',
      goal: 1,
      editionSize: 1200,
      seededOwners: 86
    },
    {
      id: 'bookmark-champion',
      name: '隐藏书签冠军',
      glyph: '冠',
      rarity: '史诗',
      accentColor: '#B06A2B',
      description: '在城市书签 AR 比赛中获得 800 分以上。',
      condition: '比赛积分达到 800',
      criteria: 'competition',
      goal: 800,
      editionSize: 128,
      seededOwners: 21
    }
  ],
  coffee: [
    {
      id: 'first-cup',
      name: '巷口第一杯',
      glyph: '杯',
      rarity: '常见',
      accentColor: '#8A6848',
      description: '在 Market Lane 完成一次真实手机碰一碰到场。',
      condition: '完成 1 次真实碰触',
      criteria: 'touch',
      goal: 1,
      editionSize: 5000,
      seededOwners: 214
    },
    {
      id: 'flavour-cartographer',
      name: '风味制图师',
      glyph: '图',
      rarity: '稀有',
      accentColor: '#2B8D84',
      description: '提交一条可信评价，并参与地点内容共建。',
      condition: '真实评价与地点共建各 1 次',
      criteria: 'review_world',
      goal: 2,
      editionSize: 800,
      seededOwners: 64
    },
    {
      id: 'laneway-light',
      name: '巷口光影优胜',
      glyph: '影',
      rarity: '史诗',
      accentColor: '#6E63B6',
      description: '在巷口光影散步比赛中获得 800 分以上。',
      condition: '比赛积分达到 800',
      criteria: 'competition',
      goal: 800,
      editionSize: 96,
      seededOwners: 17
    }
  ],
  boardgame: [
    {
      id: 'first-table',
      name: '第一次入桌',
      glyph: '桌',
      rarity: '常见',
      accentColor: '#31685F',
      description: '在 Carlton Board Game 完成一次真实手机碰一碰到场。',
      condition: '完成 1 次真实碰触',
      criteria: 'touch',
      goal: 1,
      editionSize: 5000,
      seededOwners: 278
    },
    {
      id: 'friendly-player',
      name: '新人友好玩家',
      glyph: '友',
      rarity: '稀有',
      accentColor: '#C17A37',
      description: '在这里完成三次真实到场，并保持可信互动记录。',
      condition: '完成 3 次真实碰触',
      criteria: 'touch',
      goal: 3,
      editionSize: 1000,
      seededOwners: 72
    },
    {
      id: 'night-champion',
      name: '桌游夜冠军',
      glyph: '冠',
      rarity: '传奇',
      accentColor: '#7A3F72',
      description: '在新手友好桌游比赛中获得 1000 分以上。',
      condition: '比赛积分达到 1000',
      criteria: 'competition',
      goal: 1000,
      editionSize: 64,
      seededOwners: 12
    }
  ]
};

function pickPlace(data, placeId) {
  return (data.places || []).find(place => place.id === placeId);
}

function placeActivity(place, activityId) {
  return place && Array.isArray(place.activities) ?
    place.activities.find(activity => activity.id === activityId) :
    null;
}

function publicPlace(data, place, origin = null) {
  if (!place) {
    return null;
  }
  return exploreService.enrichPlace(data, place, origin);
}

function getPlaceDetail(data, placeId, searchParams) {
  const latitude = Number(searchParams && searchParams.get('latitude'));
  const longitude = Number(searchParams && searchParams.get('longitude'));
  const origin = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  const place = publicPlace(data, pickPlace(data, placeId), origin);
  if (!place) {
    return { status: 404, body: { error: 'PLACE_NOT_FOUND', message: '地点或地标不存在' } };
  }
  return {
    status: 200,
    body: {
      place,
      recognitionPreview: {
        leaderboards: placeLeaderboard(data, place, null).map(board => ({
          mode: board.mode,
          label: board.label,
          top: board.entries[0] || null
        })),
        medalCount: (PLACE_MEDAL_CATALOG[place.id] || []).length
      }
    }
  };
}

function getActivityDetail(data, placeId, activityId) {
  const rawPlace = pickPlace(data, placeId);
  const activity = rawPlace ? placeActivity(rawPlace, activityId) : null;
  if (!rawPlace || !activity) {
    return { status: 404, body: { error: 'ACTIVITY_NOT_FOUND', message: '活动或比赛不存在' } };
  }
  const place = publicPlace(data, rawPlace);
  return {
    status: 200,
    body: {
      place,
      activity: {
        ...activity,
        placeId: rawPlace.id,
        placeName: rawPlace.shortName || rawPlace.name,
        recognition: {
          leaderboardMode: activity.type === 'competition' ? 'competition' : 'contribution',
          medalEligible: activity.type === 'competition'
        }
      }
    }
  };
}

function placeUserMetrics(data, placeId, userId) {
  const proofs = (data.touchProofs || []).filter(proof => {
    return proof.placeId === placeId &&
      proof.status === 'completed' &&
      (proof.initiatorUserId === userId || proof.peerUserId === userId);
  });
  const reviews = (data.reviews || []).filter(review => {
    return review.placeId === placeId &&
      review.reviewerUserId === userId &&
      review.status === 'accepted';
  });
  const posts = (data.placePosts || []).filter(post => post.placeId === placeId && post.authorId === userId);
  const competitionResults = (data.competitionResults || []).filter(result => {
    return result.placeId === placeId && result.userId === userId && result.status === 'verified';
  });
  const competitionPoints = competitionResults.reduce((total, result) => {
    return total + Math.max(0, Number(result.points || 0));
  }, 0);
  const worldContributions = (data.worlds || []).reduce((total, world) => {
    if (world.placeId !== placeId) {
      return total;
    }
    const collaborators = Array.isArray(world.collaborators) ? world.collaborators : [];
    const objects = Array.isArray(world.objects) ? world.objects : [];
    const isOwner = world.ownerId === userId;
    const isCollaborator = collaborators.some(member => {
      return member.userId === userId && member.status === 'active';
    });
    const objectCount = objects.filter(object => object.createdBy === userId).length;
    return total + (isOwner || isCollaborator ? 1 : 0) + objectCount;
  }, 0);
  const contributionCount = reviews.length + posts.length + worldContributions;
  const score = proofs.length * 50 +
    reviews.length * 80 +
    posts.length * 8 +
    worldContributions * 20 +
    Math.round(competitionPoints * 0.25);
  return {
    attendanceCount: proofs.length,
    reviewCount: reviews.length,
    contributionCount,
    competitionPoints,
    worldContributions,
    score
  };
}

function placeLeaderboard(data, place, account) {
  const seeded = (PLACE_LEADERBOARD_SEEDS[place.id] || []).map(entry => ({
    ...entry,
    isCurrentUser: false
  }));
  const live = (data.accounts || []).map(item => {
    const metrics = placeUserMetrics(data, place.id, item.id);
    return {
      userId: item.id,
      displayName: item.displayName,
      attendanceCount: metrics.attendanceCount,
      contributionCount: metrics.contributionCount,
      competitionPoints: metrics.competitionPoints,
      score: metrics.score,
      change: 0,
      isCurrentUser: Boolean(account && account.id === item.id)
    };
  }).filter(entry => {
    return entry.score > 0 || entry.attendanceCount > 0 ||
      entry.competitionPoints > 0 || entry.isCurrentUser;
  });
  const entries = seeded.concat(live);
  const modes = [
    {
      mode: 'contribution',
      label: '本周贡献',
      description: '综合真实到场、可信评价、地点分享和小世界共建',
      valueLabel: '贡献值',
      value: entry => entry.score
    },
    {
      mode: 'competition',
      label: '活动比赛',
      description: '只统计经过主办方确认的活动与比赛积分',
      valueLabel: '比赛分',
      value: entry => entry.competitionPoints
    },
    {
      mode: 'attendance',
      label: '真实到场',
      description: '只统计两部手机 NFC 碰一碰形成的真实到场记录',
      valueLabel: '到场',
      value: entry => entry.attendanceCount
    }
  ];
  return modes.map(board => {
    const ranked = entries
      .map(entry => ({ ...entry, value: Number(board.value(entry)) }))
      .sort((left, right) => right.value - left.value || right.score - left.score)
      .slice(0, 50)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        displayName: entry.displayName,
        avatar: entry.displayName.slice(0, 1),
        value: entry.value,
        valueLabel: board.valueLabel,
        attendanceCount: entry.attendanceCount,
        contributionCount: entry.contributionCount,
        competitionPoints: entry.competitionPoints,
        change: entry.change,
        isCurrentUser: entry.isCurrentUser
      }));
    return {
      mode: board.mode,
      label: board.label,
      description: board.description,
      entries: ranked
    };
  });
}

function medalProgress(data, place, account, medal) {
  if (!account) {
    return { progress: 0, eligible: false };
  }
  const metrics = placeUserMetrics(data, place.id, account.id);
  let progress = 0;
  if (medal.criteria === 'touch') {
    progress = metrics.attendanceCount;
  } else if (medal.criteria === 'review') {
    progress = metrics.reviewCount;
  } else if (medal.criteria === 'competition') {
    progress = metrics.competitionPoints;
  } else if (medal.criteria === 'review_world') {
    progress = Math.min(metrics.reviewCount, 1) + Math.min(metrics.worldContributions, 1);
  }
  return {
    progress: Math.min(progress, medal.goal),
    eligible: progress >= medal.goal
  };
}

function publicPlaceMedals(data, place, account) {
  const catalog = PLACE_MEDAL_CATALOG[place.id] || [];
  return catalog.map(medal => {
    const ownedRecord = account ? (data.userMedals || []).find(item => {
      return item.userId === account.id && item.placeId === place.id && item.medalId === medal.id;
    }) : null;
    const progress = medalProgress(data, place, account, medal);
    const ownerCount = medal.seededOwners + (data.userMedals || []).filter(item => {
      return item.placeId === place.id && item.medalId === medal.id;
    }).length;
    return {
      id: medal.id,
      name: medal.name,
      glyph: medal.glyph,
      rarity: medal.rarity,
      accentColor: medal.accentColor,
      description: medal.description,
      condition: medal.condition,
      progress: progress.progress,
      goal: medal.goal,
      progressLabel: `${progress.progress}/${medal.goal}`,
      owned: Boolean(ownedRecord),
      claimable: progress.eligible && !ownedRecord,
      editionSize: medal.editionSize,
      ownerCount,
      tokenStandard: 'SmallWorld Landmark Collectible v1',
      chainStatus: ownedRecord ? ownedRecord.chainStatus : 'not-issued',
      chainLabel: ownedRecord ? '数字藏品凭证 · 待接入公链' : '尚未获得',
      tokenId: ownedRecord ? ownedRecord.tokenId : '',
      metadataUri: ownedRecord ? `/api/collectibles/${ownedRecord.tokenId}` : '',
      earnedAt: ownedRecord ? ownedRecord.earnedAt : ''
    };
  });
}

function placeRecognition(data, place, account) {
  return {
    placeId: place.id,
    placeName: place.shortName || place.name,
    rating: ratingService.summarizePlaceRating(data, place),
    leaderboards: placeLeaderboard(data, place, account),
    medals: publicPlaceMedals(data, place, account),
    nftNotice: '当前展示为 SmallWorld 数字藏品凭证。未配置公链合约前，不标记为已上链 NFT。'
  };
}

function claimPlaceMedal(data, place, account, medalId, options = {}) {
  const medal = (PLACE_MEDAL_CATALOG[place.id] || []).find(item => item.id === medalId);
  if (!medal) {
    return { status: 404, body: { error: 'MEDAL_NOT_FOUND', message: '奖牌不存在' } };
  }
  const existing = (data.userMedals || []).find(item => {
    return item.userId === account.id && item.placeId === place.id && item.medalId === medal.id;
  });
  if (existing) {
    return {
      status: 200,
      body: {
        message: '这枚奖牌已经在你的藏品中',
        medals: publicPlaceMedals(data, place, account)
      }
    };
  }
  const progress = medalProgress(data, place, account, medal);
  if (!progress.eligible) {
    return {
      status: 403,
      body: {
        error: 'MEDAL_NOT_ELIGIBLE',
        message: `尚未满足领取条件：${medal.condition}`
      }
    };
  }
  const serial = (data.userMedals || []).filter(item => {
    return item.placeId === place.id && item.medalId === medal.id;
  }).length + medal.seededOwners + 1;
  const tokenId = `SW-${place.id.toUpperCase()}-${medal.id.toUpperCase()}-${String(serial).padStart(5, '0')}`;
  const createId = typeof options.createId === 'function' ? options.createId : prefix => `${prefix}_${Date.now()}`;
  const record = {
    id: createId('medal'),
    userId: account.id,
    placeId: place.id,
    medalId: medal.id,
    tokenId,
    editionNumber: serial,
    chainStatus: 'digital-certificate',
    earnedAt: new Date().toISOString()
  };
  data.userMedals = Array.isArray(data.userMedals) ? data.userMedals : [];
  data.userMedals.push(record);
  if (typeof options.persist === 'function') {
    options.persist(data);
  }
  return {
    status: 201,
    body: {
      message: `已获得「${medal.name}」数字藏品凭证`,
      tokenId,
      medals: publicPlaceMedals(data, place, account)
    }
  };
}

function getCollectible(data, tokenId) {
  const record = (data.userMedals || []).find(item => item.tokenId === tokenId);
  const place = record ? pickPlace(data, record.placeId) : null;
  const medal = place ? (PLACE_MEDAL_CATALOG[place.id] || []).find(item => item.id === record.medalId) : null;
  if (!record || !place || !medal) {
    return { status: 404, body: { error: 'COLLECTIBLE_NOT_FOUND', message: '数字藏品凭证不存在' } };
  }
  return {
    status: 200,
    body: {
      name: medal.name,
      description: medal.description,
      tokenId: record.tokenId,
      standard: 'SmallWorld Landmark Collectible v1',
      place: {
        id: place.id,
        name: place.shortName || place.name,
        latitude: place.latitude,
        longitude: place.longitude
      },
      attributes: [
        { traitType: '稀有度', value: medal.rarity },
        { traitType: '地标', value: place.shortName || place.name },
        { traitType: '获得条件', value: medal.condition },
        { traitType: '版本编号', value: record.editionNumber }
      ],
      chainStatus: record.chainStatus,
      issuedAt: record.earnedAt
    }
  };
}

module.exports = {
  PLACE_LEADERBOARD_SEEDS,
  PLACE_MEDAL_CATALOG,
  claimPlaceMedal,
  getActivityDetail,
  getCollectible,
  getPlaceDetail,
  medalProgress,
  pickPlace,
  placeActivity,
  placeLeaderboard,
  placeRecognition,
  placeUserMetrics,
  publicPlace,
  publicPlaceMedals
};
