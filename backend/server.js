const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const authService = require('./src/modules/auth/auth.service');
const exploreService = require('./src/modules/explore/explore.service');
const exploreRoutes = require('./src/modules/explore/explore.routes');
const placeService = require('./src/modules/place/place.service');
const placeRoutes = require('./src/modules/place/place.routes');
const placeRoomService = require('./src/modules/place-room/place-room.service');
const placeRoomRoutes = require('./src/modules/place-room/place-room.routes');
const interestClubRoutes = require('./src/modules/interest-club/interest-club.routes');
const socialChatRoutes = require('./src/modules/social-chat/social-chat.routes');
const profileRoutes = require('./src/modules/profile/profile.routes');
const nfcProofRoutes = require('./src/modules/nfc-proof/nfc-proof.routes');
const ratingRoutes = require('./src/modules/review-rating/rating.routes');
const merchantTapRoutes = require('./src/modules/merchant-tap/merchant-tap.routes');
const safetyRoutes = require('./src/modules/safety/safety.routes');
const { createStore } = require('./src/shared/store');

const PORT = Number(process.env.SMALLWORLD_BACKEND_PORT || 8787);
const HOST = process.env.SMALLWORLD_BACKEND_HOST || '0.0.0.0';
const SERVICE_VERSION = process.env.SMALLWORLD_BACKEND_VERSION || '0.1.0-safety';
const CORS_ORIGIN = process.env.SMALLWORLD_CORS_ORIGIN || '*';
const DATA_FILE = process.env.SMALLWORLD_DATA_FILE ?
  path.resolve(process.env.SMALLWORLD_DATA_FILE) :
  path.join(__dirname, 'data.json');
const WORLD_VISIBILITIES = ['private', 'onsite', 'invite', 'public'];
const WORLD_THEMES = ['memoryGarden', 'cityStudio', 'coffeeIsland', 'nightGallery'];
const WORLD_ASSET_LIBRARY = {
  memoryTree: {
    name: '记忆树',
    kind: 'nature',
    glyph: '树',
    primaryColor: '#2E7D62',
    secondaryColor: '#E8F4EF',
    width: 22,
    height: 26
  },
  readingTable: {
    name: '共读桌',
    kind: 'furniture',
    glyph: '桌',
    primaryColor: '#7B5E42',
    secondaryColor: '#F5E6D3',
    width: 24,
    height: 15
  },
  bookmarkLight: {
    name: '书签灯',
    kind: 'light',
    glyph: '光',
    primaryColor: '#F4A35D',
    secondaryColor: '#FFF2D8',
    width: 12,
    height: 18
  },
  storyPortal: {
    name: '故事门',
    kind: 'portal',
    glyph: '门',
    primaryColor: '#31685F',
    secondaryColor: '#BFEDE4',
    width: 20,
    height: 27
  },
  messageWall: {
    name: '留言墙',
    kind: 'memory',
    glyph: '墙',
    primaryColor: '#496A7A',
    secondaryColor: '#E7F0F4',
    width: 27,
    height: 18
  },
  smallFountain: {
    name: '微光喷泉',
    kind: 'decor',
    glyph: '泉',
    primaryColor: '#2B9DAD',
    secondaryColor: '#DDF7F9',
    width: 20,
    height: 20
  }
};

const EXPLORE_PLACE_DEFAULTS = {
  library: {
    latitude: -37.8107,
    longitude: 144.9644,
    address: '328 Swanston St, Melbourne VIC',
    introduction: '维州州立图书馆是墨尔本市中心最稳定的低压力社交地标之一。这里适合读书、城市探索和安静交流，公共区域开阔，第一次参加线下活动也容易找到独处和退出空间。',
    openingHours: '周一至周日 10:00-21:00',
    highlights: ['安静社交', '公共阅读空间', '城市文化地标', '适合第一次见面'],
    roomRules: ['公共聊天只服务当前地点', '不公开私人联系方式', '禁止骚扰与刷屏', '活动信息以主办方现场通知为准'],
    attendanceCount: 238,
    socialPressure: '低压力',
    activities: [
      {
        id: 'library-reading',
        title: '夜间读书交流会',
        time: '今天 19:00',
        category: '读书',
        spotsLeft: 6,
        onsiteOnly: true,
        type: 'activity',
        status: 'ongoing',
        description: '围绕一本近期读物进行小组交流。可以只听不发言，现场设有安静席位。',
        venue: 'La Trobe Reading Room 东侧长桌',
        participants: 18,
        capacity: 24,
        organizer: 'State Library Reading Club',
        format: '自由入场 · 4-6 人小组',
        prize: '',
        rules: ['尊重不同阅读节奏', '不强制自我介绍', '发言控制在 3 分钟内']
      },
      {
        id: 'library-bookmark',
        title: '城市书签 AR 任务',
        time: '今天 20:30',
        category: '城市探索',
        spotsLeft: 12,
        onsiteOnly: true,
        type: 'competition',
        status: 'upcoming',
        description: '两人一组寻找馆内隐藏书签并完成城市故事线索，按完成度和合作质量计分。',
        venue: 'Swanston Street 主入口集合',
        participants: 20,
        capacity: 32,
        organizer: 'MicroWorld 城市探索组',
        format: '双人协作赛 · 45 分钟',
        prize: '城市探索徽章与隐藏书签花园共建资格',
        rules: ['必须现场组队', '禁止进入非开放区域', '不得代替其他队伍扫码']
      }
    ]
  },
  coffee: {
    latitude: -37.8156,
    longitude: 144.9658,
    address: '8 Collins St, Melbourne VIC',
    introduction: 'Market Lane 是适合短时见面和轻聊天的城市咖啡空间。座位距离舒适，周边步行路线丰富，适合从咖啡兴趣自然延伸到摄影和城市探索。',
    openingHours: '周一至周五 07:00-17:00，周末 08:00-17:00',
    highlights: ['咖啡兴趣', '轻量破冰', '适合短时见面', '摄影散步起点'],
    roomRules: ['公共聊天只服务当前地点', '不占用座位组织大型聚会', '尊重不想被打扰的用户', '分享照片前确认他人隐私'],
    attendanceCount: 164,
    socialPressure: '轻社交',
    activities: [
      {
        id: 'coffee-map',
        title: '咖啡地图共同任务',
        time: '今天 16:30',
        category: '咖啡',
        spotsLeft: 4,
        onsiteOnly: true,
        type: 'activity',
        status: 'ongoing',
        description: '一起品尝当日豆单，并把味觉印象放进地点咖啡地图。适合第一次参加活动。',
        venue: '店内后侧共享桌',
        participants: 8,
        capacity: 12,
        organizer: 'Market Lane 社群主理人',
        format: '小组体验 · 35 分钟',
        prize: '',
        rules: ['每人至少选择一种风味标签', '不评价他人的口味偏好', '保持通道畅通']
      },
      {
        id: 'coffee-photo',
        title: '巷口光影散步',
        time: '周六 17:00',
        category: '摄影',
        spotsLeft: 8,
        onsiteOnly: false,
        type: 'competition',
        status: 'upcoming',
        description: '从咖啡馆出发完成三段城市光影命题，回到地点页面提交一张作品参与现场互评。',
        venue: 'Market Lane 门口集合',
        participants: 14,
        capacity: 22,
        organizer: '慢半拍摄影小组',
        format: '个人创作赛 · 60 分钟',
        prize: '优胜作品进入巷口咖啡时间小世界展墙',
        rules: ['不拍摄可识别的陌生人正脸', '作品须在活动时间内完成', '每人只提交一张']
      }
    ]
  },
  boardgame: {
    latitude: -37.8052,
    longitude: 144.9701,
    address: '146 Lygon St, Carlton VIC',
    introduction: 'Carlton Board Game Night 是由主理人带局的新手友好桌游空间。规则讲解明确，活动以小桌为单位，不需要提前认识其他参与者。',
    openingHours: '周三、周五 18:00-23:00',
    highlights: ['新人带局', '规则讲解', '固定小桌', '可随时观战'],
    roomRules: ['公共聊天只服务当前地点', '禁止场外施压组队', '胜负不影响用户关系', '争议由当桌主理人处理'],
    attendanceCount: 196,
    socialPressure: '有人带局',
    activities: [
      {
        id: 'boardgame-newcomer',
        title: '新手友好桌游局',
        time: '今晚 20:00',
        category: '桌游',
        spotsLeft: 5,
        onsiteOnly: false,
        type: 'competition',
        status: 'ongoing',
        description: '主理人统一讲解规则后随机分桌，积分只用于当晚匹配，不进入长期社交排名。',
        venue: '二层 B 区 3-6 号桌',
        participants: 27,
        capacity: 32,
        organizer: 'Carlton Board Game Night',
        format: '瑞士轮小局 · 3 轮',
        prize: '当晚冠军徽章与下一期优先席位',
        rules: ['新手可申请规则提醒', '禁止场外提示', '每轮结束双方确认比分']
      }
    ]
  }
};

