const authService = require('../auth/auth.service');
const interestClubService = require('../interest-club/interest-club.service');

const PROFILE_CONTRACT = 'SmallWorld Profile v1';

const PROFILE_TROPHIES = [
  { id: 'trophy-city-champion', icon: '冠', name: '城市探索赛 冠军', date: '2026.03', bg: '#f4efe6', color: '#a07b34' },
  { id: 'trophy-reading-runnerup', icon: '银', name: '读书马拉松 亚军', date: '2026.01', bg: '#eaf0fa', color: '#3a6ec8' },
  { id: 'trophy-nfc-finish', icon: '章', name: '碰一碰挑战赛 完赛', date: '2025.11', bg: '#eef3f1', color: '#3f8a78' },
  { id: 'trophy-coffee-winner', icon: '啡', name: '咖啡地图任务 优胜', date: '2025.09', bg: '#fdf2ee', color: '#c2542f' }
];

const PROFILE_SCHEDULE = [
  { id: 'schedule-city-semi', day: '12', month: '7月', name: '城市探索赛 复赛', place: 'CBD 起点' },
  { id: 'schedule-reading', day: '20', month: '7月', name: '读书马拉松', place: 'State Library' },
  { id: 'schedule-nfc', day: '02', month: '8月', name: '碰一碰挑战赛', place: 'Market Lane' }
];

const PROFILE_MENU = [
  { icon: '冠', label: '比赛奖杯展示', bg: '#f4efe6', color: '#a07b34', to: 'meTrophies', endpoint: '/api/me/trophies' },
  { icon: '星', label: '个人动态', bg: '#eaf0fa', color: '#3a6ec8', to: 'meMoments', endpoint: '/api/me/moments' },
  { icon: '◎', label: '个人虚拟世界', bg: '#dfe7da', color: '#2f6b4f', to: 'meWorld', endpoint: '/api/me/worlds' },
  { icon: '⌂', label: '已加入的俱乐部', bg: '#e7e0ef', color: '#7a5cc0', to: 'meClubs', endpoint: '/api/me/clubs' },
  { icon: '▤', label: '个人比赛日程', bg: '#fdf2ee', color: '#c2542f', to: 'meSchedule', endpoint: '/api/me/schedule' },
  { icon: '◆', label: '兴趣记录数据', bg: '#eef3f1', color: '#3f8a78', to: 'meInterestData', endpoint: '/api/me/interest-data' },
  { icon: '▣', label: '碰一碰信息', bg: '#f4efe6', color: '#a07b34', to: 'meNfc', endpoint: '/api/me/nfc' }
];

const PROFILE_SETTINGS_ROWS = [
  { label: '账号与安全', key: 'accountSecurity' },
  { label: '隐私设置', key: 'privacy' },
  { label: '通知设置', key: 'notifications' },
  { label: '关于 SmallWorld', key: 'about' },
  { label: '退出登录', key: 'logout' }
];

const DEFAULT_PROFILE_SETTINGS = {
  invisible: false,
  todayHidden: false,
  activityNotificationsEnabled: true,
  messageNotificationsEnabled: true,
  preciseLocationEnabled: true,
  nfcEnabled: true
};

const SETTING_DESCRIPTIONS = [
  { key: 'invisible', label: '隐身模式', group: 'privacy', description: '开启后不在现场成员列表里展示。' },
  { key: 'todayHidden', label: '今天不想被发现', group: 'privacy', description: '只对当天同地点用户隐藏发现入口。' },
  { key: 'activityNotificationsEnabled', label: '活动通知', group: 'notifications', description: '接收已收藏地点和俱乐部活动提醒。' },
  { key: 'messageNotificationsEnabled', label: '聊天通知', group: 'notifications', description: '接收真实见过的人发来的消息。' },
  { key: 'preciseLocationEnabled', label: '精确定位', group: 'privacy', description: '用于到场验证、路线和附近地点排序。' },
  { key: 'nfcEnabled', label: '碰一碰信息', group: 'privacy', description: '允许用手机 NFC 生成真实见过证明。' }
];

const FEATURE_ALIASES = {
  meTrophies: 'trophies',
  meMoments: 'moments',
  meWorld: 'worlds',
  meClubs: 'clubs',
  meSchedule: 'schedule',
  meInterestData: 'interest-data',
  meNfc: 'nfc',
  meSettings: 'settings'
};

