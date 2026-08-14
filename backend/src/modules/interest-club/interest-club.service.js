const placeService = require('../place/place.service');

const INTEREST_CATEGORIES = ['全部', '人文', '艺术', '运动', '技能', '城市', '桌面', '自然'];

const INTEREST_TOPICS = [
  {
    id: 'reading',
    name: '阅读',
    category: '人文',
    glyph: '书',
    summary: '从独自阅读到主题共读，用一本书建立低压力、可持续的线下交流。',
    beginnerLevel: '零基础友好',
    learningDuration: '每天 20 分钟',
    socialStyle: '安静社交',
    tags: ['读书', '小说', '非虚构', '共读', '写作'],
    learningSteps: ['选择一个真正好奇的主题', '建立每天 20 分钟固定阅读时间', '用三句话记录观点与疑问', '参加一次允许旁听的线下共读'],
    tools: ['一本纸质书或电子书', '便携笔记本', '主题书单'],
    clubIds: ['club-library-reading', 'club-city-essay'],
    placeIds: ['library']
  },
  {
    id: 'photography',
    name: '摄影',
    category: '艺术',
    glyph: '镜',
    summary: '用手机或相机记录城市光影，适合通过共同散步自然破冰。',
    beginnerLevel: '手机即可',
    learningDuration: '2 周入门',
    socialStyle: '城市散步',
    tags: ['街拍', '光影', '构图', '展览'],
    learningSteps: ['先练习三分法和对称构图', '选择一条熟悉街区做光影观察', '每次只分享一张照片', '参加不拍陌生人正脸的摄影散步'],
    tools: ['手机相机', '基础修图 App', '小型相册'],
    clubIds: ['club-slow-photo', 'club-laneway-light'],
    placeIds: ['coffee']
  },
  {
    id: 'boardgame',
    name: '桌游',
    category: '桌面',
    glyph: '骰',
    summary: '以规则和共同目标降低陌生社交压力，适合新人带局和小桌交流。',
    beginnerLevel: '新人友好',
    learningDuration: '一次活动入门',
    socialStyle: '规则破冰',
    tags: ['合作', '策略', '带局', '小桌'],
    learningSteps: ['从合作类或轻策略游戏开始', '优先选择有主理人带局的活动', '接受旁观学习', '每局结束做轻量复盘'],
    tools: ['入门桌游清单', '计分纸', '规则速查卡'],
    clubIds: ['club-carlton-boardgame'],
    placeIds: ['boardgame']
  },
  {
    id: 'coffee',
    name: '咖啡',
    category: '城市',
    glyph: '杯',
    summary: '从风味、器具和街区咖啡馆开始，用低压力的同桌品鉴建立线下连接。',
    beginnerLevel: '零基础友好',
    learningDuration: '1 周入门',
    socialStyle: '轻聊天',
    tags: ['咖啡', '手冲', '拉花', '风味'],
    learningSteps: ['先认识酸甜苦和香气', '尝试记录一杯咖啡的三个味道', '选择不拥挤的咖啡馆', '参与一次小杯测或咖啡地图任务'],
    tools: ['风味轮', '手冲壶', '咖啡笔记'],
    clubIds: ['club-market-cupping', 'club-coffee-map'],
    placeIds: ['coffee']
  },
  {
    id: 'music',
    name: '音乐',
    category: '艺术',
    glyph: '音',
    summary: '从歌单、现场小演出和轻量乐器体验开始，适合以共同作品自然交流。',
    beginnerLevel: '无需乐理',
    learningDuration: '2 周建立习惯',
    socialStyle: '现场共感',
    tags: ['音乐', '歌单', '现场', '乐器'],
    learningSteps: ['建立一个主题歌单', '记录三首想分享的歌', '去一次小型现场', '参加不强制表演的音乐交流'],
    tools: ['耳机', '歌单 App', '节拍器'],
    clubIds: ['club-laneway-listening'],
    placeIds: ['coffee']
  },
  {
    id: 'sports',
    name: '运动',
    category: '运动',
    glyph: '动',
    summary: '用散步、轻跑和低门槛运动建立稳定线下节奏，避免高压竞技。',
    beginnerLevel: '新人友好',
    learningDuration: '每天 15 分钟',
    socialStyle: '低压陪伴',
    tags: ['运动', '跑步', '散步', '拉伸'],
    learningSteps: ['从 15 分钟城市散步开始', '固定一条安全路线', '记录心情和体感', '参加一次低速同伴活动'],
    tools: ['舒适运动鞋', '水杯', '路线记录'],
    clubIds: ['club-gentle-run'],
    placeIds: ['library', 'coffee']
  },
  {
    id: 'art',
    name: '艺术',
    category: '艺术',
    glyph: '艺',
    summary: '通过展览、速写和作品观察进入创作，不需要一开始就表达很多。',
    beginnerLevel: '可旁观',
    learningDuration: '一次展览入门',
    socialStyle: '观察分享',
    tags: ['艺术', '展览', '速写', '美术馆'],
    learningSteps: ['选择一个小型展览', '只记录三件作品', '用颜色和情绪描述感受', '参加一次展览后轻讨论'],
    tools: ['速写本', '铅笔', '展览地图'],
    clubIds: ['club-small-gallery'],
    placeIds: ['library']
  },
  {
    id: 'film',
    name: '电影',
    category: '人文',
    glyph: '影',
    summary: '从同主题观影和短评开始，用作品而不是个人资料打开对话。',
    beginnerLevel: '零基础',
    learningDuration: '每周一部',
    socialStyle: '作品讨论',
    tags: ['电影', '观影', '影评', '城市影院'],
    learningSteps: ['选一个主题片单', '观影后写三句短评', '先听别人分享', '加入低压力观影会'],
    tools: ['片单', '短评卡片', '影院排期'],
    clubIds: ['club-soft-cinema'],
    placeIds: ['library']
  },
  {
    id: 'city-explore',
    name: '城市探索',
    category: '城市',
    glyph: '城',
    summary: '围绕街区、地标和隐藏故事建立探索路线，适合自然到场和结伴。',
    beginnerLevel: '手机即可',
    learningDuration: '周末半天',
    socialStyle: '路线同行',
    tags: ['城市探索', '地标', '散步', '地图'],
    learningSteps: ['选一条 2 公里以内路线', '找三个地标故事', '用照片或文字记录线索', '邀请一位同兴趣用户共同完成'],
    tools: ['地图', '相机', '舒适鞋'],
    clubIds: ['club-city-walk'],
    placeIds: ['library', 'coffee', 'boardgame']
  },
  {
    id: 'handcraft',
    name: '手作',
    category: '技能',
    glyph: '作',
    summary: '用可见成果降低聊天压力，从纸艺、拼贴和小物改造开始。',
    beginnerLevel: '零基础',
    learningDuration: '一次工作坊',
    socialStyle: '并肩创作',
    tags: ['手作', '拼贴', '纸艺', '工作坊'],
    learningSteps: ['从一个小成品开始', '准备可分享的材料', '并肩创作不强聊', '结束后交换作品故事'],
    tools: ['剪刀', '贴纸', '素材纸'],
    clubIds: ['club-paper-craft'],
    placeIds: ['library']
  },
  {
    id: 'pets',
    name: '宠物',
    category: '自然',
    glyph: '宠',
    summary: '围绕宠物照护、散步和友好空间发现同好，注意安全边界和动物舒适度。',
    beginnerLevel: '宠物友好',
    learningDuration: '随时开始',
    socialStyle: '温和陪伴',
    tags: ['宠物', '狗狗', '猫', '宠物友好'],
    learningSteps: ['确认地点是否宠物友好', '只分享兴趣不暴露私人住址', '尊重对方宠物边界', '参加小规模宠物友好散步'],
    tools: ['牵引绳', '水碗', '拾便袋'],
    clubIds: ['club-pet-friendly-walk'],
    placeIds: ['coffee']
  }
];