function id(prefix) {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const seed = {
  places: [
    {
      id: 'library',
      name: 'State Library Reading Club',
      shortName: 'State Library',
      cover: '城市图书馆 · 夜间读书会',
      tags: ['读书', '咖啡', '安静社交', '城市探索'],
      score: '4.8',
      distance: '1.2km',
      today: '今晚 19:00 读书交流会',
      ar: true,
      world: true,
      rating: { comfort: 92, match: 88, safety: 95, activity: 86, world: 76 },
      worlds: ['图书馆记忆墙', '隐藏书签花园'],
      reviews: ['这里适合轻松聊天，不尴尬。', '读书会的人比较同频，任务也很自然。'],
      verifiedReviews: 42,
      nfcTouches: 136,
      repeatRate: 68,
      trustScore: 91,
      trustLabel: '高可信',
      nfcEnabled: true
    },
    {
      id: 'coffee',
      name: 'Market Lane Coffee Corner',
      shortName: 'Market Lane',
      cover: '巷口咖啡 · 慢社交角落',
      tags: ['咖啡', '摄影', '轻聊天'],
      score: '4.6',
      distance: '800m',
      today: '今天 16:30 咖啡地图任务',
      ar: true,
      world: true,
      rating: { comfort: 89, match: 82, safety: 91, activity: 78, world: 80 },
      worlds: ['巷口咖啡时间', '城市杯垫收藏'],
      reviews: ['店里的人不会很吵，适合第一次见面。', 'AR 杯垫任务很好破冰。'],
      verifiedReviews: 29,
      nfcTouches: 84,
      repeatRate: 56,
      trustScore: 86,
      trustLabel: '可信',
      nfcEnabled: true
    },
    {
      id: 'boardgame',
      name: 'Carlton Board Game Night',
      shortName: 'Carlton Board Game',
      cover: '桌游夜 · 小局活动',
      tags: ['桌游', '活动', '新人友好'],
      score: '4.7',
      distance: '2.4km',
      today: '今晚 20:00 新手桌游局',
      ar: false,
      world: true,
      rating: { comfort: 86, match: 90, safety: 88, activity: 94, world: 72 },
      worlds: ['周三桌游档案馆'],
      reviews: ['主理人会带新人，不用担心融不进去。', '比普通群聊舒服很多。'],
      verifiedReviews: 35,
      nfcTouches: 112,
      repeatRate: 62,
      trustScore: 89,
      trustLabel: '高可信',
      nfcEnabled: true
    }
  ],
  nfcSessions: [],
  touchProofs: [],
  reviews: [],
  accounts: [],
  authSessions: [],
  placeRoomSessions: [],
  competitionResults: [],
  userMedals: [],
  placePosts: [
    {
      id: 'place_post_library_1',
      placeId: 'library',
      type: 'message',
      authorId: 'system',
      authorName: '地点助手',
      text: '今晚读书交流会还有少量位置，可以旁听，不强制发言。',
      activityId: 'library-reading',
      activityTitle: '夜间读书交流会',
      shareLabel: '',
      createdAt: '2026-06-13T08:00:00.000Z'
    },
    {
      id: 'place_post_coffee_1',
      placeId: 'coffee',
      type: 'share',
      authorId: 'system',
      authorName: 'Market Lane 社群',
      text: '今天的咖啡地图主题是“雨后坚果香”，欢迎到店后一起补充味觉标签。',
      activityId: 'coffee-map',
      activityTitle: '咖啡地图共同任务',
      shareLabel: '活动分享',
      createdAt: '2026-06-13T06:30:00.000Z'
    }
  ],
  friends: [
    {
      id: 'forest',
      name: '林间书页',
      avatar: '书',
      tags: ['读书', '咖啡', '城市探索'],
      metAt: 'State Library',
      relation: '共同完成隐藏书签 AR 任务',
      common: '读书 / 咖啡 / 安静社交',
      status: '可聊天',
      bio: '因隐藏书签任务认识，喜欢安静的分享和长对话。'
    },
    {
      id: 'photo',
      name: '慢半拍摄影',
      avatar: '镜',
      tags: ['摄影', '展览', '音乐'],
      metAt: 'Carlton 摄影散步',
      relation: '共同参加夜间摄影散步',
      common: '摄影 / 展览 / 音乐',
      status: '可聊天',
      bio: '慢节奏街拍爱好者，喜欢记录城市的光影瞬间。'
    },
    {
      id: 'city',
      name: '城市手帐',
      avatar: '册',
      tags: ['手作', '读书', '展览'],
      metAt: 'State Library',
      relation: '共同访问图书馆记忆墙',
      common: '读书 / 展览 / 城市故事',
      status: '低打扰',
      bio: '用手帐记录城市故事，偏好低频但真诚的交流。'
    }
  ],
  chats: [
    { id: 'chat-forest', friendId: 'forest', message: '刚刚那个书签任务挺有意思。', time: '20:42', unread: 1 },
    { id: 'chat-photo', friendId: 'photo', message: '下次摄影散步可以一起。', time: '昨天', unread: 0 }
  ],
  chatMessages: [
    { id: 'forest-1', chatId: 'chat-forest', text: '刚刚那个书签任务挺有意思。', mine: false, time: '20:36' },
    { id: 'forest-2', chatId: 'chat-forest', text: '对，而且不太尴尬。', mine: true, time: '20:38' },
    { id: 'forest-3', chatId: 'chat-forest', text: '下次读书会也可以一起参加。', mine: false, time: '20:42' },
    { id: 'photo-1', chatId: 'chat-photo', text: '今天那条巷子的光线很好。', mine: false, time: '昨天 19:24' },
    { id: 'photo-2', chatId: 'chat-photo', text: '我也拍到了，下次摄影散步可以一起。', mine: true, time: '昨天 19:31' }
  ],
  moments: [
    { id: 'moment-forest-1', authorId: 'forest', authorName: '林间书页', authorAvatar: '书', time: '2 小时前', text: '在 State Library 完成隐藏书签，遇到同好。', place: 'State Library', likes: 6, comments: 2 },
    { id: 'moment-photo-1', authorId: 'photo', authorName: '慢半拍摄影', authorAvatar: '镜', time: '昨天', text: '城市夜骑随手拍，光影很好。', place: 'Southbank', likes: 12, comments: 3 },
    { id: 'moment-city-1', authorId: 'city', authorName: '城市手帐', authorAvatar: '册', time: '2 天前', text: '把图书馆记忆墙的故事画进了手帐。', place: 'State Library', likes: 8, comments: 1 }
  ],
  myMoments: [
    { id: 'moment-me-1', authorId: 'me', authorName: '城市书签', authorAvatar: '城', time: '2 小时前', text: '完成隐藏书签任务。', place: 'State Library', likes: 5, comments: 2 },
    { id: 'moment-me-2', authorId: 'me', authorName: '城市书签', authorAvatar: '城', time: '1 天前', text: '试了新的手冲配方。', place: 'Fitzroy', likes: 9, comments: 4 }
  ],
  connectionRequests: [
    { id: 'request-nightphoto', name: '慢半拍摄影', avatar: '镜', source: '今晚摄影散步活动', interest: '摄影 / 展览' }
  ],
  merchantTaps: [],
  merchantOrders: [],
  itemReviews: [],
  safetyReports: [],
  blockedUsers: [],
  safetyEvents: [],
  profileSettings: {},
  worlds: [
    {
      id: 'world_public_coffee',
      ownerId: 'system',
      name: '巷口咖啡星图',
      description: '把每一次真实到场留下的咖啡香气，变成可以共同点亮的城市星图。',
      placeId: 'coffee',
      visibility: 'onsite',
      status: 'published',
      theme: 'coffeeIsland',
      coverKey: 'world_library_cover',
      allowCollaboration: true,
      collaborators: [],
      inviteCode: 'COFFEE42',
      visitCount: 42,
      favoriteCount: 18,
      objects: [
        {
          id: 'asset_coffee_light',
          name: '咖啡星灯',
          kind: 'light',
          glyph: '光',
          primaryColor: '#E29B58',
          secondaryColor: '#FFF2D8',
          imageUrl: '',
          prompt: '一盏像咖啡香气一样旋转的城市星灯',
          generationMode: 'seed',
          x: 54,
          y: 34,
          width: 18,
          height: 22,
          scale: 1,
          rotation: 0,
          zIndex: 2,
          locked: false,
          createdBy: 'system',
          createdAt: '2026-06-01T10:00:00.000Z'
        },
        {
          id: 'asset_coffee_table',
          name: '共饮长桌',
          kind: 'furniture',
          glyph: '桌',
          primaryColor: '#77573E',
          secondaryColor: '#F5E6D3',
          imageUrl: '',
          prompt: '',
          generationMode: 'catalog',
          x: 28,
          y: 68,
          width: 28,
          height: 16,
          scale: 1,
          rotation: -8,
          zIndex: 1,
          locked: false,
          createdBy: 'system',
          createdAt: '2026-06-01T10:00:00.000Z'
        }
      ],
      activity: [
        {
          id: 'world_event_seed',
          type: 'published',
          actorId: 'system',
          message: '世界已在 Market Lane Coffee 发布',
          createdAt: '2026-06-01T10:00:00.000Z'
        }
      ],
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
      publishedAt: '2026-06-01T10:00:00.000Z'
    }
  ],
  users: {
    'demo-user-city-bookmark': {
      attendanceCount: 7,
      repeatPlaces: ['library', 'coffee'],
      graphDiversity: 0.76,
      reviewStability: 0.82
    }
  }
};

// 可插拔持久层:未配置 SMALLWORLD_DATABASE_URL 时用本地 JSON 文件;
// 配置后自动切换到华为云 GaussDB/RDS(见 src/shared/store.js)。
const store = createStore({
  databaseUrl: process.env.SMALLWORLD_DATABASE_URL,
  dataFile: DATA_FILE,
  seed
});

function readData() {
  let data = store.readRaw();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    data = JSON.parse(JSON.stringify(seed));
  }
  data.places = Array.isArray(data.places) ? data.places.map(place => {
    const exploreDefaults = EXPLORE_PLACE_DEFAULTS[place.id] || {};
    return {
      ...exploreDefaults,
      ...place,
      activities: Array.isArray(place.activities) ? place.activities : (exploreDefaults.activities || [])
    };
  }) : [];
  data.nfcSessions = Array.isArray(data.nfcSessions) ? data.nfcSessions : [];
  data.touchProofs = Array.isArray(data.touchProofs) ? data.touchProofs : [];
  data.reviews = Array.isArray(data.reviews) ? data.reviews : [];
  data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
  data.authSessions = Array.isArray(data.authSessions) ? data.authSessions : [];
  data.authSessions = data.authSessions.filter(item => Date.parse(item.expiresAt) > Date.now());
  data.placeRoomSessions = Array.isArray(data.placeRoomSessions) ? data.placeRoomSessions : [];
  data.placeRoomSessions = data.placeRoomSessions.filter(item => {
    return item.status === 'active' && Date.parse(item.expiresAt) > Date.now();
  });
  data.placePosts = Array.isArray(data.placePosts) && data.placePosts.length > 0 ?
    data.placePosts :
    JSON.parse(JSON.stringify(seed.placePosts));
  data.competitionResults = Array.isArray(data.competitionResults) ? data.competitionResults : [];
  data.userMedals = Array.isArray(data.userMedals) ? data.userMedals : [];
  data.friends = Array.isArray(data.friends) && data.friends.length > 0 ?
    data.friends :
    JSON.parse(JSON.stringify(seed.friends));
  data.chats = Array.isArray(data.chats) && data.chats.length > 0 ?
    data.chats :
    JSON.parse(JSON.stringify(seed.chats));
  data.chatMessages = Array.isArray(data.chatMessages) ?
    data.chatMessages :
    JSON.parse(JSON.stringify(seed.chatMessages));
  data.moments = Array.isArray(data.moments) ?
    data.moments :
    JSON.parse(JSON.stringify(seed.moments));
  data.myMoments = Array.isArray(data.myMoments) ?
    data.myMoments :
    JSON.parse(JSON.stringify(seed.myMoments));
  data.connectionRequests = Array.isArray(data.connectionRequests) ?
    data.connectionRequests :
    JSON.parse(JSON.stringify(seed.connectionRequests));
  data.merchantTaps = Array.isArray(data.merchantTaps) ? data.merchantTaps : [];
  data.merchantOrders = Array.isArray(data.merchantOrders) ? data.merchantOrders : [];
  data.itemReviews = Array.isArray(data.itemReviews) ? data.itemReviews : [];
  data.safetyReports = Array.isArray(data.safetyReports) ? data.safetyReports : [];
  data.blockedUsers = Array.isArray(data.blockedUsers) ? data.blockedUsers : [];
  data.safetyEvents = Array.isArray(data.safetyEvents) ? data.safetyEvents : [];
  data.profileSettings = data.profileSettings && typeof data.profileSettings === 'object' ?
    data.profileSettings :
    {};
  data.worlds = Array.isArray(data.worlds) && data.worlds.length > 0 ?
    data.worlds :
    JSON.parse(JSON.stringify(seed.worlds));
  data.worlds = data.worlds.map(world => ({
    ...world,
    objects: Array.isArray(world.objects) ? world.objects : [],
    collaborators: Array.isArray(world.collaborators) ? world.collaborators : [],
    activity: Array.isArray(world.activity) ? world.activity : []
  }));
  data.users = data.users && typeof data.users === 'object' ? data.users : {};
  return data;
}