function arrayOf(data, key) {
  return Array.isArray(data[key]) ? data[key] : [];
}

function objectOf(data, key) {
  if (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key])) {
    data[key] = {};
  }
  return data[key];
}

function profileSettingsFor(data, account) {
  const profileSettings = objectOf(data, 'profileSettings');
  const current = profileSettings[account.id] || {};
  const settings = {
    ...DEFAULT_PROFILE_SETTINGS,
    ...current
  };
  profileSettings[account.id] = settings;
  return settings;
}

function updateProfileSettings(data, account, body, options = {}) {
  const current = profileSettingsFor(data, account);
  const next = { ...current };
  Object.keys(DEFAULT_PROFILE_SETTINGS).forEach(key => {
    if (typeof body[key] === 'boolean') {
      next[key] = body[key];
    }
  });

  objectOf(data, 'profileSettings')[account.id] = next;
  if (typeof options.persist === 'function') {
    options.persist(data);
  }

  return {
    status: 200,
    body: {
      contract: PROFILE_CONTRACT,
      message: '设置已保存',
      settings: next,
      editableSettings: SETTING_DESCRIPTIONS
    }
  };
}

function profileMomentsFor(data, account) {
  const displayName = account.displayName || '城市书签';
  const avatar = displayName.slice(0, 1);
  const moments = arrayOf(data, 'myMoments').filter(moment => {
    return moment.authorId === account.id || moment.authorId === 'me';
  });

  return moments.map(moment => ({
    ...moment,
    authorId: account.id,
    authorName: displayName,
    authorAvatar: avatar,
    visibility: moment.visibility || 'seen-connections'
  }));
}

function profileClubsFor(data, account) {
  const styles = [
    { icon: '书', bg: '#eaf0fa', color: '#3a6ec8' },
    { icon: '啡', bg: '#fdf2ee', color: '#c2542f' },
    { icon: '图', bg: '#eef3f1', color: '#3f8a78' },
    { icon: '艺', bg: '#e7e0ef', color: '#7a5cc0' }
  ];
  const interests = Array.isArray(account.interests) ? account.interests : [];
  const ranked = interestClubService.verifiedClubs().sort((left, right) => {
    const leftMatch = interests.some(value => left.summary.includes(value) || left.name.includes(value)) ? 1 : 0;
    const rightMatch = interests.some(value => right.summary.includes(value) || right.name.includes(value)) ? 1 : 0;
    return rightMatch - leftMatch || right.memberCount - left.memberCount;
  });

  return ranked.slice(0, 4).map((club, index) => ({
    ...interestClubService.publicClub(data, club),
    icon: styles[index % styles.length].icon,
    bg: styles[index % styles.length].bg,
    color: styles[index % styles.length].color,
    members: club.memberCount,
    relationship: '已加入'
  }));
}

function profileInterestStats(data, account) {
  const interests = Array.isArray(account.interests) && account.interests.length > 0 ?
    account.interests :
    ['读书', '咖啡', '城市探索', '摄影'];

  return interests.slice(0, 6).map((name, index) => {
    const postCount = arrayOf(data, 'placePosts').filter(post => String(post.text || '').includes(name)).length;
    const count = Math.max(1, postCount + Math.max(4, 24 - index * 5));
    return {
      name,
      count,
      pct: Math.max(20, Math.min(96, count * 4)),
      source: '兴趣标签 + 地点公共空间互动'
    };
  });
}

function nfcExchangesFor(data, account) {
  return arrayOf(data, 'touchProofs')
    .filter(proof => proof.initiatorUserId === account.id || proof.peerUserId === account.id)
    .slice(-20)
    .reverse();
}