const INTEREST_CLUBS = [
  { id: 'club-library-reading', interestId: 'reading', name: 'State Library 共读会', city: 'Melbourne CBD', memberCount: 128, schedule: '周三 19:00', level: '可旁听', summary: '围绕一本书进行小组交流，不强制发言，适合第一次线下参与。', placeId: 'library', verified: true },
  { id: 'club-city-essay', interestId: 'reading', name: '城市短文写作小组', city: 'Melbourne CBD', memberCount: 72, schedule: '周日 15:00', level: '零基础', summary: '用短文记录城市片段，先写后聊，降低直接社交压力。', placeId: 'library', verified: true },
  { id: 'club-slow-photo', interestId: 'photography', name: '慢半拍摄影散步', city: 'Collins St', memberCount: 96, schedule: '周六 17:00', level: '手机即可', summary: '不拍陌生人正脸，重点练习城市光影和构图。', placeId: 'coffee', verified: true },
  { id: 'club-laneway-light', interestId: 'photography', name: '巷口光影小组', city: 'Market Lane', memberCount: 84, schedule: '隔周五 18:30', level: '轻量创作', summary: '以咖啡馆为起点，完成一小时巷口光影命题。', placeId: 'coffee', verified: false },
  { id: 'club-carlton-boardgame', interestId: 'boardgame', name: 'Carlton 新人桌游局', city: 'Carlton', memberCount: 164, schedule: '周三 20:00', level: '新人保护', summary: '主持人讲解规则，优先合作与轻策略游戏。', placeId: 'boardgame', verified: true },
  { id: 'club-market-cupping', interestId: 'coffee', name: 'Market Lane 小杯测', city: 'Market Lane', memberCount: 91, schedule: '周四 16:30', level: '零基础', summary: '用三口咖啡认识酸甜苦，不需要专业术语。', placeId: 'coffee', verified: true },
  { id: 'club-coffee-map', interestId: 'coffee', name: '咖啡地图共同任务', city: 'Melbourne CBD', memberCount: 118, schedule: '周六 14:00', level: '轻探索', summary: '从一家咖啡馆出发，补充街区咖啡地图和风味标签。', placeId: 'coffee', verified: true },
  { id: 'club-laneway-listening', interestId: 'music', name: '巷口听歌会', city: 'Market Lane', memberCount: 66, schedule: '隔周五 19:30', level: '无需乐理', summary: '每人带一首歌，分享可以很短，也可以只听。', placeId: 'coffee', verified: true },
  { id: 'club-gentle-run', interestId: 'sports', name: '城市慢跑与散步', city: 'Melbourne CBD', memberCount: 103, schedule: '周日 09:30', level: '低速友好', summary: '以能聊天的速度慢跑或散步，适合第一次加入。', placeId: 'library', verified: true },
  { id: 'club-small-gallery', interestId: 'art', name: '小展览观察会', city: 'Melbourne CBD', memberCount: 75, schedule: '周六 11:00', level: '可旁观', summary: '只讨论作品，不评判个人审美，适合低压力表达。', placeId: 'library', verified: true },
  { id: 'club-soft-cinema', interestId: 'film', name: '低压力观影会', city: 'Melbourne CBD', memberCount: 88, schedule: '周五 20:30', level: '零基础', summary: '观影后用三句短评交流，可以只听不发言。', placeId: 'library', verified: true },
  { id: 'club-city-walk', interestId: 'city-explore', name: '城市地标散步', city: 'Melbourne CBD', memberCount: 146, schedule: '周六 15:30', level: '手机即可', summary: '围绕地标故事和地图线索完成轻量路线。', placeId: 'library', verified: true },
  { id: 'club-paper-craft', interestId: 'handcraft', name: '纸艺与城市拼贴', city: 'State Library', memberCount: 54, schedule: '周日 14:00', level: '零基础', summary: '用城市票据、地图和纸张完成一张小拼贴。', placeId: 'library', verified: true },
  { id: 'club-pet-friendly-walk', interestId: 'pets', name: '宠物友好散步', city: 'Market Lane', memberCount: 63, schedule: '周日 10:30', level: '宠物友好', summary: '小规模宠物友好路线，强调边界、安全和低打扰。', placeId: 'coffee', verified: true }
];