function writeData(data) {
  store.writeRaw(data);
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Place-Room-Token',
    'Access-Control-Max-Age': '86400'
  });
  if (status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(body));
}

function deferredFeature(feature, message) {
  return {
    error: `${feature}_BACKEND_DEFERRED`,
    message,
    deferred: true
  };
}

function moduleStatus() {
  return {
    service: 'MicroWorld backend',
    version: SERVICE_VERSION,
    storage: {
      mode: store.kind,
      dataFile: store.kind === 'json-file' ? DATA_FILE : undefined,
      databaseConfigured: store.kind !== 'json-file'
    },
    cloudTarget: {
      primary: 'Huawei Cloud',
      database: 'Huawei Cloud GaussDB(openGauss) / RDS for PostgreSQL',
      note: '未配置 SMALLWORLD_DATABASE_URL 时用本地 JSON 文件持久化;配置后自动切换到华为云 GaussDB/RDS 存储登录注册与业务数据。'
    },
    frontendContract: {
      source: 'entry/src/main/ets/pages/Index.ets',
      bottomTabs: ['探索', '兴趣', '世界', '聊天', '我'],
      note: '实景已合并进世界页；AI 导游、兴趣 AI 助手后端按当前版本要求保持占位。'
    },
    activeModules: [
      { key: 'explore', name: '探索地点、活动、评分与路线', status: 'active' },
      { key: 'interestClub', name: '兴趣检索、学习方法与俱乐部', status: 'active' },
      { key: 'socialChat', name: '朋友与一对一聊天', status: 'active' },
      { key: 'profile', name: '我的页面、个人资料与设置', status: 'active' },
      { key: 'auth', name: '登录注册与会话', status: 'active' },
      { key: 'place', name: '地点详情、活动比赛、排行榜与奖牌', status: 'active' },
      { key: 'placeRoom', name: '地点页公共聊天与分享', status: 'active' },
      { key: 'world', name: '世界模块后端', status: 'active' },
      { key: 'nfcProof', name: '手机碰一碰 proof', status: 'active' },
      { key: 'reviewRating', name: '真实评价与五维评分', status: 'active' },
      { key: 'merchantTap', name: '商家碰一碰消费评价', status: 'active' },
      { key: 'safety', name: '举报、拉黑、安全按钮与审计', status: 'active' }
    ],
    deferredModules: [
      { key: 'aiGuide', name: 'AI 线下导游', status: 'deferred', endpoint: '/api/explore/ai-route' },
      { key: 'interestAi', name: '兴趣 AI 助手', status: 'deferred', endpoint: '/api/interests/ai-assistant' }
    ]
  };
}