function profileHome(data, account) {
  const settings = profileSettingsFor(data, account);
  const users = objectOf(data, 'users');
  const userStats = users[account.id] || {};
  const myMoments = profileMomentsFor(data, account);
  const displayName = account.displayName || '城市书签';
  const nfcExchanges = nfcExchangesFor(data, account);
  const friends = arrayOf(data, 'friends');

  return {
    contract: PROFILE_CONTRACT,
    user: authService.publicAccount(account),
    display: {
      name: displayName,
      avatar: displayName.slice(0, 1),
      score: Number(userStats.score || 328),
      subtitle: (account.interests || []).join(' / ') || '读书 / 咖啡 / 城市探索'
    },
    settings,
    privacyGuardrails: {
      invisibleSupported: true,
      todayHiddenSupported: true,
      nfcToggleSupported: true,
      privateProfileHiddenFromNearby: settings.invisible || settings.todayHidden
    },
    stats: {
      attendanceCount: Number(userStats.attendanceCount || 0),
      repeatPlaceCount: Array.isArray(userStats.repeatPlaces) ? userStats.repeatPlaces.length : 0,
      friendCount: friends.length,
      momentCount: myMoments.length,
      nfcExchangeCount: nfcExchanges.length
    },
    menu: PROFILE_MENU,
    trophies: PROFILE_TROPHIES,
    moments: myMoments,
    clubs: profileClubsFor(data, account),
    schedule: PROFILE_SCHEDULE,
    interestStats: profileInterestStats(data, account),
    nfc: {
      enabled: settings.nfcEnabled,
      exchangeCount: nfcExchanges.length,
      exchanges: nfcExchanges
    },
    settingsRows: PROFILE_SETTINGS_ROWS,
    editableSettings: SETTING_DESCRIPTIONS,
    entries: PROFILE_MENU.map(item => item.label).concat(['设置']),
    deferred: {
      worldBackend: true,
      message: '个人虚拟世界页面当前仍使用前端本地展示，/api/worlds 后端按计划暂缓。'
    }
  };
}

function profileFeature(data, account, feature) {
  const normalizedFeature = FEATURE_ALIASES[feature] || feature;
  const settings = profileSettingsFor(data, account);

  if (normalizedFeature === 'trophies') {
    return { contract: PROFILE_CONTRACT, title: '比赛奖杯展示', trophies: PROFILE_TROPHIES };
  }
  if (normalizedFeature === 'moments') {
    return {
      contract: PROFILE_CONTRACT,
      title: '个人动态',
      moments: profileMomentsFor(data, account)
    };
  }
  if (normalizedFeature === 'clubs') {
    return {
      contract: PROFILE_CONTRACT,
      title: '已加入的俱乐部',
      clubs: profileClubsFor(data, account)
    };
  }
  if (normalizedFeature === 'schedule') {
    return { contract: PROFILE_CONTRACT, title: '个人比赛日程', schedule: PROFILE_SCHEDULE };
  }
  if (normalizedFeature === 'interest-data') {
    return {
      contract: PROFILE_CONTRACT,
      title: '兴趣记录数据',
      interests: profileInterestStats(data, account)
    };
  }
  if (normalizedFeature === 'nfc') {
    const exchanges = nfcExchangesFor(data, account);
    return {
      contract: PROFILE_CONTRACT,
      title: '碰一碰信息',
      nfcEnabled: settings.nfcEnabled,
      enabled: settings.nfcEnabled,
      exchangeCount: exchanges.length,
      exchanges,
      guardrails: {
        phoneToPhoneOnly: true,
        requiresBothUsers: true,
        usedForSeenProof: true
      }
    };
  }
  if (normalizedFeature === 'settings') {
    return {
      contract: PROFILE_CONTRACT,
      title: '设置',
      settings,
      rows: PROFILE_SETTINGS_ROWS,
      editableSettings: SETTING_DESCRIPTIONS
    };
  }
  if (normalizedFeature === 'worlds') {
    return {
      contract: PROFILE_CONTRACT,
      title: '个人虚拟世界',
      status: 'WORLD_BACKEND_DEFERRED',
      message: '世界模块后端本轮按要求暂不继续补写'
    };
  }

  return {
    contract: PROFILE_CONTRACT,
    title: '我的页面',
    user: authService.publicAccount(account),
    settings
  };
}

module.exports = {
  DEFAULT_PROFILE_SETTINGS,
  PROFILE_CONTRACT,
  PROFILE_MENU,
  PROFILE_SETTINGS_ROWS,
  PROFILE_SCHEDULE,
  PROFILE_TROPHIES,
  SETTING_DESCRIPTIONS,
  nfcExchangesFor,
  profileClubsFor,
  profileFeature,
  profileHome,
  profileInterestStats,
  profileMomentsFor,
  profileSettingsFor,
  updateProfileSettings
};