const CLUB_LEADERBOARD = [
  { id: 'board-forest', rank: 1, name: '林间共读社', avatar: '林', category: '读书', memberCount: 156, score: 982, mine: false },
  { id: 'board-night', rank: 2, name: '城市夜读', avatar: '夜', category: '读书', memberCount: 142, score: 910, mine: false },
  { id: 'board-library', rank: 3, name: 'State Library 共读会', avatar: '城', category: '读书', memberCount: 128, score: 868, mine: true },
  { id: 'board-morning', rank: 4, name: '晨光读书会', avatar: '晨', category: '读书', memberCount: 98, score: 815, mine: false },
  { id: 'board-slow', rank: 5, name: '慢读小组', avatar: '慢', category: '读书', memberCount: 76, score: 790, mine: false }
];

function publicClub(data, club) {
  const place = placeService.pickPlace(data, club.placeId);
  return {
    ...club,
    place: place ? {
      id: place.id,
      name: place.name,
      shortName: place.shortName,
      address: place.address,
      distance: place.distance,
      rating: place.rating,
      trustLabel: place.trustLabel
    } : null
  };
}

function publicInterestTopic(data, topic) {
  const clubs = INTEREST_CLUBS
    .filter(club => topic.clubIds.includes(club.id))
    .map(club => publicClub(data, club));
  const places = topic.placeIds
    .map(placeId => placeService.pickPlace(data, placeId))
    .filter(Boolean)
    .map(place => ({
      id: place.id,
      name: place.name,
      shortName: place.shortName,
      tags: place.tags,
      score: place.score,
      distance: place.distance,
      socialPressure: place.socialPressure,
      trustLabel: place.trustLabel
    }));
  return {
    ...topic,
    clubs,
    places
  };
}