function frontendContract() {
  return {
    source: 'entry/src/main/ets/pages/Index.ets',
    appName: 'MicroWorld',
    bottomTabs: [
      { key: 'explore', label: '探索', backend: ['GET /api/explore/places', 'GET /api/places/:placeId', 'POST /api/explore/route-plan'] },
      { key: 'interest', label: '兴趣', backend: ['GET /api/interests', 'GET /api/interests/:interestId', 'GET /api/clubs/:clubId'] },
      { key: 'world', label: '世界', backend: ['GET /api/worlds', 'POST /api/worlds', 'POST /api/worlds/:worldId/assets'] },
      { key: 'chat', label: '聊天', backend: ['GET /api/social/home', 'GET/POST /api/chats/:chatId/messages'] },
      { key: 'me', label: '我', backend: ['GET /api/me/profile', 'GET /api/me/:feature', 'POST /api/me/settings'] }
    ],
    authFlow: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/profile', 'GET /api/auth/me'],
    placeOnlyPublicRoom: [
      'POST /api/places/:placeId/room/open',
      'GET /api/places/:placeId/room/feed',
      'POST /api/places/:placeId/room/messages',
      'POST /api/places/:placeId/room/shares'
    ],
    nfcReviewFlow: [
      'POST /api/nfc/sessions',
      'POST /api/nfc/sessions/confirm',
      'GET /api/nfc/sessions/:sessionId',
      'POST /api/reviews/nfc'
    ],
    deferred: [
      { key: 'aiGuide', endpoint: '/api/explore/ai-route' },
      { key: 'interestAi', endpoint: '/api/interests/ai-assistant' }
    ]
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function bearerToken(req) {
  const value = String(req.headers.authorization || '');
  if (!value.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return value.slice(7).trim();
}

function authenticate(data, req) {
  const token = bearerToken(req);
  if (!token) {
    return null;
  }
  const tokenHash = hashValue(token);
  const session = data.authSessions.find(item => item.tokenHash === tokenHash);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }
  const account = data.accounts.find(item => item.id === session.userId);
  if (!account) {
    return null;
  }
  session.lastSeenAt = new Date().toISOString();
  return { account, session, tokenHash };
}

function pickPlace(data, placeId) {
  return placeService.pickPlace(data, placeId);
}

function placeActivity(place, activityId) {
  return placeService.placeActivity(place, activityId);
}

function placeUserMetrics(data, placeId, userId) {
  return placeService.placeUserMetrics(data, placeId, userId);
}

function placeLeaderboard(data, place, account) {
  return placeService.placeLeaderboard(data, place, account);
}

function medalProgress(data, place, account, medal) {
  return placeService.medalProgress(data, place, account, medal);
}

function publicPlaceMedals(data, place, account) {
  return placeService.publicPlaceMedals(data, place, account);
}

function placeRecognition(data, place, account) {
  return placeService.placeRecognition(data, place, account);
}

function claimPlaceMedal(data, place, account, medalId) {
  return placeService.claimPlaceMedal(data, place, account, medalId, {
    createId: id,
    persist: writeData
  });
}

function authenticatePlaceRoom(data, req, placeId, account) {
  return placeRoomService.authenticatePlaceRoom(data, req, placeId, account, {
    hashValue
  });
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function worldRole(world, userId) {
  if (world.ownerId === userId) {
    return 'owner';
  }
  if (world.collaborators.some(member => member.userId === userId && member.status === 'active')) {
    return 'collaborator';
  }
  return 'visitor';
}

function canEditWorld(world, userId) {
  const role = worldRole(world, userId);
  return role === 'owner' || (role === 'collaborator' && world.allowCollaboration === true);
}

function worldPlace(data, world) {
  return pickPlace(data, world.placeId);
}

function isAtWorldPlace(data, world, latitude, longitude) {
  const place = worldPlace(data, world);
  if (!place || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return false;
  }
  return geoDistanceMeters(
    Number(latitude),
    Number(longitude),
    Number(place.latitude),
    Number(place.longitude)
  ) <= 250;
}

function canViewWorld(data, world, account, access) {
  const role = worldRole(world, account.id);
  if (role !== 'visitor') {
    return true;
  }
  if (world.status !== 'published') {
    return false;
  }
  if (world.visibility === 'public') {
    return true;
  }
  if (world.visibility === 'onsite') {
    return isAtWorldPlace(data, world, access.latitude, access.longitude);
  }
  if (world.visibility === 'invite') {
    return String(access.inviteCode || '').toUpperCase() === String(world.inviteCode || '').toUpperCase();
  }
  return false;
}

function worldAssetPositionX(asset) {
  return asset.positionX === undefined ? (Number(asset.x || 50) - 50) / 7 : Number(asset.positionX);
}

function worldAssetPositionY(asset) {
  return asset.positionY === undefined ? 0 : Number(asset.positionY);
}

function worldAssetPositionZ(asset) {
  return asset.positionZ === undefined ? (Number(asset.y || 50) - 50) / 7 : Number(asset.positionZ);
}

function publicWorldAsset(asset) {
  const scale = Number(asset.scale === undefined ? 1 : asset.scale);
  const rotation = Number(asset.rotation === undefined ? 0 : asset.rotation);
  return {
    ...asset,
    positionX: worldAssetPositionX(asset),
    positionY: worldAssetPositionY(asset),
    positionZ: worldAssetPositionZ(asset),
    rotationX: Number(asset.rotationX === undefined ? 0 : asset.rotationX),
    rotationY: Number(asset.rotationY === undefined ? rotation : asset.rotationY),
    rotationZ: Number(asset.rotationZ === undefined ? 0 : asset.rotationZ),
    scaleX: Number(asset.scaleX === undefined ? scale : asset.scaleX),
    scaleY: Number(asset.scaleY === undefined ? scale : asset.scaleY),
    scaleZ: Number(asset.scaleZ === undefined ? scale : asset.scaleZ),
    shape: String(asset.shape || (asset.kind === 'nature' || asset.kind === 'decor' ? 'organic' : 'architectural'))
  };
}

function publicWorld(data, world, account, origin) {
  const place = worldPlace(data, world);
  const role = worldRole(world, account.id);
  const distanceMeters = place && origin ?
    geoDistanceMeters(origin.latitude, origin.longitude, place.latitude, place.longitude) :
    0;
  return {
    ...world,
    objects: world.objects.map(publicWorldAsset),
    place: place ? {
      id: place.id,
      name: place.name,
      shortName: place.shortName,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      distance: distanceMeters > 0 ? formatDistance(distanceMeters) : place.distance
    } : null,
    role,
    canEdit: canEditWorld(world, account.id),
    objectCount: world.objects.length,
    collaboratorCount: world.collaborators.filter(member => member.status === 'active').length,
    distanceMeters
  };
}

function defaultWorldAsset(catalogId, ownerId, x, y) {
  const source = WORLD_ASSET_LIBRARY[catalogId] || WORLD_ASSET_LIBRARY.bookmarkLight;
  return {
    id: id('world_asset'),
    catalogId,
    ...source,
    imageUrl: '',
    prompt: '',
    generationMode: 'catalog',
    x,
    y,
    scale: 1,
    rotation: 0,
    positionX: (x - 50) / 7,
    positionY: 0,
    positionZ: (y - 50) / 7,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    shape: source.kind === 'nature' || source.kind === 'decor' ? 'organic' : 'architectural',
    zIndex: 1,
    locked: false,
    createdBy: ownerId,
    createdAt: new Date().toISOString()
  };
}

function ensureStarterWorld(data, account) {
  const owned = data.worlds.find(world => world.ownerId === account.id);
  if (owned) {
    return false;
  }
  const now = new Date().toISOString();
  data.worlds.push({
    id: id('world'),
    ownerId: account.id,
    name: '我的图书馆庭院',
    description: '一个绑定 State Library 的私有创作空间。到达真实地点后，可以把记忆、任务和 AI 物件放进这里。',
    placeId: 'library',
    visibility: 'private',
    status: 'draft',
    theme: 'memoryGarden',
    coverKey: 'world_library_cover',
    allowCollaboration: false,
    collaborators: [],
    inviteCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    visitCount: 0,
    favoriteCount: 0,
    objects: [
      defaultWorldAsset('memoryTree', account.id, 52, 28),
      defaultWorldAsset('readingTable', account.id, 24, 65),
      defaultWorldAsset('bookmarkLight', account.id, 76, 62)
    ],
    activity: [
      {
        id: id('world_event'),
        type: 'created',
        actorId: account.id,
        message: '创建了绑定 State Library 的私有世界',
        createdAt: now
      }
    ],
    createdAt: now,
    updatedAt: now,
    publishedAt: ''
  });
  writeData(data);
  return true;
}

function listWorlds(data, account, searchParams) {
  ensureStarterWorld(data, account);
  const scope = String(searchParams.get('scope') || 'mine');
  const latitude = Number(searchParams.get('latitude'));
  const longitude = Number(searchParams.get('longitude'));
  const origin = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  let worlds = data.worlds.filter(world => {
    const role = worldRole(world, account.id);
    if (scope === 'mine') {
      return role === 'owner';
    }
    if (scope === 'collaborating') {
      return role === 'collaborator';
    }
    if (scope === 'nearby') {
      return world.status === 'published' &&
        world.visibility !== 'private' &&
        world.visibility !== 'invite' &&
        role === 'visitor';
    }
    return role !== 'visitor' || world.visibility === 'public';
  });
  worlds = worlds.map(world => publicWorld(data, world, account, origin));
  if (scope === 'nearby' && origin) {
    worlds.sort((left, right) => left.distanceMeters - right.distanceMeters);
  } else {
    worlds.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }
  return worlds;
}

function createWorld(data, account, body) {
  const name = String(body.name || '').trim();
  const place = pickPlace(data, body.placeId);
  const visibility = String(body.visibility || 'private');
  const theme = String(body.theme || 'memoryGarden');
  if (name.length < 2 || name.length > 36) {
    return { status: 400, body: { error: 'INVALID_WORLD_NAME', message: '世界名称需要 2-36 个字符' } };
  }
  if (!place) {
    return { status: 404, body: { error: 'PLACE_NOT_FOUND', message: '绑定地点不存在' } };
  }
  if (!WORLD_VISIBILITIES.includes(visibility) || !WORLD_THEMES.includes(theme)) {
    return { status: 400, body: { error: 'INVALID_WORLD_OPTIONS', message: '世界主题或可见范围无效' } };
  }
  const now = new Date().toISOString();
  const world = {
    id: id('world'),
    ownerId: account.id,
    name,
    description: String(body.description || '').trim().slice(0, 240),
    placeId: place.id,
    visibility,
    status: 'draft',
    theme,
    coverKey: 'world_library_cover',
    allowCollaboration: body.allowCollaboration === true,
    collaborators: [],
    inviteCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    visitCount: 0,
    favoriteCount: 0,
    objects: [],
    activity: [
      {
        id: id('world_event'),
        type: 'created',
        actorId: account.id,
        message: `创建了绑定 ${place.shortName} 的私有世界`,
        createdAt: now
      }
    ],
    createdAt: now,
    updatedAt: now,
    publishedAt: ''
  };
  data.worlds.push(world);
  writeData(data);
  return { status: 201, body: { message: '私有世界已创建', world: publicWorld(data, world, account, null) } };
}

function updateWorld(data, world, account, body) {
  if (world.ownerId !== account.id) {
    return { status: 403, body: { error: 'OWNER_REQUIRED', message: '只有世界主人可以修改世界设置' } };
  }
  const name = String(body.name === undefined ? world.name : body.name).trim();
  const visibility = String(body.visibility === undefined ? world.visibility : body.visibility);
  const theme = String(body.theme === undefined ? world.theme : body.theme);
  if (name.length < 2 || name.length > 36 ||
      !WORLD_VISIBILITIES.includes(visibility) ||
      !WORLD_THEMES.includes(theme)) {
    return { status: 400, body: { error: 'INVALID_WORLD_OPTIONS', message: '世界设置无效' } };
  }
  world.name = name;
  world.description = String(body.description === undefined ? world.description : body.description).trim().slice(0, 240);
  world.visibility = visibility;
  world.theme = theme;
  world.allowCollaboration = body.allowCollaboration === undefined ?
    world.allowCollaboration :
    body.allowCollaboration === true;
  world.updatedAt = new Date().toISOString();
  writeData(data);
  return { status: 200, body: { message: '世界设置已保存', world: publicWorld(data, world, account, null) } };
}

function addWorldAsset(data, world, account, body) {
  if (!canEditWorld(world, account.id)) {
    return { status: 403, body: { error: 'WORLD_EDIT_DENIED', message: '你没有这个世界的建设权限' } };
  }
  const catalogId = String(body.catalogId || '');
  if (!WORLD_ASSET_LIBRARY[catalogId]) {
    return { status: 400, body: { error: 'ASSET_NOT_FOUND', message: '物件模板不存在' } };
  }
  const asset = defaultWorldAsset(
    catalogId,
    account.id,
    clamp(body.x === undefined ? 50 : body.x, 4, 92),
    clamp(body.y === undefined ? 50 : body.y, 8, 88)
  );
  asset.positionX = clamp(body.positionX === undefined ? asset.positionX : body.positionX, -6.3, 6.3);
  asset.positionY = clamp(body.positionY === undefined ? 0 : body.positionY, 0, 5);
  asset.positionZ = clamp(body.positionZ === undefined ? asset.positionZ : body.positionZ, -6.3, 6.3);
  asset.x = clamp(50 + asset.positionX * 7, 4, 92);
  asset.y = clamp(50 + asset.positionZ * 7, 8, 88);
  asset.zIndex = world.objects.length + 1;
  world.objects.push(asset);
  world.updatedAt = new Date().toISOString();
  world.activity.unshift({
    id: id('world_event'),
    type: 'asset_added',
    actorId: account.id,
    message: `放置了${asset.name}`,
    createdAt: world.updatedAt
  });
  writeData(data);
  return { status: 201, body: { message: '物件已放入世界', asset, world: publicWorld(data, world, account, null) } };
}

function updateWorldAsset(data, world, asset, account, body) {
  if (!canEditWorld(world, account.id)) {
    return { status: 403, body: { error: 'WORLD_EDIT_DENIED', message: '你没有这个世界的建设权限' } };
  }
  asset.name = String(body.name === undefined ? asset.name : body.name).trim().slice(0, 32) || asset.name;
  asset.x = clamp(body.x === undefined ? asset.x : body.x, 2, 94);
  asset.y = clamp(body.y === undefined ? asset.y : body.y, 4, 90);
  asset.scale = clamp(body.scale === undefined ? asset.scale : body.scale, 0.5, 2);
  asset.rotation = clamp(body.rotation === undefined ? asset.rotation : body.rotation, -180, 180);
  asset.positionX = clamp(body.positionX === undefined ? worldAssetPositionX(asset) : body.positionX, -6.3, 6.3);
  asset.positionY = clamp(body.positionY === undefined ? worldAssetPositionY(asset) : body.positionY, 0, 5);
  asset.positionZ = clamp(body.positionZ === undefined ? worldAssetPositionZ(asset) : body.positionZ, -6.3, 6.3);
  asset.rotationX = clamp(body.rotationX === undefined ? Number(asset.rotationX || 0) : body.rotationX, -180, 180);
  asset.rotationY = clamp(body.rotationY === undefined ? Number(asset.rotationY === undefined ? asset.rotation : asset.rotationY) : body.rotationY, -180, 180);
  asset.rotationZ = clamp(body.rotationZ === undefined ? Number(asset.rotationZ || 0) : body.rotationZ, -180, 180);
  asset.scaleX = clamp(body.scaleX === undefined ? Number(asset.scaleX === undefined ? asset.scale : asset.scaleX) : body.scaleX, 0.45, 2.5);
  asset.scaleY = clamp(body.scaleY === undefined ? Number(asset.scaleY === undefined ? asset.scale : asset.scaleY) : body.scaleY, 0.45, 2.5);
  asset.scaleZ = clamp(body.scaleZ === undefined ? Number(asset.scaleZ === undefined ? asset.scale : asset.scaleZ) : body.scaleZ, 0.45, 2.5);
  asset.x = clamp(50 + asset.positionX * 7, 4, 92);
  asset.y = clamp(50 + asset.positionZ * 7, 8, 88);
  asset.scale = asset.scaleX;
  asset.rotation = asset.rotationY;
  asset.zIndex = Math.round(clamp(body.zIndex === undefined ? asset.zIndex : body.zIndex, 0, 999));
  asset.locked = body.locked === undefined ? asset.locked : body.locked === true;
  world.updatedAt = new Date().toISOString();
  writeData(data);
  return { status: 200, body: { message: '物件位置已保存', asset, world: publicWorld(data, world, account, null) } };
}

function deleteWorldAsset(data, world, assetId, account) {
  if (!canEditWorld(world, account.id)) {
    return { status: 403, body: { error: 'WORLD_EDIT_DENIED', message: '你没有这个世界的建设权限' } };
  }
  const before = world.objects.length;
  world.objects = world.objects.filter(asset => asset.id !== assetId);
  if (world.objects.length === before) {
    return { status: 404, body: { error: 'ASSET_NOT_FOUND', message: '物件不存在' } };
  }
  world.updatedAt = new Date().toISOString();
  writeData(data);
  return { status: 200, body: { message: '物件已移除', world: publicWorld(data, world, account, null) } };
}

function promptVisual(prompt, style, kind) {
  const hash = crypto.createHash('sha256').update(`${prompt}|${style}|${kind}`).digest();
  const palettes = [
    ['#2E7D62', '#DDF3EA'],
    ['#2B7C8A', '#DDF5F7'],
    ['#D08A47', '#FFF0D8'],
    ['#596D8B', '#E8EDF5'],
    ['#806A4C', '#F2E8D8']
  ];
  const glyphs = {
    nature: '树',
    furniture: '桌',
    light: '光',
    portal: '门',
    memory: '忆',
    decor: '景'
  };
  const palette = palettes[hash[0] % palettes.length];
  return {
    imageUrl: '',
    primaryColor: palette[0],
    secondaryColor: palette[1],
    glyph: glyphs[kind] || '物',
    generationMode: 'procedural-preview',
    provider: 'MicroWorld AI Preview'
  };
}

async function generateWorldAssetVisual(prompt, style, kind) {
  const apiUrl = String(process.env.SMALLWORLD_IMAGE_API_URL || '').trim();
  const apiKey = String(process.env.SMALLWORLD_IMAGE_API_KEY || '').trim();
  if (!apiUrl || !apiKey) {
    return promptVisual(prompt, style, kind);
  }
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.SMALLWORLD_IMAGE_MODEL || 'image-generation',
        prompt: `Create one isolated game-building object for a premium mobile virtual world. ${prompt}. Style: ${style}. No text, no logo, centered square composition.`,
        size: '1024x1024',
        n: 1,
        response_format: 'url'
      })
    });
    if (!response.ok) {
      return promptVisual(prompt, style, kind);
    }
    const result = await response.json();
    const imageUrl = result && result.data && result.data[0] ? String(result.data[0].url || '') : '';
    if (!imageUrl) {
      return promptVisual(prompt, style, kind);
    }
    return {
      ...promptVisual(prompt, style, kind),
      imageUrl,
      generationMode: 'ai-image',
      provider: process.env.SMALLWORLD_IMAGE_PROVIDER || 'OpenAI-compatible'
    };
  } catch (error) {
    console.error('AI image provider failed:', error.message);
    return promptVisual(prompt, style, kind);
  }
}