function listInterests(data, searchParams) {
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const category = String(searchParams.get('category') || '全部').trim();
  const topics = INTEREST_TOPICS
    .filter(topic => {
      if (category && category !== '全部' && topic.category !== category) {
        return false;
      }
      if (!query) {
        return true;
      }
      const searchable = [
        topic.name,
        topic.category,
        topic.summary,
        topic.beginnerLevel,
        topic.learningDuration,
        topic.socialStyle,
        topic.tags.join(' '),
        topic.learningSteps.join(' ')
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    })
    .map(topic => publicInterestTopic(data, topic));
  return {
    contract: 'SmallWorld Interest/Club v1',
    categories: INTEREST_CATEGORIES,
    topics
  };
}

function getInterest(data, interestId) {
  const topic = INTEREST_TOPICS.find(item => item.id === interestId);
  if (!topic) {
    return { status: 404, body: { error: 'INTEREST_NOT_FOUND', message: '兴趣不存在' } };
  }
  return { status: 200, body: { topic: publicInterestTopic(data, topic) } };
}

function listInterestClubs(data, interestId) {
  const topic = INTEREST_TOPICS.find(item => item.id === interestId);
  if (!topic) {
    return { status: 404, body: { error: 'INTEREST_NOT_FOUND', message: '兴趣不存在' } };
  }
  const clubs = INTEREST_CLUBS
    .filter(club => club.interestId === interestId)
    .map(club => publicClub(data, club));
  return { status: 200, body: { interestId, clubs } };
}

function getClub(data, clubId) {
  const club = INTEREST_CLUBS.find(item => item.id === clubId);
  if (!club) {
    return { status: 404, body: { error: 'CLUB_NOT_FOUND', message: '俱乐部不存在' } };
  }
  const topic = INTEREST_TOPICS.find(item => item.id === club.interestId);
  return {
    status: 200,
    body: {
      club: publicClub(data, club),
      interest: topic ? {
        id: topic.id,
        name: topic.name,
        category: topic.category
      } : null
    }
  };
}

function clubLeaderboard(clubId) {
  const club = INTEREST_CLUBS.find(item => item.id === clubId);
  if (!club) {
    return { status: 404, body: { error: 'CLUB_NOT_FOUND', message: '俱乐部不存在' } };
  }
  const entries = CLUB_LEADERBOARD.map(entry => ({
    ...entry,
    mine: club.id === 'club-library-reading' ? entry.mine : false
  }));
  return {
    status: 200,
    body: {
      clubId,
      label: `${club.name} 排行榜`,
      description: '排行榜按真实到场、活动贡献和可信互动综合计算，不以聊天热度计分。',
      entries
    }
  };
}

function verifiedClubs() {
  return INTEREST_CLUBS.filter(club => club.verified);
}

module.exports = {
  CLUB_LEADERBOARD,
  INTEREST_CATEGORIES,
  INTEREST_CLUBS,
  INTEREST_TOPICS,
  clubLeaderboard,
  getClub,
  getInterest,
  listInterestClubs,
  listInterests,
  publicClub,
  publicInterestTopic,
  verifiedClubs
};