async function generateWorldAsset(data, world, account, body) {
  if (!canEditWorld(world, account.id)) {
    return { status: 403, body: { error: 'WORLD_EDIT_DENIED', message: '你没有这个世界的建设权限' } };
  }
  const prompt = String(body.prompt || '').trim().slice(0, 300);
  const style = String(body.style || '城市微缩').trim().slice(0, 40);
  const allowedKinds = ['nature', 'furniture', 'light', 'portal', 'memory', 'decor'];
  const kind = allowedKinds.includes(String(body.kind)) ? String(body.kind) : 'decor';
  if (prompt.length < 3) {
    return { status: 400, body: { error: 'PROMPT_REQUIRED', message: '请描述你想创造的物件' } };
  }
  const visual = await generateWorldAssetVisual(prompt, style, kind);
  const now = new Date().toISOString();
  const asset = {
    id: id('world_asset'),
    name: String(body.name || prompt.slice(0, 12)).trim().slice(0, 32),
    kind,
    glyph: visual.glyph,
    primaryColor: visual.primaryColor,
    secondaryColor: visual.secondaryColor,
    imageUrl: visual.imageUrl,
    prompt,
    style,
    generationMode: visual.generationMode,
    provider: visual.provider,
    x: clamp(body.x === undefined ? 50 : body.x, 4, 92),
    y: clamp(body.y === undefined ? 48 : body.y, 8, 88),
    width: 20,
    height: 22,
    scale: 1,
    rotation: 0,
    positionX: clamp(body.positionX === undefined ? 0 : body.positionX, -6.3, 6.3),
    positionY: clamp(body.positionY === undefined ? 0 : body.positionY, 0, 5),
    positionZ: clamp(body.positionZ === undefined ? -0.4 : body.positionZ, -6.3, 6.3),
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    shape: kind === 'nature' || kind === 'decor' ? 'organic' : 'architectural',
    zIndex: world.objects.length + 1,
    locked: false,
    createdBy: account.id,
    createdAt: now
  };
  asset.x = clamp(50 + asset.positionX * 7, 4, 92);
  asset.y = clamp(50 + asset.positionZ * 7, 8, 88);
  world.objects.push(asset);
  world.updatedAt = now;
  world.activity.unshift({
    id: id('world_event'),
    type: 'ai_asset_generated',
    actorId: account.id,
    message: `用 AI 创造了${asset.name}`,
    createdAt: now
  });
  writeData(data);
  return {
    status: 201,
    body: {
      message: visual.generationMode === 'ai-image' ? 'AI 图像物件已生成并放入世界' : '已生成可编辑预览物件，可配置外部图像服务获得完整 AI 图片',
      asset,
      world: publicWorld(data, world, account, null)
    }
  };
}

function publishWorld(data, world, account) {
  if (world.ownerId !== account.id) {
    return { status: 403, body: { error: 'OWNER_REQUIRED', message: '只有世界主人可以发布' } };
  }
  if (world.objects.length === 0) {
    return { status: 400, body: { error: 'WORLD_EMPTY', message: '至少放置一个物件后才能发布' } };
  }
  const now = new Date().toISOString();
  world.status = 'published';
  if (world.visibility === 'private') {
    world.visibility = 'onsite';
  }
  world.publishedAt = now;
  world.updatedAt = now;
  world.activity.unshift({
    id: id('world_event'),
    type: 'published',
    actorId: account.id,
    message: '发布了这个真实地点上的小世界',
    createdAt: now
  });
  writeData(data);
  return { status: 200, body: { message: '世界已发布，到场用户现在可以访问', world: publicWorld(data, world, account, null) } };
}

function addWorldCollaborator(data, world, account, body) {
  if (world.ownerId !== account.id) {
    return { status: 403, body: { error: 'OWNER_REQUIRED', message: '只有世界主人可以邀请共建者' } };
  }
  const email = authService.normalizeEmail(body.email);
  const collaborator = data.accounts.find(item => item.email === email && item.status === 'active');
  if (!collaborator) {
    return { status: 404, body: { error: 'USER_NOT_FOUND', message: '没有找到这个 MicroWorld 用户' } };
  }
  if (collaborator.id === account.id) {
    return { status: 409, body: { error: 'OWNER_ALREADY_MEMBER', message: '你已经是世界主人' } };
  }
  const existing = world.collaborators.find(member => member.userId === collaborator.id);
  if (existing) {
    existing.status = 'active';
  } else {
    world.collaborators.push({
      userId: collaborator.id,
      displayName: collaborator.displayName,
      role: 'builder',
      status: 'active',
      joinedAt: new Date().toISOString()
    });
  }
  world.allowCollaboration = true;
  world.updatedAt = new Date().toISOString();
  writeData(data);
  return { status: 200, body: { message: '共建者已加入', world: publicWorld(data, world, account, null) } };
}

function visitWorld(data, world, account, body) {
  if (!canViewWorld(data, world, account, body)) {
    return {
      status: 403,
      body: {
        error: 'WORLD_ACCESS_DENIED',
        message: world.visibility === 'onsite' ? '需要到达绑定地点 250 米范围内才能进入' : '这个世界需要邀请或主人授权'
      }
    };
  }
  world.visitCount = Number(world.visitCount || 0) + 1;
  world.updatedAt = new Date().toISOString();
  writeData(data);
  return { status: 200, body: { message: '已进入小世界', world: publicWorld(data, world, account, null) } };
}

function geoDistanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  return exploreService.geoDistanceMeters(latitudeA, longitudeA, latitudeB, longitudeB);
}

function formatDistance(distanceMeters) {
  return exploreService.formatDistance(distanceMeters);
}

function enrichPlace(data, place, origin) {
  return exploreService.enrichPlace(data, place, origin);
}

function buildRoutePlan(data, body) {
  return exploreService.buildRoutePlan(data, body);
}

function buildAiRoute(data, account, body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const interests = Array.isArray(body.interests) && body.interests.length > 0 ?
    body.interests.map(value => String(value)) :
    (account && Array.isArray(account.interests) ? account.interests : []);
  const mode = String(body.mode || '轻社交');
  const durationMinutes = Math.max(45, Math.min(240, Number(body.durationMinutes || 90)));
  const origin = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  const places = data.places.map(place => enrichPlace(data, place, origin));

  places.sort((left, right) => {
    const interestScore = place => place.tags.filter(tag => interests.includes(tag)).length * 30;
    const modeScore = place => {
      if (mode === '安静探索') return place.rating.comfort + place.rating.safety;
      if (mode === '活动优先') return place.rating.activity + (place.activities || []).length * 8;
      if (mode === 'AR 优先') return place.ar ? 120 : 0;
      return place.rating.match + place.rating.comfort;
    };
    const distancePenalty = place => Number(place.distanceMeters || 0) / 250;
    return (interestScore(right) + modeScore(right) - distancePenalty(right)) -
      (interestScore(left) + modeScore(left) - distancePenalty(left));
  });

  const stopCount = durationMinutes >= 150 ? 3 : durationMinutes >= 80 ? 2 : 1;
  const route = places.slice(0, stopCount);
  return {
    title: mode === '安静探索' ? '低压力城市漫游' : mode === '活动优先' ? '今晚活动路线' : '同频兴趣路线',
    mode,
    durationMinutes,
    reason: interests.length > 0 ?
      `根据你的 ${interests.slice(0, 3).join('、')} 兴趣和当前距离生成` :
      '根据地点社交质量、当前距离和活动时间生成',
    route
  };
}

function secureToken() {
  return crypto.randomBytes(24).toString('base64url');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, {
        ok: true,
        service: 'MicroWorld backend',
        version: SERVICE_VERSION,
        uptimeSeconds: Math.round(process.uptime()),
        dataMode: store.kind
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/system/modules') {
      send(res, 200, moduleStatus());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/system/frontend-contract') {
      send(res, 200, frontendContract());
      return;
    }

    if (url.pathname === '/api/explore/ai-route') {
      send(res, 501, deferredFeature('AI_GUIDE', 'AI 导游后端本版本暂不接入，前端仅保留入口与占位提示'));
      return;
    }

    if (url.pathname === '/api/interests/ai-assistant' || url.pathname === '/api/interest-ai') {
      send(res, 501, deferredFeature('INTEREST_AI_ASSISTANT', '兴趣 AI 助手后端本版本暂不接入，兴趣检索、简介与俱乐部接口保持可用'));
      return;
    }


    if (await exploreRoutes.handleExploreRoutes({ req, res, url, send, readData, readBody })) {
      return;
    }

    if (await placeRoutes.handlePlaceRoutes({
      req,
      res,
      url,
      send,
      readData,
      authenticate,
      authenticatePlaceRoom,
      createId: id,
      persist: writeData
    })) {
      return;
    }

    if (await placeRoomRoutes.handlePlaceRoomRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      pickPlace,
      placeActivity,
      createId: id,
      secureToken,
      hashValue,
      persist: writeData
    })) {
      return;
    }

    if (await interestClubRoutes.handleInterestClubRoutes({
      req,
      res,
      url,
      send,
      readData
    })) {
      return;
    }

    if (await socialChatRoutes.handleSocialChatRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      createId: id,
      persist: writeData
    })) {
      return;
    }

    if (await profileRoutes.handleProfileRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      persist: writeData
    })) {
      return;
    }

    if (await nfcProofRoutes.handleNfcProofRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      pickPlace,
      createId: id,
      secureToken,
      persist: writeData
    })) {
      return;
    }

    if (await ratingRoutes.handleRatingRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      pickPlace,
      enrichPlace,
      createId: id,
      persist: writeData
    })) {
      return;
    }

    if (await merchantTapRoutes.handleMerchantTapRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      pickPlace,
      enrichPlace,
      createId: id,
      persist: writeData
    })) {
      return;
    }

    if (await safetyRoutes.handleSafetyRoutes({
      req,
      res,
      url,
      send,
      readData,
      readBody,
      authenticate,
      createId: id,
      persist: writeData
    })) {
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const data = readData();
      const body = await readBody(req);
      const result = authService.registerAccount(data, body);
      if (result.persist) {
        writeData(data);
      }
      send(res, result.status, result.body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      if (authService.loginRateLimited(req)) {
        send(res, 429, { error: 'TOO_MANY_ATTEMPTS', message: '登录尝试过于频繁，请一分钟后再试' });
        return;
      }
      const data = readData();
      const body = await readBody(req);
      const result = authService.loginAccount(data, body);
      if (result.persist) {
        writeData(data);
      }
      send(res, result.status, result.body);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const data = readData();
      const auth = authService.authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '登录状态已失效，请重新登录' });
        return;
      }
      writeData(data);
      send(res, 200, { user: authService.publicAccount(auth.account) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/profile') {
      const data = readData();
      const auth = authService.authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const body = await readBody(req);
      const result = authService.updateAccountProfile(data, auth.account, body);
      if (result.persist) {
        writeData(data);
      }
      send(res, result.status, result.body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const data = readData();
      const auth = authService.authenticate(data, req);
      if (auth) {
        if (authService.logout(data, auth.tokenHash)) {
          writeData(data);
        }
      }
      send(res, 200, { message: '已退出登录' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/explore/ai-route') {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '登录后才能生成个性化 AI 路线' });
        return;
      }
      const body = await readBody(req);
      send(res, 200, buildAiRoute(data, auth.account, body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/worlds') {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '登录后才能管理和访问小世界' });
        return;
      }
      const worlds = listWorlds(data, auth.account, url.searchParams);
      send(res, 200, {
        worlds,
        assetLibrary: Object.keys(WORLD_ASSET_LIBRARY).map(catalogId => ({
          catalogId,
          ...WORLD_ASSET_LIBRARY[catalogId]
        }))
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/worlds') {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '登录后才能创建小世界' });
        return;
      }
      const body = await readBody(req);
      const result = createWorld(data, auth.account, body);
      send(res, result.status, result.body);
      return;
    }

    const worldDetailMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)$/);
    if (req.method === 'GET' && worldDetailMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldDetailMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const access = {
        latitude: url.searchParams.get('latitude'),
        longitude: url.searchParams.get('longitude'),
        inviteCode: url.searchParams.get('inviteCode')
      };
      if (!canViewWorld(data, world, auth.account, access)) {
        send(res, 403, {
          error: 'WORLD_ACCESS_DENIED',
          message: world.visibility === 'onsite' ? '到达真实地点后才能进入这个小世界' : '这个小世界是私有空间'
        });
        return;
      }
      send(res, 200, { world: publicWorld(data, world, auth.account, null) });
      return;
    }

    const worldSettingsMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/settings$/);
    if (req.method === 'POST' && worldSettingsMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldSettingsMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = updateWorld(data, world, auth.account, await readBody(req));
      send(res, result.status, result.body);
      return;
    }

    const worldAssetsMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/assets$/);
    if (req.method === 'POST' && worldAssetsMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldAssetsMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = addWorldAsset(data, world, auth.account, await readBody(req));
      send(res, result.status, result.body);
      return;
    }

    const worldAiAssetMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/ai-assets$/);
    if (req.method === 'POST' && worldAiAssetMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldAiAssetMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = await generateWorldAsset(data, world, auth.account, await readBody(req));
      send(res, result.status, result.body);
      return;
    }

    const worldAssetUpdateMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/assets\/([^/]+)$/);
    if (req.method === 'POST' && worldAssetUpdateMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldAssetUpdateMatch[1]);
      const asset = world ? world.objects.find(item => item.id === worldAssetUpdateMatch[2]) : null;
      if (!world || !asset) {
        send(res, 404, { error: 'ASSET_NOT_FOUND', message: '世界或物件不存在' });
        return;
      }
      const result = updateWorldAsset(data, world, asset, auth.account, await readBody(req));
      send(res, result.status, result.body);
      return;
    }

    const worldAssetDeleteMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/assets\/([^/]+)\/delete$/);
    if (req.method === 'POST' && worldAssetDeleteMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldAssetDeleteMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = deleteWorldAsset(data, world, worldAssetDeleteMatch[2], auth.account);
      send(res, result.status, result.body);
      return;
    }

    const worldPublishMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/publish$/);
    if (req.method === 'POST' && worldPublishMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldPublishMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = publishWorld(data, world, auth.account);
      send(res, result.status, result.body);
      return;
    }

    const worldCollaboratorMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/collaborators$/);
    if (req.method === 'POST' && worldCollaboratorMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldCollaboratorMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = addWorldCollaborator(data, world, auth.account, await readBody(req));
      send(res, result.status, result.body);
      return;
    }

    const worldVisitMatch = url.pathname.match(/^\/api\/worlds\/([^/]+)\/visit$/);
    if (req.method === 'POST' && worldVisitMatch) {
      const data = readData();
      const auth = authenticate(data, req);
      if (!auth) {
        send(res, 401, { error: 'AUTH_REQUIRED', message: '请先登录' });
        return;
      }
      const world = data.worlds.find(item => item.id === worldVisitMatch[1]);
      if (!world) {
        send(res, 404, { error: 'WORLD_NOT_FOUND', message: '小世界不存在' });
        return;
      }
      const result = visitWorld(data, world, auth.account, await readBody(req));
      send(res, result.status, result.body);
      return;
    }

    send(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    send(res, 500, { error: 'SERVER_ERROR', message: error.message });
  }
});

async function startServer() {
  await store.init();
  server.listen(PORT, HOST, () => {
    console.log(`MicroWorld backend listening on http://${HOST}:${PORT}`);
    console.log(`MicroWorld storage: ${store.kind}${store.kind === 'json-file' ? ` (${DATA_FILE})` : ''}`);
  });
}

if (require.main === module) {
  startServer().catch(error => {
    console.error(`MicroWorld backend 启动失败: ${error.message}`);
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = async signal => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`MicroWorld backend received ${signal}, shutting down...`);
    // 兜底:即使 flush/close 卡住也强制退出。
    setTimeout(() => process.exit(0), 4000).unref();
    try {
      await store.flush();
      await store.close();
    } catch (error) {
      console.error(`MicroWorld backend 关闭时落库失败: ${error.message}`);
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = {
  server,
  startServer,
  moduleStatus,
  readData,
  writeData
};
