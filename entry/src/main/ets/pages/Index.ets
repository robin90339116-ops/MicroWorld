import http from '@ohos.net.http';
import NfcPeerManager from '../utils/NfcPeerManager';
import { NfcHostPayload, NfcPeerPayload } from '../utils/NfcPeerManager';
import { MapComponent, mapCommon, map } from '@kit.MapKit';
import { AsyncCallback, BusinessError } from '@kit.BasicServicesKit';
import SessionVault from '../utils/SessionVault';
import util from '@ohos.util';

interface ChatMessageItem {
  id: string;
  text: string;
  mine: boolean;
}

interface MapPoint {
  latitude: number;
  longitude: number;
  title: string;
}

// 探索页地图中心与地点标记(墨尔本坐标)。真机 + AGC 配置后由华为 Map Kit 渲染真实地图。
const MAP_CENTER: MapPoint = { latitude: -37.8136, longitude: 144.9631, title: 'Melbourne' };
const PLACE_COORDS: MapPoint[] = [
  { latitude: -37.8098, longitude: 144.9652, title: 'State Library' },
  { latitude: -37.8146, longitude: 144.9631, title: 'Market Lane' },
  { latitude: -37.8000, longitude: 144.9670, title: 'Carlton Game' }
];

interface PlaceItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  rating: string;
  comfort: string;
  match: string;
  safety: string;
  activity: string;
  world: string;
  attend: string;
  distance: string;
  trust: string;
  intro: string;
  activities: string[];
  medals: string[];
  activityIds?: string[];
}

interface InterestItem {
  id: string;
  name: string;
  icon: string;
  intro: string;
  method: string;
  clubs: string[];
  places: string[];
  clubIds?: string[];
}

interface WorldItem {
  id: string;
  name: string;
  place: string;
  status: string;
  desc: string;
  objects: string[];
  visits: string;
  builders: string;
  objectCount?: string;
}

interface ChatPerson {
  id: string;
  name: string;
  avatar: string;
  tag: string;
  place: string;
  lastMsg: string;
  bio: string;
  color: string;
  chatId?: string;
}

interface MomentItem {
  author: string;
  place: string;
  text: string;
  time: string;
}

interface ProfileMenuItem {
  icon: string;
  label: string;
  to: string;
  tint: string;
  bg?: string;
  endpoint?: string;
}

interface RoutePlanBody {
  placeId: string;
  latitude: string;
  longitude: string;
}

interface LoginBody {
  email: string;
  password: string;
  deviceId: string;
}

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  deviceId: string;
}

interface IdentityBody {
  interests: string[];
  socialIntent: string;
}

interface PlaceRoomOpenBody {
  checkinMethod: string;
  latitude: string;
  longitude: string;
}

interface MessageBody {
  text: string;
  clientMessageId?: string;
}

interface WorldCreateBody {
  name: string;
  placeId: string;
  description: string;
  visibility: string;
  theme: string;
  allowCollaboration: boolean;
}

interface WorldAssetBody {
  catalogId: string;
  x: number;
  y: number;
}

interface WorldAiAssetBody {
  prompt: string;
  style: string;
  kind: string;
}

interface NfcSessionBody {
  placeId: string;
  hostDeviceId: string;
}

interface NfcConfirmBody {
  sessionId: string;
  touchToken: string;
  readerDeviceId: string;
  transport: string;
  challenge: string;
  gpsVerified: boolean;
}

interface MerchantTapBody {
  placeId: string;
  deviceId: string;
  merchantDeviceId: string;
  merchantId: string;
}

interface MerchantPayBody {
  itemName: string;
  amount: number;
  currency: string;
}

interface MerchantReviewBody {
  stars: number;
  tags: string[];
  comment: string;
}

interface MerchantItemReviewBody {
  itemName: string;
  stars: number;
  tags: string[];
  comment: string;
}

const C_BG: string = '#F5F3EE';
const C_CARD: string = '#FFFFFF';
const C_INK: string = '#1F241F';
const C_MUTED: string = '#6B7268';
const C_LINE: string = '#ECE8DF';
const C_DEEP: string = '#2F6B4F';
const C_DARK: string = '#00483F';
const C_GOLD: string = '#A07B34';
const C_ORANGE: string = '#C2542F';
const C_BLUE: string = '#3A6EC8';
const C_GREEN_PALE: string = '#DFE7DA';
const C_IVORY: string = '#FFF8EA';

const INTEREST_NAMES: string[] = ['咖啡', '读书', '摄影', '运动', '桌游', '音乐', '艺术', '电影', '城市探索', '展览', '手作', '宠物'];
const INTENTS: string[] = ['参加线下活动', '遇见同频的人', '探索城市地点', '创造虚拟世界'];
const FILTERS: string[] = ['全部', '咖啡', '读书', '摄影', '运动', '桌游'];
const INTEREST_CATEGORIES: string[] = ['全部', '人文', '艺术', '运动', '生活', '户外'];
const STAR_SLOTS: number[] = [1, 2, 3, 4, 5];
const MERCHANT_PLACE_TAGS: string[] = ['环境好', '咖啡赞', '适合独处'];
const MERCHANT_ITEM_TAGS: string[] = ['口感好', '分量足', '包装用心'];

const API_BASE_CANDIDATES: string[] = [
  'http://192.168.1.213:8787',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'http://10.0.2.2:8787'
];
const DEMO_LATITUDE: string = '-37.8136';
const DEMO_LONGITUDE: string = '144.9637';

const PLACES: PlaceItem[] = [
  {
    id: 'library',
    name: 'State Library Reading Club',
    shortName: 'State Library',
    category: '读书 / 咖啡 / 安静社交',
    rating: '4.8',
    comfort: '92%',
    match: '88%',
    safety: '95%',
    activity: '86%',
    world: '76%',
    attend: '238',
    distance: '1.2km',
    trust: '高可信',
    intro: '墨尔本市中心低压力读书社交地标，空间开阔，适合第一次线下见面和安静破冰。',
    activities: ['19:00 夜间读书交流会', '20:30 城市书签 AR 任务', '本周书页寻宝赛'],
    medals: ['阅读同行者', '城市书签', '安静社交徽章']
  },
  {
    id: 'coffee',
    name: 'Market Lane Coffee Corner',
    shortName: 'Market Lane',
    category: '咖啡 / 摄影 / 轻聊天',
    rating: '4.6',
    comfort: '89%',
    match: '82%',
    safety: '91%',
    activity: '78%',
    world: '80%',
    attend: '156',
    distance: '800m',
    trust: '可信',
    intro: '巷口咖啡社交角，适合一杯咖啡开始的轻量对话，也适合摄影和城市观察。',
    activities: ['16:30 咖啡地图任务', '17:20 手冲体验小局', '周末杯垫摄影挑战'],
    medals: ['咖啡地图员', '杯垫收藏家', '轻聊天徽章']
  },
  {
    id: 'boardgame',
    name: 'Carlton Board Game Night',
    shortName: 'Carlton Game',
    category: '桌游 / 活动 / 新人友好',
    rating: '4.7',
    comfort: '86%',
    match: '90%',
    safety: '88%',
    activity: '94%',
    world: '72%',
    attend: '92',
    distance: '2.4km',
    trust: '高可信',
    intro: '小局桌游夜，新人会被主理人带入，不需要靠尬聊建立关系。',
    activities: ['20:00 新手桌游局', '21:10 合作推理赛', '周三桌游积分榜'],
    medals: ['桌游搭子', '新手友好', '合作破冰者']
  }
];

const INTERESTS: InterestItem[] = [
  { id: 'reading', name: '读书', icon: '书', intro: '用共同文本降低破冰压力，适合安静社交。', method: '从短篇、读书会旁听和书签任务开始。', clubs: ['State Library Reading Club', '周日晚读社'], places: ['State Library', 'City Book Corner'] },
  { id: 'coffee', name: '咖啡', icon: '啡', intro: '轻量、低承诺、容易自然离场的线下兴趣。', method: '先学习风味轮，再参与手冲体验和咖啡地图。', clubs: ['Market Lane Coffee Club', '手冲练习室'], places: ['Market Lane', 'North Coffee Bar'] },
  { id: 'photo', name: '摄影', icon: '镜', intro: '用观察城市作为话题，不需要一开始就强聊天。', method: '从构图、光线、同路线摄影散步开始。', clubs: ['慢半拍摄影', '街角影像社'], places: ['Carlton Walk', 'NGV 周边'] },
  { id: 'boardgame', name: '桌游', icon: '棋', intro: '规则本身提供互动结构，对新人友好。', method: '先参加合作类或轻策略局，再进入比赛榜。', clubs: ['Carlton Board Game Night', '周三桌游档案馆'], places: ['Carlton Game Room', 'North Table'] }
];

const WORLDS: WorldItem[] = [
  { id: 'world-library', name: '我的图书馆庭院', place: 'State Library', status: '草稿', desc: '一个绑定真实地点的私有创作空间，到达现场后可以放置记忆、任务和 AI 物件。', objects: ['记忆树', '共读桌', '书签灯'], visits: '0', builders: '0' },
  { id: 'world-coffee', name: '巷口咖啡时间', place: 'Market Lane', status: '已发布', desc: '收集杯垫故事、咖啡地图和轻聊天任务的地点世界。', objects: ['杯垫墙', '风味灯', '咖啡地图'], visits: '42', builders: '3' },
  { id: 'world-bookmark', name: '隐藏书签花园', place: 'State Library', status: '到场解锁', desc: '需要真实到达并共同完成任务后才能进入的共同建设空间。', objects: ['入口门', '隐藏书签', '留言墙'], visits: '128', builders: '12' }
];

const PEOPLE: ChatPerson[] = [
  { id: 'forest', name: '林间书页', avatar: '书', tag: '读书 / 咖啡', place: 'State Library · 隐藏书签任务', lastMsg: '刚刚那个书签任务挺有意思。', bio: '喜欢安静读书和城市散步，正在收集图书馆故事。', color: '#DFE7DA' },
  { id: 'photo', name: '慢半拍摄影', avatar: '镜', tag: '摄影 / 展览', place: 'Carlton 摄影散步', lastMsg: '待确认连接请求', bio: '习惯慢慢观察城市的光线，喜欢展览和夜间散步。', color: '#EAF0FA' },
  { id: 'city', name: '城市手帐', avatar: '册', tag: '手作 / 城市探索', place: '图书馆记忆墙', lastMsg: '我放了一条新的地点故事。', bio: '用手帐记录真实到过的地点，也喜欢共同建设小世界。', color: '#F4EFE6' }
];

const MOMENTS: MomentItem[] = [
  { author: '林间书页', place: 'State Library', text: '今天读书会的节奏很好，可以只听，不需要强行自我介绍。', time: '刚刚' },
  { author: '城市手帐', place: '图书馆记忆墙', text: '给隐藏书签花园加了第一段地标故事。', time: '20 分钟前' },
  { author: '慢半拍摄影', place: 'Carlton', text: '晚上路灯和橱窗反光很适合练习低光摄影。', time: '1 小时前' }
];

const PROFILE_MENUS: ProfileMenuItem[] = [
  { icon: '冠', label: '比赛奖杯展示', to: 'meTrophies', tint: '#A07B34' },
  { icon: '星', label: '个人动态', to: 'meMoments', tint: '#3A6EC8' },
  { icon: '◎', label: '个人虚拟世界', to: 'meWorld', tint: '#2F6B4F' },
  { icon: '⌂', label: '已加入的俱乐部', to: 'meClubs', tint: '#7A5CC0' },
  { icon: '▤', label: '个人比赛日程', to: 'meSchedule', tint: '#C2542F' },
  { icon: '◆', label: '兴趣记录数据', to: 'meInterestData', tint: '#3F8A78' },
  { icon: '▣', label: '碰一碰信息', to: 'meNfc', tint: '#A07B34' }
];

@Entry
@Component
struct Index {
  @State page: string = 'welcome';
  @State activeTab: string = 'explore';
  @State selectedFilter: string = '全部';
  @State exploreQuery: string = '';
  @State exploreLoading: boolean = false;
  @State exploreError: string = '';
  private exploreRequestId: number = 0;
  @State socialError: string = '';
  @State worldError: string = '';
  @State identitySaving: boolean = false;
  @State selectedInterestCat: string = '全部';
  @State interestCategories: string[] = ['全部'];
  @State interestQuery: string = '';
  @State interestLoading: boolean = false;
  @State interestError: string = '';
  private interestRequestId: number = 0;
  @State chatMessages: ChatMessageItem[] = [];
  @State chatError: string = '';
  @State chatLoading: boolean = false;
  @State sendingMessage: boolean = false;
  @State authBusy: boolean = false;
  @State startupReady: boolean = false;
  @State currentUserId: string = '';
  private chatTimer: number = -1;
  private chatGeneration: number = 0;
  private pendingMessageText: string = '';
  private pendingMessageId: string = '';
  private pendingMessageChat: string = '';
  private sessionEpoch: number = 0;
  @State worldNameDraft: string = '';
  @State worldThemeDraft: string = 'memoryGarden';
  @State worldVisibilityDraft: string = 'private';
  @State worldPlaceIdDraft: string = '';
  @State worldSaving: boolean = false;
  @State worldFormError: string = '';
  @State merchantPlaceComment: string = '';
  @State merchantItemComment: string = '';
  @State selectedPlaceIndex: number = 0;
  @State selectedInterestIndex: number = 0;
  @State selectedWorldIndex: number = 0;
  @State worldTab: string = 'scene';
  @State selectedPersonIndex: number = 0;
  @State selectedActivityIndex: number = 0;
  @State selectedIntent: string = '遇见同频的人';
  @State selectedInterests: string[] = ['咖啡', '读书', '城市探索'];
  @State loginEmail: string = '';
  @State loginPassword: string = '';
  @State registerName: string = '';
  @State registerConfirm: string = '';
  @State backendStatus: string = '正在连接 MicroWorld 后端...';
  @State messageDraft: string = '';
  @State apiBaseUrl: string = API_BASE_CANDIDATES[0];
  @State authToken: string = '';
  @State places: PlaceItem[] = [];
  @State interests: InterestItem[] = [];
  @State worlds: WorldItem[] = [];
  @State people: ChatPerson[] = [];
  @State moments: MomentItem[] = [];
  @State profileMenus: ProfileMenuItem[] = PROFILE_MENUS;
  @State profileName: string = '城市书签';
  @State profileSubtitle: string = '读书 / 咖啡 / 城市探索';
  @State profileIntentText: string = '社交意图：遇见同频的人';
  @State profileStats: string[] = ['0', '0', '0', '0'];
  @State placeRoomToken: string = '';
  @State placeRoomPosts: MomentItem[] = [];
  @State routeDistance: string = '';
  @State routeDuration: string = '14分';
  @State nfcRole: string = 'choose';
  @State nfcStatus: string = '选择你在这次碰一碰里的角色';
  @State nfcResult: string = '';
  @State nfcActive: boolean = false;
  @State nfcStep: string = 'idle';
  @State nfcSensedName: string = '现场用户';
  @State nfcTimesMet: string = '1';
  @State nfcAffinityText: string = '';
  @State nfcPointsText: string = '';
  @State nfcBadgeText: string = '';
  private nfcPending: NfcPeerPayload | null = null;
  @State nfcKind: string = 'personal';
  @State merchantName: string = 'Market Lane Coffee';
  @State merchantTapId: string = '';
  @State merchantStatus: string = '把手机碰一下商家设备的 NFC，或扫描店内二维码';
  @State merchantCheckedIn: boolean = false;
  @State merchantPaid: boolean = false;
  @State merchantStars: number = 5;
  @State merchantTags: string[] = [];
  @State merchantItemName: string = '燕麦拿铁 · 中杯';
  @State merchantRewardBadge: string = '';
  @State merchantRewardPoints: string = '';
  @State merchantRewardText: string = '';

  // 官方 NFC 封装:HCE(被碰方)+ ISO-DEP Reader(主动碰方),见 utils/NfcPeerManager.ets。
  private nfcManager: NfcPeerManager = new NfcPeerManager({
    bundleName: 'com.microworld.app',
    moduleName: 'entry',
    abilityName: 'EntryAbility'
  });
  // 每台设备一个随机 ID:双机碰触时后端要求 host 与 reader 的设备号不同。
  private nfcDeviceId: string = '';
  // 华为原生 Map Kit:探索页真实地图。
  private mapController?: map.MapComponentController;
  private mapOptions: mapCommon.MapOptions = {
    position: {
      target: { latitude: MAP_CENTER.latitude, longitude: MAP_CENTER.longitude },
      zoom: 14
    }
  };
  private mapCallback: AsyncCallback<map.MapComponentController> = async (err: BusinessError, controller: map.MapComponentController) => {
    if (err) {
      console.error('[MicroWorld] Map Kit 初始化失败：' + JSON.stringify(err));
      return;
    }
    this.mapController = controller;
    await this.addPlaceMarkers();
  };

  private go(next: string): void {
    if (next === 'chatDetail' && this.people.length === 0) {
      this.backendStatus = '尚未建立可用对话，请先完成双方连接';
      return;
    }
    this.stopChatPolling();
    if (next === 'chatDetail') {
      this.chatMessages = [];
      this.chatError = '';
      this.chatTimer = setInterval(() => { this.loadChatMessages(); }, 4000);
    }
    if (this.page === 'nfcTouch' && next !== 'nfcTouch') {
      this.stopNfc();
    }
    this.page = next;
    const tab = this.tabForPage(next);
    if (tab.length > 0) {
      this.activeTab = tab;
    }
    this.loadForPage(next);
  }

  private tabForPage(next: string): string {
    if (next === 'explore') {
      return 'explore';
    }
    if (['interest', 'interestDetail', 'clubDetail', 'interestAI'].indexOf(next) >= 0) {
      return 'interest';
    }
    if (['world', 'worldDetail', 'createWorld', 'cameraFull', 'worldEditor', 'shareWorld'].indexOf(next) >= 0) {
      return 'world';
    }
    if (['chat', 'chatFriends', 'chatMoments', 'chatDetail', 'chatSettings', 'leaderboard', 'profileDetail', 'profileDetailReadOnly'].indexOf(next) >= 0) {
      return 'chat';
    }
    if (next === 'profile' || next === 'meSettings') {
      return 'profile';
    }
    return '';
  }

  private mainPage(next: string): void {
    this.stopChatPolling();
    this.activeTab = next;
    this.page = next;
    this.loadForPage(next);
  }

  private shouldShowTab(): boolean {
    return ['explore', 'interest', 'world', 'chat', 'chatFriends', 'chatMoments', 'profile'].indexOf(this.page) >= 0;
  }

  private currentPlace(): PlaceItem {
    return this.places[this.selectedPlaceIndex] || PLACES[0];
  }

  private currentInterest(): InterestItem {
    return this.interests[this.selectedInterestIndex] || INTERESTS[0];
  }

  private currentWorld(): WorldItem {
    return this.worlds[this.selectedWorldIndex] || WORLDS[0];
  }

  private currentPerson(): ChatPerson {
    return this.people[this.selectedPersonIndex] || PEOPLE[0];
  }

  private currentActivity(): string {
    return this.currentPlace().activities[this.selectedActivityIndex] || this.currentPlace().activities[0];
  }

  private toggleInterest(value: string): void {
    if (this.selectedInterests.indexOf(value) >= 0) {
      this.selectedInterests = this.selectedInterests.filter((item: string) => item !== value);
    } else {
      this.selectedInterests = this.selectedInterests.concat([value]);
    }
  }


  private textValue(value: Object | undefined, fallback: string = ''): string {
    if (value === undefined || value === null) {
      return fallback;
    }
    const text = String(value);
    return text.length > 0 ? text : fallback;
  }

  private numberText(value: Object | undefined, fallback: string = '0'): string {
    if (value === undefined || value === null) {
      return fallback;
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return fallback;
    }
    return String(Math.round(numberValue));
  }

  private percentText(value: Object | undefined, fallback: string): string {
    if (value === undefined || value === null) {
      return fallback;
    }
    const raw = String(value);
    if (raw.indexOf('%') >= 0) {
      return raw;
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return fallback;
    }
    return Math.round(numberValue) + '%';
  }

  private mapValue(value: Object | undefined): Record<string, Object> {
    if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, Object>;
    }
    return {} as Record<string, Object>;
  }

  private mapArray(value: Object | undefined): Record<string, Object>[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return (value as Object[]).map((item: Object) => this.mapValue(item));
  }

  private stringArray(value: Object | undefined): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return (value as Object[]).map((item: Object) => String(item));
  }

  private async requestAt(baseUrl: string, path: string, method: http.RequestMethod, body?: Object): Promise<Record<string, Object>> {
    const issuedEpoch = this.sessionEpoch;
    const request = http.createHttp();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.authToken.length > 0 && baseUrl === this.apiBaseUrl && path !== '/health' &&
      path !== '/api/auth/login' && path !== '/api/auth/register') {
      headers['Authorization'] = 'Bearer ' + this.authToken;
    }
    if (this.placeRoomToken.length > 0 && path.indexOf('/room/') >= 0) {
      headers['X-Place-Room-Token'] = this.placeRoomToken;
    }
    try {
      const response = await request.request(baseUrl + path, {
        method,
        header: headers,
        extraData: body === undefined ? '' : JSON.stringify(body),
        connectTimeout: 3500,
        readTimeout: 3500
      });
      const resultText = typeof response.result === 'string' ? response.result : String(response.result);
      const parsed = resultText.length > 0 ? JSON.parse(resultText) as Record<string, Object> : {} as Record<string, Object>;
      const responseCode = Number(response.responseCode);
      if (issuedEpoch !== this.sessionEpoch) throw new Error('账号状态已改变，请重试');
      if (responseCode >= 400) {
        const message = this.textValue(parsed['message'], this.textValue(parsed['error'], '后端请求失败'));
        if (responseCode === 401 && headers['Authorization'] === 'Bearer ' + this.authToken) {
          this.resetSession();
          this.go('login');
          await SessionVault.clear();
        }
        throw new Error(message);
      }
      return parsed;
    } finally {
      request.destroy();
    }
  }

  private async apiGet(path: string): Promise<Record<string, Object>> {
    return this.requestAt(this.apiBaseUrl, path, http.RequestMethod.GET);
  }

  private async apiPost(path: string, body: Object): Promise<Record<string, Object>> {
    return this.requestAt(this.apiBaseUrl, path, http.RequestMethod.POST, body);
  }

  private loadForPage(next: string): void {
    if (next === 'explore') {
      this.loadExploreData();
    } else if (next === 'place') {
      this.loadPlaceDetail();
    } else if (next === 'routePlan') {
      this.loadRoutePlan();
    } else if (next === 'interest') {
      this.loadInterestData();
    } else if (next === 'world') {
      this.loadWorldData();
    } else if (next === 'chat' || next === 'chatFriends' || next === 'chatMoments') {
      this.loadSocialData();
    } else if (next === 'profile') {
      this.loadProfileData();
    } else if (next === 'placeChat') {
      this.loadPlaceRoomFeed();
    } else if (next === 'chatDetail') {
      this.loadChatMessages();
    }
  }

  private stopChatPolling(): void {
    this.chatGeneration += 1;
    if (this.chatTimer !== -1) clearInterval(this.chatTimer);
    this.chatTimer = -1;
  }

  private resetSession(): void {
    this.sessionEpoch += 1;
    this.stopChatPolling();
    this.stopNfc();
    this.authToken = '';
    this.currentUserId = '';
    this.people = [];
    this.moments = [];
    this.worlds = [];
    this.chatMessages = [];
    this.placeRoomPosts = [];
    this.placeRoomToken = '';
    this.messageDraft = '';
    this.pendingMessageId = '';
    this.pendingMessageText = '';
    this.pendingMessageChat = '';
    this.loginPassword = '';
    this.registerConfirm = '';
    this.profileName = '未登录';
    this.profileSubtitle = '';
    this.profileStats = ['0', '0', '0', '0'];
    this.merchantTapId = '';
    this.merchantCheckedIn = false;
    this.merchantPaid = false;
    this.selectedPersonIndex = 0;
    this.selectedWorldIndex = 0;
  }

  private async initializeSession(): Promise<void> {
    try {
      this.nfcDeviceId = await SessionVault.deviceId();
      const saved = await SessionVault.load();
      if (saved !== null) {
        this.authToken = saved.token;
        this.apiBaseUrl = saved.baseUrl;
        // A token belongs to one server. Never send it to fallback discovery addresses.
        const response = await this.apiGet('/api/auth/me');
        const user = this.mapValue(response['user']);
        this.currentUserId = this.textValue(user['id']);
        this.profileName = this.textValue(user['displayName']);
        await this.loadBackendData();
        this.go(user['profileComplete'] === true ? 'explore' : 'identity');
      } else {
        await this.connectBackend();
      }
    } catch (error) {
      this.backendStatus = '登录恢复失败，请检查后端连接后重试：' + String(error);
      this.page = 'login';
    } finally {
      this.startupReady = true;
    }
  }

  private async acceptLogin(response: Record<string, Object>): Promise<void> {
    const token = this.textValue(response['token']);
    const user = this.mapValue(response['user']);
    const userId = this.textValue(user['id']);
    const expiresAt = this.textValue(response['expiresAt']);
    if (token.length === 0 || userId.length === 0 || !(Date.parse(expiresAt) > Date.now())) {
      throw new Error('登录接口返回的会话无效');
    }
    await SessionVault.save({ token, expiresAt, baseUrl: this.apiBaseUrl });
    this.resetSession();
    this.authToken = token;
    this.currentUserId = userId;
    this.profileName = this.textValue(user['displayName']);
  }

  private async logoutWithBackend(): Promise<void> {
    if (this.authBusy) return;
    this.authBusy = true;
    try {
      // Do not claim logout while a saved token can still restore the session.
      await this.apiPost('/api/auth/logout', {} as Record<string, Object>);
      await SessionVault.clear();
      this.resetSession();
      this.backendStatus = '已退出登录';
      this.go('login');
    } catch (error) {
      this.backendStatus = '退出失败，请保持网络连接后重试：' + String(error);
    } finally {
      this.authBusy = false;
    }
  }

  private async loadChatMessages(): Promise<void> {
    if (this.authToken.length === 0 || this.page !== 'chatDetail' || this.chatLoading) return;
    const chatId = this.activeChatId();
    const epoch = this.sessionEpoch;
    const generation = this.chatGeneration;
    this.chatLoading = true;
    try {
      const response = await this.apiGet('/api/chats/' + encodeURIComponent(chatId) + '/messages');
      if (epoch !== this.sessionEpoch || generation !== this.chatGeneration || this.page !== 'chatDetail' || chatId !== this.activeChatId()) return;
      if (!Array.isArray(response['messages'])) throw new Error('消息接口缺少 messages 列表');
      this.chatMessages = this.mapArray(response['messages']).map((raw: Record<string, Object>): ChatMessageItem => {
        return { id: this.textValue(raw['id']), text: this.textValue(raw['text']),
          mine: this.textValue(raw['senderId']) === this.currentUserId };
      });
      this.chatError = '';
    } catch (error) {
      if (epoch === this.sessionEpoch && generation === this.chatGeneration && chatId === this.activeChatId()) this.chatError = '消息加载失败：' + String(error);
    } finally {
      this.chatLoading = false;
    }
  }

  private async connectBackend(): Promise<void> {
    if (this.authToken.length > 0) {
      await this.apiGet('/api/auth/me');
      await this.loadBackendData();
      return;
    }
    for (let index = 0; index < API_BASE_CANDIDATES.length; index += 1) {
      const baseUrl = API_BASE_CANDIDATES[index];
      try {
        const result = await this.requestAt(baseUrl, '/health', http.RequestMethod.GET);
        this.apiBaseUrl = baseUrl;
        this.backendStatus = '已连接后端：' + baseUrl + ' · ' + this.textValue(result['version'], 'online');
        await this.loadBackendData();
        return;
      } catch (error) {
        this.backendStatus = '正在尝试后端地址 ' + (index + 1) + '/' + API_BASE_CANDIDATES.length;
      }
    }
    this.backendStatus = '未连接后端，请确认电脑服务器已启动且手机可访问';
  }

  private async loadBackendData(): Promise<void> {
    await this.loadExploreData();
    await this.loadInterestData();
    if (this.authToken.length > 0) {
      await this.loadSocialData();
      await this.loadProfileData();
      await this.loadWorldData();
    }
  }

  private placeFromBackend(raw: Record<string, Object>, fallback: PlaceItem): PlaceItem {
    const rating = this.mapValue(raw['rating']);
    const tags = this.stringArray(raw['tags']);
    const activities = this.mapArray(raw['activities']);
    const activityTitles = activities.map((item: Record<string, Object>) => {
      const time = this.textValue(item['time']);
      const title = this.textValue(item['title'], this.textValue(item['name'], '地点活动'));
      return (time.length > 0 ? time + ' ' : '') + title;
    });
    const activityIds = activities.map((item: Record<string, Object>) => this.textValue(item['id']));
    const medals = this.stringArray(raw['medals']);
    return {
      id: this.textValue(raw['id'], fallback.id),
      name: this.textValue(raw['name'], fallback.name),
      shortName: this.textValue(raw['shortName'], fallback.shortName),
      category: tags.length > 0 ? tags.join(' / ') : this.textValue(raw['category'], fallback.category),
      rating: this.textValue(raw['score'], fallback.rating),
      comfort: this.percentText(rating['comfort'], fallback.comfort),
      match: this.percentText(rating['match'], fallback.match),
      safety: this.percentText(rating['safety'], fallback.safety),
      activity: this.percentText(rating['activity'], fallback.activity),
      world: this.percentText(rating['world'], fallback.world),
      attend: this.numberText(raw['attendanceCount'], this.numberText(raw['nfcTouches'], fallback.attend)),
      distance: this.textValue(raw['distance'], fallback.distance),
      trust: this.textValue(raw['trustLabel'], fallback.trust),
      intro: this.textValue(raw['introduction'], fallback.intro),
      activities: activityTitles.length > 0 ? activityTitles : fallback.activities,
      medals: medals.length > 0 ? medals : fallback.medals,
      activityIds: activityIds
    };
  }

  private interestFromBackend(raw: Record<string, Object>, fallback: InterestItem): InterestItem {
    const clubs = this.mapArray(raw['clubs']).map((item: Record<string, Object>) => this.textValue(item['name']));
    const clubIds = this.mapArray(raw['clubs']).map((item: Record<string, Object>) => this.textValue(item['id']));
    const places = this.mapArray(raw['places']).map((item: Record<string, Object>) => this.textValue(item['shortName'], this.textValue(item['name'])));
    return {
      id: this.textValue(raw['id'], fallback.id),
      name: this.textValue(raw['name'], fallback.name),
      icon: this.textValue(raw['glyph'], this.textValue(raw['icon'], fallback.icon)),
      intro: this.textValue(raw['summary'], this.textValue(raw['intro'], fallback.intro)),
      method: this.stringArray(raw['learningSteps']).join(' / ') || this.textValue(raw['method'], fallback.method),
      clubs: clubs,
      places: places,
      clubIds: clubIds
    };
  }

  private personFromBackend(friend: Record<string, Object>, chat: Record<string, Object>, fallback: ChatPerson): ChatPerson {
    const displayName = this.textValue(friend['name'], this.textValue(friend['displayName'], '用户'));
    return {
      id: this.textValue(friend['id']),
      name: displayName,
      avatar: this.textValue(friend['avatar'], displayName.slice(0, 1) || fallback.avatar),
      tag: this.textValue(friend['tag'], this.textValue(friend['source'])),
      place: this.textValue(friend['place'], this.textValue(friend['metAt'], '未提供地点')),
      lastMsg: this.textValue(chat['message'], '暂无消息'),
      bio: this.textValue(friend['bio']),
      color: this.textValue(friend['color'], fallback.color),
      chatId: this.textValue(chat['id'], 'chat-' + this.textValue(friend['id'], fallback.id))
    };
  }

  private momentFromBackend(raw: Record<string, Object>, fallback: MomentItem): MomentItem {
    return {
      author: this.textValue(raw['authorName'], this.textValue(raw['author'], fallback.author)),
      place: this.textValue(raw['place'], fallback.place),
      text: this.textValue(raw['text'], fallback.text),
      time: this.textValue(raw['time'], fallback.time)
    };
  }

  private worldFromBackend(raw: Record<string, Object>, fallback: WorldItem): WorldItem {
    const objects = this.mapArray(raw['objects']).map((item: Record<string, Object>) => this.textValue(item['name'], this.textValue(item['glyph'], '物件')));
    return {
      id: this.textValue(raw['id'], fallback.id),
      name: this.textValue(raw['name'], fallback.name),
      place: this.textValue(raw['placeName'], this.textValue(raw['place'], fallback.place)),
      status: this.textValue(raw['statusLabel'], this.textValue(raw['status'], fallback.status)),
      desc: this.textValue(raw['description'], this.textValue(raw['desc'], fallback.desc)),
      objects: objects.length > 0 ? objects : fallback.objects,
      visits: this.numberText(raw['visitCount'], fallback.visits),
      builders: this.numberText(raw['collaboratorCount'], fallback.builders)
    };
  }

  private async loadExploreData(): Promise<void> {
    const requestId = ++this.exploreRequestId;
    this.exploreLoading = true;
    this.exploreError = '';
    try {
      const response = await this.apiGet(
        '/api/explore/places?interest=' + encodeURIComponent(this.selectedFilter) +
        '&q=' + encodeURIComponent(this.exploreQuery.trim()) +
        '&latitude=' + DEMO_LATITUDE + '&longitude=' + DEMO_LONGITUDE
      );
      if (requestId !== this.exploreRequestId) return;
      if (!Array.isArray(response['places'])) throw new Error('地点接口缺少 places 列表');
      const rawPlaces = this.mapArray(response['places']);
      this.places = rawPlaces.map((item: Record<string, Object>, index: number) => {
          const fallback = PLACES[Math.min(index, PLACES.length - 1)] || PLACES[0];
          return this.placeFromBackend(item, fallback);
        });
      if (this.selectedPlaceIndex >= this.places.length) {
        this.selectedPlaceIndex = 0;
      }
    } catch (error) {
      if (requestId === this.exploreRequestId) {
        this.places = [];
        this.exploreError = '探索数据加载失败，请重试：' + String(error);
      }
    } finally {
      if (requestId === this.exploreRequestId) this.exploreLoading = false;
    }
  }

  private async loadPlaceDetail(): Promise<void> {
    try {
      const response = await this.apiGet('/api/places/' + this.currentPlace().id);
      const rawPlace = this.mapValue(response['place']);
      const next = this.placeFromBackend(rawPlace, this.currentPlace());
      const copy = this.places.slice();
      copy[this.selectedPlaceIndex] = next;
      this.places = copy;
    } catch (error) {
      this.backendStatus = '地点详情同步失败，继续使用本地数据';
    }
  }

  private async loadInterestData(): Promise<void> {
    const requestId = ++this.interestRequestId;
    this.interestLoading = true;
    this.interestError = '';
    try {
      const response = await this.apiGet('/api/interests?category=' + encodeURIComponent(this.selectedInterestCat) +
        '&q=' + encodeURIComponent(this.interestQuery.trim()));
      if (requestId !== this.interestRequestId) return;
      if (!Array.isArray(response['topics'])) {
        throw new Error('兴趣接口缺少 topics 列表');
      }
      const rawInterests = this.mapArray(response['topics']);
      this.interestCategories = this.stringArray(response['categories']);
      this.interests = rawInterests.map((item: Record<string, Object>, index: number) => {
        const fallback = INTERESTS[Math.min(index, INTERESTS.length - 1)] || INTERESTS[0];
        return this.interestFromBackend(item, fallback);
      });
      if (this.selectedInterestIndex >= this.interests.length) {
        this.selectedInterestIndex = 0;
      }
    } catch (error) {
      if (requestId === this.interestRequestId) {
        this.interests = [];
        this.interestError = '兴趣加载失败：' + String(error);
      }
    } finally {
      if (requestId === this.interestRequestId) this.interestLoading = false;
    }
  }

  private async loadSocialData(): Promise<void> {
    if (this.authToken.length === 0) return;
    const epoch = this.sessionEpoch;
    this.socialError = '';
    const selectedPersonId = this.people[this.selectedPersonIndex]?.id || '';
    try {
      const response = await this.apiGet('/api/social/home');
      if (epoch !== this.sessionEpoch) return;
      const friends = this.mapArray(response['friends']);
      const chats = this.mapArray(response['chats']);
      this.people = friends.map((friend: Record<string, Object>, index: number) => {
          const friendId = this.textValue(friend['id']);
          const chat = chats.find((item: Record<string, Object>) => this.textValue(item['friendId']) === friendId) || {} as Record<string, Object>;
          const fallback = PEOPLE[Math.min(index, PEOPLE.length - 1)] || PEOPLE[0];
          return this.personFromBackend(friend, chat, fallback);
        });
      const newIndex = this.people.findIndex((person: ChatPerson) => person.id === selectedPersonId);
      this.selectedPersonIndex = newIndex >= 0 ? newIndex : 0;
      const rawMoments = this.mapArray(response['moments']);
      this.moments = rawMoments.map((item: Record<string, Object>, index: number) => {
          const fallback = MOMENTS[Math.min(index, MOMENTS.length - 1)] || MOMENTS[0];
          return this.momentFromBackend(item, fallback);
        });
    } catch (error) {
      if (epoch === this.sessionEpoch) this.socialError = '聊天数据加载失败，请重试：' + String(error);
    }
  }

  private async loadProfileData(): Promise<void> {
    const epoch = this.sessionEpoch;
    try {
      const response = await this.apiGet('/api/me/profile');
      if (epoch !== this.sessionEpoch) return;
      const display = this.mapValue(response['display']);
      const stats = this.mapValue(response['stats']);
      this.profileName = this.textValue(display['name'], this.profileName);
      this.profileSubtitle = this.textValue(display['subtitle'], this.profileSubtitle);
      this.profileIntentText = '后端已同步 · 真实关系与隐私设置已加载';
      this.profileStats = [
        this.numberText(stats['attendanceCount'], this.profileStats[0]),
        this.numberText(stats['nfcExchangeCount'], this.profileStats[1]),
        this.numberText(stats['repeatPlaceCount'], this.profileStats[2]),
        this.numberText(stats['friendCount'], this.profileStats[3])
      ];
      const rawMenu = this.mapArray(response['menu']);
      if (rawMenu.length > 0) {
        this.profileMenus = rawMenu.map((item: Record<string, Object>, index: number) => {
          const fallback = PROFILE_MENUS[Math.min(index, PROFILE_MENUS.length - 1)] || PROFILE_MENUS[0];
          const menuItem: ProfileMenuItem = {
            icon: this.textValue(item['icon'], fallback.icon),
            label: this.textValue(item['label'], fallback.label),
            to: this.textValue(item['to'], fallback.to),
            tint: this.textValue(item['color'], fallback.tint),
            bg: this.textValue(item['bg'], fallback.bg || '#F5F3EE'),
            endpoint: this.textValue(item['endpoint'], fallback.endpoint || '')
          };
          return menuItem;
        });
      }
    } catch (error) {
      this.backendStatus = '个人中心数据需要登录或后端未连接';
    }
  }

  private async loadWorldData(): Promise<void> {
    const epoch = this.sessionEpoch;
    this.worldError = '';
    try {
      const response = await this.apiGet('/api/worlds');
      if (epoch !== this.sessionEpoch) return;
      const rawWorlds = this.mapArray(response['worlds']);
      this.worlds = rawWorlds.map((item: Record<string, Object>, index: number) => {
          const fallback = WORLDS[Math.min(index, WORLDS.length - 1)] || WORLDS[0];
          return this.worldFromBackend(item, fallback);
        });
      if (this.selectedWorldIndex >= this.worlds.length) this.selectedWorldIndex = 0;
    } catch (error) {
      if (epoch === this.sessionEpoch) this.worldError = '世界加载失败，请重试：' + String(error);
    }
  }

  private applyBackendWorld(rawWorld: Record<string, Object>): void {
    const nextWorld = this.worldFromBackend(rawWorld, this.currentWorld());
    const index = this.worlds.findIndex((item: WorldItem) => item.id === nextWorld.id);
    if (index >= 0) {
      const copy = this.worlds.slice();
      copy[index] = nextWorld;
      this.worlds = copy;
      this.selectedWorldIndex = index;
    } else {
      this.worlds = [nextWorld].concat(this.worlds);
      this.selectedWorldIndex = 0;
    }
  }

  private async createWorldWithBackend(): Promise<void> {
    if (this.worldSaving) return;
    if (this.authToken.length === 0) {
      this.worldFormError = '登录后才能创建小世界';
      return;
    }
    if (this.worldNameDraft.trim().length < 2 || this.worldNameDraft.trim().length > 36 || this.worldPlaceIdDraft.length === 0) {
      this.worldFormError = '请填写 2–36 字的世界名称并选择地点';
      return;
    }
    this.worldSaving = true;
    this.worldFormError = '';
    try {
      const body: WorldCreateBody = {
        name: this.worldNameDraft.trim(),
        placeId: this.worldPlaceIdDraft,
        description: '一个绑定真实地点的私有创作空间。',
        visibility: this.worldVisibilityDraft,
        theme: this.worldThemeDraft,
        allowCollaboration: false
      };
      const response = await this.apiPost('/api/worlds', body);
      this.applyBackendWorld(this.mapValue(response['world']));
      this.backendStatus = this.textValue(response['message'], '小世界已创建');
      this.go('worldDetail');
    } catch (error) {
      this.worldFormError = '小世界创建失败：' + String(error);
    } finally {
      this.worldSaving = false;
    }
  }

  private async addWorldAssetWithBackend(): Promise<void> {
    if (this.authToken.length === 0) {
      this.backendStatus = '登录后才能保存世界物件';
      this.go('worldDetail');
      return;
    }
    try {
      const body: WorldAssetBody = {
        catalogId: 'bookmarkLight',
        x: 64,
        y: 58
      };
      const response = await this.apiPost('/api/worlds/' + this.currentWorld().id + '/assets', body);
      this.applyBackendWorld(this.mapValue(response['world']));
      this.backendStatus = this.textValue(response['message'], '物件已保存');
      this.go('worldDetail');
    } catch (error) {
      this.backendStatus = '世界物件保存失败：' + String(error);
      this.go('worldDetail');
    }
  }

  private async generateWorldAssetWithBackend(): Promise<void> {
    if (this.authToken.length === 0) {
      this.backendStatus = '登录后才能生成世界物件';
      return;
    }
    try {
      const body: WorldAiAssetBody = {
        prompt: '由城市书签和柔和灯光组成的记忆树',
        style: '城市微缩',
        kind: 'memory'
      };
      const response = await this.apiPost('/api/worlds/' + this.currentWorld().id + '/ai-assets', body);
      this.applyBackendWorld(this.mapValue(response['world']));
      this.backendStatus = this.textValue(response['message'], 'AI 物件已生成');
    } catch (error) {
      this.backendStatus = 'AI 物件生成失败：' + String(error);
    }
  }

  private async loadRoutePlan(): Promise<void> {
    try {
      const body: RoutePlanBody = {
        placeId: this.currentPlace().id,
        latitude: DEMO_LATITUDE,
        longitude: DEMO_LONGITUDE
      };
      const response = await this.apiPost('/api/explore/route-plan', body);
      this.routeDistance = this.textValue(response['distance'], this.currentPlace().distance);
      this.routeDuration = this.numberText(response['durationMinutes'], '14') + '分';
      this.backendStatus = this.textValue(response['message'], '路线规划已同步');
    } catch (error) {
      this.routeDistance = this.currentPlace().distance;
    }
  }

  private async loginWithBackend(): Promise<void> {
    if (!this.startupReady || this.authBusy) return;
    this.authBusy = true;
    try {
      if (this.nfcDeviceId.length === 0) this.nfcDeviceId = await SessionVault.deviceId();
      if (this.backendStatus.indexOf('已连接后端') < 0) {
        await this.connectBackend();
      }
      const body: LoginBody = {
        email: this.loginEmail,
        password: this.loginPassword,
        deviceId: this.nfcDeviceId
      };
      const response = await this.apiPost('/api/auth/login', body);
      await this.acceptLogin(response);
      this.backendStatus = '登录成功，正在同步后端数据';
      await this.loadBackendData();
      this.go(this.mapValue(response['user'])['profileComplete'] === true ? 'explore' : 'identity');
    } catch (error) {
      this.backendStatus = '登录失败：' + String(error);
    } finally {
      this.authBusy = false;
    }
  }

  private async registerWithBackend(): Promise<void> {
    if (!this.startupReady || this.authBusy) return;
    const email = this.loginEmail.trim();
    const displayName = this.registerName.trim().length > 0 ? this.registerName.trim() : '城市书签';
    // 前端即时校验,失败立刻给出清晰提示(与后端规则一致)。
    if (email.indexOf('@') < 0 || email.lastIndexOf('.') < email.indexOf('@')) {
      this.backendStatus = '请输入有效的邮箱地址，例如 name@example.com';
      return;
    }
    if (displayName.length < 2 || displayName.length > 24) {
      this.backendStatus = '昵称需要 2–24 个字符';
      return;
    }
    if (this.loginPassword.length < 8) {
      this.backendStatus = '密码至少 8 位';
      return;
    }
    if (this.loginPassword !== this.registerConfirm) {
      this.backendStatus = '两次输入的密码不一致';
      return;
    }
    this.authBusy = true;
    try {
      if (this.nfcDeviceId.length === 0) this.nfcDeviceId = await SessionVault.deviceId();
      this.backendStatus = '正在连接后端并创建账号...';
      await this.connectBackend();
      const body: RegisterBody = {
        email,
        password: this.loginPassword,
        displayName,
        deviceId: this.nfcDeviceId
      };
      const response = await this.apiPost('/api/auth/register', body);
      await this.acceptLogin(response);
      this.backendStatus = '账号创建成功，继续创建线下社交身份';
      this.go('identity');
    } catch (error) {
      this.backendStatus = '创建账号失败：' + String(error) + '（请确认后端已启动且可访问）';
    } finally {
      this.authBusy = false;
    }
  }

  private async saveIdentityWithBackend(): Promise<void> {
    if (this.identitySaving) return;
    if (this.authToken.length === 0) {
      this.go('login');
      return;
    }
    this.identitySaving = true;
    try {
      const body: IdentityBody = {
        interests: this.selectedInterests,
        socialIntent: this.selectedIntent
      };
      await this.apiPost('/api/auth/profile', body);
      await this.loadBackendData();
      this.go('explore');
    } catch (error) {
      this.backendStatus = '身份保存失败，请重试：' + String(error);
    } finally {
      this.identitySaving = false;
    }
  }

  private async openPlaceRoom(): Promise<void> {
    if (this.authToken.length === 0) {
      this.backendStatus = '登录后才能进入地点公共空间';
      return;
    }
    try {
      const body: PlaceRoomOpenBody = {
        checkinMethod: 'demo-onsite',
        latitude: DEMO_LATITUDE,
        longitude: DEMO_LONGITUDE
      };
      const response = await this.apiPost('/api/places/' + this.currentPlace().id + '/room/open', body);
      this.placeRoomToken = this.textValue(response['roomToken']);
      this.syncPlaceRoomPosts(response['posts']);
      this.backendStatus = this.textValue(response['message'], '已进入地点公共空间');
    } catch (error) {
      this.backendStatus = '地点公共空间进入失败：' + String(error);
    }
  }

  private async loadPlaceRoomFeed(): Promise<void> {
    if (this.authToken.length === 0 || this.placeRoomToken.length === 0) {
      return;
    }
    try {
      const response = await this.apiGet('/api/places/' + this.currentPlace().id + '/room/feed');
      this.syncPlaceRoomPosts(response['posts']);
    } catch (error) {
      this.backendStatus = '地点广场同步失败，继续显示本地消息';
    }
  }

  private syncPlaceRoomPosts(value: Object | undefined): void {
    const posts = this.mapArray(value);
    this.placeRoomPosts = posts.map((item: Record<string, Object>) => {
      const post: MomentItem = {
        author: this.textValue(item['authorName'], '现场用户'),
        place: this.currentPlace().shortName,
        text: this.textValue(item['text'], '地点分享'),
        time: this.textValue(item['time'], '刚刚')
      };
      return post;
    });
  }

  private async sendPlaceRoomMessage(): Promise<void> {
    const text = this.messageDraft.trim();
    if (text.length === 0 || this.authToken.length === 0 || this.placeRoomToken.length === 0) {
      return;
    }
    try {
      const body: MessageBody = { text };
      const response = await this.apiPost('/api/places/' + this.currentPlace().id + '/room/messages', body);
      this.messageDraft = '';
      this.backendStatus = this.textValue(response['message'], '消息已发布到地点广场');
      await this.loadPlaceRoomFeed();
    } catch (error) {
      this.backendStatus = '地点广场消息发送失败：' + String(error);
    }
  }

  private async sendChatMessage(): Promise<void> {
    const text = this.messageDraft.trim();
    if (text.length === 0 || this.authToken.length === 0 || this.sendingMessage) {
      return;
    }
    const chatId = this.activeChatId();
    const epoch = this.sessionEpoch;
    this.sendingMessage = true;
    try {
      if (this.pendingMessageText !== text || this.pendingMessageChat !== chatId || this.pendingMessageId.length === 0) {
        this.pendingMessageId = util.generateRandomUUID(true);
        this.pendingMessageText = text;
        this.pendingMessageChat = chatId;
      }
      const body: MessageBody = { text, clientMessageId: this.pendingMessageId };
      await this.apiPost('/api/chats/' + encodeURIComponent(chatId) + '/messages', body);
      if (epoch !== this.sessionEpoch || chatId !== this.activeChatId()) return;
      if (this.messageDraft.trim() === text) this.messageDraft = '';
      this.pendingMessageId = '';
      await this.loadChatMessages();
      await this.loadSocialData();
    } catch (error) {
      if (epoch === this.sessionEpoch) this.chatError = '消息发送失败，输入已保留：' + String(error);
    } finally {
      this.sendingMessage = false;
    }
  }

  private updateInput(label: string, placeholder: string, value: string): void {
    if (label === '世界名称') this.worldNameDraft = value;
    if (label === '邮箱') {
      this.loginEmail = value;
    }
    if (label === '密码') {
      this.loginPassword = value;
    }
    if (label === '确认密码') {
      this.registerConfirm = value;
    }
    if (label === '昵称') {
      this.registerName = value;
    }
  }

  private activeChatId(): string {
    const person = this.currentPerson();
    return person.chatId || 'chat-' + person.id;
  }

  private placeAt(index: number): PlaceItem {
    return this.places[Math.min(index, Math.max(0, this.places.length - 1))] || PLACES[0];
  }

  // ----- 碰一碰(华为官方 NFC:HCE + ISO-DEP)-----
  private async startNfcHost(): Promise<void> {
    if (this.authToken.length === 0) {
      this.nfcStatus = '登录后才能发起碰一碰';
      return;
    }
    try {
      const body: NfcSessionBody = {
        placeId: this.currentPlace().id,
        hostDeviceId: this.nfcDeviceId
      };
      const response = await this.apiPost('/api/nfc/sessions', body);
      const host = this.mapValue(response['host']);
      const payload: NfcHostPayload = {
        sessionId: this.textValue(response['sessionId']),
        touchToken: this.textValue(response['touchToken']),
        placeId: this.textValue(response['placeId'], this.currentPlace().id),
        hostUserId: this.textValue(host['userId']),
        expiresAt: this.textValue(response['expiresAt'])
      };
      this.nfcRole = 'host';
      this.nfcResult = '';
      this.nfcStep = 'wait';
      this.nfcStatus = '让对方用手机来碰你 · 当前地点 ' + this.currentPlace().shortName + ' · GPS + QR 已验证 ✓';
      this.nfcActive = this.nfcManager.startHost(payload, (message: string) => {
        this.nfcStatus = message;
      });
      if (!this.nfcActive) {
        this.nfcRole = 'choose';
        this.nfcStep = 'idle';
      }
    } catch (error) {
      this.nfcStatus = '发起碰一碰失败：' + String(error);
      this.nfcRole = 'choose';
      this.nfcStep = 'idle';
    }
  }

  private startNfcReader(): void {
    this.nfcRole = 'reader';
    this.nfcResult = '';
    this.nfcStep = 'wait';
    this.nfcStatus = '把两部手机背靠背靠近，对方也要打开碰一碰。等待碰触…';
    this.nfcActive = this.nfcManager.startReader(
      (payload: NfcPeerPayload) => {
        this.nfcPending = payload;
        this.nfcStep = 'sense';
        this.nfcStatus = '碰到了！确认是你们本人在一起吗？';
      },
      (message: string) => { this.nfcStatus = message; }
    );
    if (!this.nfcActive) {
      this.nfcRole = 'choose';
      this.nfcStep = 'idle';
    }
  }

  private async confirmNfcTouch(): Promise<void> {
    const payload = this.nfcPending;
    if (this.authToken.length === 0 || payload === null) {
      this.nfcStatus = '登录后才能确认碰一碰';
      return;
    }
    this.nfcStep = 'confirm';
    this.nfcStatus = '你已确认 ✓，等待对方确认…';
    try {
      const body: NfcConfirmBody = {
        sessionId: payload.sessionId,
        touchToken: payload.touchToken,
        readerDeviceId: this.nfcDeviceId,
        transport: 'iso_dep_apdu',
        challenge: payload.challenge,
        gpsVerified: true
      };
      const response = await this.apiPost('/api/nfc/sessions/confirm', body);
      const reward = this.mapValue(response['reward']);
      const affinity = this.mapValue(reward['affinity']);
      const points = this.mapValue(reward['points']);
      const badge = this.mapValue(reward['badge']);
      const alreadyFriends = response['alreadyFriends'] === true;
      this.nfcTimesMet = this.numberText(response['timesMet'], '1');
      this.nfcAffinityText = '+' + this.numberText(affinity['added'], '6') + ' · 现在 ' + this.numberText(affinity['total'], '0');
      this.nfcPointsText = '+' + this.numberText(points['awarded'], '6') + ' · 现在 ' + this.numberText(points['total'], '0');
      this.nfcBadgeText = reward['badgeDropped'] === true
        ? (this.textValue(badge['name'], '3D 纪念徽章') + ' · 稀有度 ' + this.textValue(badge['rarity'], 'R') + ' · ' + this.textValue(badge['tokenId']))
        : '';
      this.nfcManager.stopReader();
      this.nfcActive = false;
      this.nfcPending = null;
      this.nfcStep = alreadyFriends ? 'friend' : 'done';
    } catch (error) {
      this.nfcStatus = '碰一碰校验失败：' + String(error);
      this.nfcStep = 'sense';
    }
  }

  private stopNfc(): void {
    this.nfcManager.stop();
    this.nfcActive = false;
    this.nfcRole = 'choose';
    this.nfcStep = 'idle';
    this.nfcPending = null;
    this.nfcStatus = '选择你在这次碰一碰里的角色';
    this.nfcResult = '';
  }

  // ----- 商家碰一碰(碰门贴 → 打卡/支付 → 评价地点/物品 → 纪念徽章)-----
  private async startMerchantTap(): Promise<void> {
    if (this.authToken.length === 0) {
      this.merchantStatus = '登录后才能进行商家碰一碰';
      return;
    }
    try {
      const body: MerchantTapBody = {
        placeId: this.currentPlace().id,
        deviceId: this.nfcDeviceId,
        merchantDeviceId: 'merchant-' + this.currentPlace().id + '-nfc',
        merchantId: 'merchant-' + this.currentPlace().id
      };
      const response = await this.apiPost('/api/merchant/taps', body);
      const tap = this.mapValue(response['tap']);
      this.merchantTapId = this.textValue(tap['id']);
      const place = this.mapValue(tap['place']);
      this.merchantName = this.textValue(place['shortName'], this.textValue(place['name'], this.merchantName));
      this.merchantCheckedIn = false;
      this.merchantPaid = false;
      this.merchantTags = [];
      this.merchantStars = 5;
      this.merchantStatus = '已碰到门贴 · GPS 匹配 ✓ · 到店确认';
      this.go('merchantAction');
    } catch (error) {
      this.merchantStatus = '商家碰一碰失败：' + String(error);
    }
  }

  private async doMerchantCheckin(): Promise<void> {
    if (this.merchantTapId.length === 0) {
      return;
    }
    try {
      await this.apiPost('/api/merchant/taps/' + this.merchantTapId + '/checkin', {} as Record<string, Object>);
      this.merchantCheckedIn = true;
      this.merchantStatus = '到店打卡成功 · 城市足迹 +1';
    } catch (error) {
      this.merchantStatus = '打卡失败：' + String(error);
    }
  }

  private async doMerchantPay(): Promise<void> {
    if (this.merchantTapId.length === 0) {
      return;
    }
    try {
      const body: MerchantPayBody = { itemName: this.merchantItemName, amount: 28, currency: 'CNY' };
      await this.apiPost('/api/merchant/taps/' + this.merchantTapId + '/payments', body);
      this.merchantPaid = true;
      this.merchantStatus = '支付成功';
    } catch (error) {
      this.merchantStatus = '支付失败：' + String(error);
    }
  }

  private toggleMerchantTag(tag: string): void {
    if (this.merchantTags.indexOf(tag) >= 0) {
      this.merchantTags = this.merchantTags.filter((item: string) => item !== tag);
    } else {
      this.merchantTags = this.merchantTags.concat([tag]);
    }
  }

  private async submitMerchantPlaceReview(): Promise<void> {
    if (this.merchantTapId.length === 0) {
      return;
    }
    try {
      const body: MerchantReviewBody = { stars: this.merchantStars, tags: this.merchantTags, comment: this.merchantPlaceComment.trim() };
      const response = await this.apiPost('/api/merchant/taps/' + this.merchantTapId + '/place-reviews', body);
      const reward = this.mapValue(response['reward']);
      const medal = this.mapValue(reward['medal']);
      const points = this.mapValue(reward['points']);
      this.merchantRewardBadge = this.textValue(medal['name'], '商家纪念徽章') + ' · 稀有度 ' +
        this.textValue(medal['rarity'], 'R') + ' · ' + this.textValue(medal['tokenId']);
      this.merchantRewardPoints = '+' + this.numberText(points['awarded'], '5') + ' · 现在 ' + this.numberText(points['total'], '0');
      this.merchantRewardText = '感谢你的真实到店评价，地点可信度已更新。';
      this.merchantTags = [];
      this.go('merchantReward');
    } catch (error) {
      this.merchantStatus = '评价提交失败：' + String(error);
    }
  }

  private async submitMerchantItemReview(): Promise<void> {
    if (this.merchantTapId.length === 0) {
      return;
    }
    try {
      const body: MerchantItemReviewBody = {
        itemName: this.merchantItemName,
        stars: this.merchantStars,
        tags: this.merchantTags,
        comment: this.merchantItemComment.trim()
      };
      await this.apiPost('/api/merchant/taps/' + this.merchantTapId + '/item-reviews', body);
      this.merchantTags = [];
      this.merchantStars = 5;
      this.merchantStatus = '消费物品评价已提交，可继续评价这家店领取纪念徽章';
      this.go('merchantAction');
    } catch (error) {
      this.merchantStatus = '商品评价提交失败：' + String(error);
    }
  }

  aboutToAppear(): void {
    this.initializeSession();
  }

  private async addPlaceMarkers(): Promise<void> {
    if (!this.mapController) {
      return;
    }
    try {
      for (let index = 0; index < PLACE_COORDS.length; index += 1) {
        const point = PLACE_COORDS[index];
        const markerOptions: mapCommon.MarkerOptions = {
          position: { latitude: point.latitude, longitude: point.longitude },
          title: point.title,
          clickable: true
        };
        await this.mapController.addMarker(markerOptions);
      }
    } catch (error) {
      console.error('[MicroWorld] 添加地图标记失败：' + String(error));
    }
  }

  aboutToDisappear(): void {
    this.stopChatPolling();
    this.nfcManager.stop();
  }

  build() {
    Column() {
      this.NativeStatusBar();
      Stack({ alignContent: Alignment.TopStart }) {
        if (this.page === 'welcome') {
          this.WelcomePage();
        } else if (this.page === 'login') {
          this.LoginPage();
        } else if (this.page === 'register') {
          this.RegisterPage();
        } else if (this.page === 'identity') {
          this.IdentityPage();
        } else if (this.page === 'explore') {
          this.ExplorePage();
        } else if (this.page === 'place') {
          this.PlacePage();
        } else if (this.page === 'placeActivity') {
          this.PlaceActivityPage();
        } else if (this.page === 'placeRoom' || this.page === 'placeChat') {
          this.PlaceRoomPage();
        } else if (this.page === 'routePlan') {
          this.RoutePlanPage();
        } else if (this.page === 'routePlanAR') {
          this.RoutePlanARPage();
        } else if (this.page === 'aiRoute') {
          this.AIRoutePage();
        } else if (this.page === 'interest') {
          this.InterestPage();
        } else if (this.page === 'interestDetail') {
          this.InterestDetailPage();
        } else if (this.page === 'clubDetail') {
          this.ClubDetailPage();
        } else if (this.page === 'interestAI') {
          this.InterestAIPage();
        } else if (this.page === 'world') {
          this.WorldPage();
        } else if (this.page === 'cameraFull') {
          this.CameraFullPage();
        } else if (this.page === 'worldDetail') {
          this.WorldDetailPage();
        } else if (this.page === 'worldEditor') {
          this.WorldEditorPage();
        } else if (this.page === 'shareWorld') {
          this.ShareWorldPage();
        } else if (this.page === 'createWorld') {
          this.CreateWorldPage();
        } else if (this.page === 'chat') {
          this.ChatPage('chat');
        } else if (this.page === 'chatFriends') {
          this.ChatPage('friends');
        } else if (this.page === 'chatMoments') {
          this.ChatPage('moments');
        } else if (this.page === 'chatDetail') {
          this.ChatDetailPage();
        } else if (this.page === 'chatSettings') {
          this.ChatSettingsPage();
        } else if (this.page === 'leaderboard') {
          this.LeaderboardPage();
        } else if (this.page === 'profileDetail' || this.page === 'profileDetailReadOnly') {
          this.ProfileDetailPage(this.page === 'profileDetailReadOnly');
        } else if (this.page === 'profile') {
          this.ProfilePage();
        } else if (this.page === 'nfcTouch') {
          this.NfcTouchPage();
        } else if (this.page === 'merchantAction') {
          this.MerchantActionPage();
        } else if (this.page === 'merchantRatePlace') {
          this.MerchantRatePlacePage();
        } else if (this.page === 'merchantRateItem') {
          this.MerchantRateItemPage();
        } else if (this.page === 'merchantReward') {
          this.MerchantRewardPage();
        } else {
          this.ProfileSubPage();
        }
        // 底栏叠在内容之上(占满高度、内容贴底),这样毛玻璃背后才有内容可模糊。
        // 外层 Stack 是 TopStart 对齐,故这里用满高容器 + FlexAlign.End 把底栏压到底部。
        if (this.shouldShowTab()) {
          Column() {
            this.TabBar();
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.End)
          .hitTestBehavior(HitTestMode.Transparent);
        }
      }
      .layoutWeight(1)
      .width('100%')
      .backgroundColor(C_BG);
    }
    .width('100%')
    .height('100%')
    .backgroundColor(C_BG)
    .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM]);
  }

  @Builder
  NativeStatusBar() {
    // 顶部安全区占位:内容避开系统状态栏,真机上时间/电量由系统绘制。
    // 不再画写死的假状态栏文本,避免与系统状态栏内容重叠。
    Row() {
    }
    .width('100%')
    .height(52)
    // 底色跟随当前页,避免与页面背景出现一条接缝(探索页地图是 #E8ECE5,其余页是 C_BG)。
    .backgroundColor(this.page === 'explore' ? '#E8ECE5' : C_BG);
  }


  @Builder
  WelcomePage() {
    Scroll() {
      Column() {
        Row() {
          this.SmallLogo(28);
          Text('MicroWorld')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_INK)
            .margin({ left: 9 });
        }
        .width('100%')
        .margin({ top: 6 });

        Stack() {
          Text('')
            .width('100%')
            .height(260)
            .backgroundColor(C_GREEN_PALE)
            .borderRadius(26);
          Text('MW')
            .fontSize(64)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_DARK)
            .position({ x: 44, y: 68 });
          Text('◎ 到场 · State Library')
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_DEEP)
            .padding({ left: 14, right: 14, top: 8, bottom: 8 })
            .backgroundColor('#F9FBF7')
            .borderRadius(20)
            .position({ x: 24, y: 210 });
          Text('◆')
            .fontSize(30)
            .fontColor(C_ORANGE)
            .position({ x: 260, y: 134 });
        }
        .width('100%')
        .height(260)
        .margin({ top: 30 });

        Text('线下相遇 × 实景互动 × 虚拟世界')
          .fontSize(11)
          .fontWeight(FontWeight.Bold)
          .fontColor('#8A9384')
          .letterSpacing(2)
          .width('100%')
          .margin({ top: 34 });
        Text('在真实地点，遇见同频的人')
          .fontSize(30)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .lineHeight(38)
          .width('100%')
          .margin({ top: 10 });
        Text('探索附近兴趣空间，参与线下活动，用实景互动发现隐藏任务，和真实见过的人建立连接。')
          .fontSize(15)
          .fontColor(C_MUTED)
          .lineHeight(23)
          .width('100%')
          .margin({ top: 14 });

        Button('开始探索')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 42 })
          .onClick(() => this.go('register'));
        Button('已有账号登录')
          .width('100%')
          .height(50)
          .fontSize(15)
          .fontColor('#3A4038')
          .backgroundColor(Color.Transparent)
          .margin({ top: 12, bottom: 24 })
          .onClick(() => this.go('login'));
      }
      .padding({ left: 28, right: 28, bottom: 26 })
      .width('100%');
    }
    .align(Alignment.Top)
    .width('100%')
    .height('100%');
  }

  @Builder
  LoginPage() {
    Scroll() {
      Column() {
        this.BrandLine();
        Text('欢迎回来')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 34 });
        Text('登录后同步你真实见过的人和地点足迹')
          .fontSize(15)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 10, bottom: 28 });

        this.InputBlock('邮箱', 'name@example.com', this.loginEmail, false);
        this.InputBlock('密码', '至少 8 位密码', this.loginPassword, true);

        Row() {
          Text('●')
            .fontSize(13)
            .fontColor(C_GOLD);
          Text(this.backendStatus)
            .fontSize(13)
            .fontColor('#8A7A55')
            .lineHeight(19)
            .margin({ left: 8 });
        }
        .width('100%')
        .padding(14)
        .backgroundColor('#F3EDE4')
        .borderRadius(13)
        .margin({ top: 18 });

        Button('登录并进入')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 42 })
          .enabled(this.startupReady && !this.authBusy)
          .onClick(() => { this.loginWithBackend(); });
        Button('创建新账号')
          .width('100%')
          .height(50)
          .fontSize(15)
          .fontColor('#3A4038')
          .backgroundColor(Color.Transparent)
          .margin({ top: 12 })
          .onClick(() => this.go('register'));
      }
      .width('100%')
      .padding({ left: 28, right: 28, top: 14, bottom: 32 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  RegisterPage() {
    Scroll() {
      Column() {
        this.BackHeader('创建账号', 'welcome');
        Text('建立低压力的线下社交身份')
          .fontSize(15)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ bottom: 26 });
        this.InputBlock('昵称', '城市书签', this.registerName, false);
        this.InputBlock('邮箱', 'name@example.com', this.loginEmail, false);
        this.InputBlock('密码', '至少 8 位密码', this.loginPassword, true);
        this.InputBlock('确认密码', '再次输入密码', this.registerConfirm, true);
        Row() {
          Text('✓')
            .fontSize(13)
            .fontColor(Color.White)
            .width(20)
            .height(20)
            .textAlign(TextAlign.Center)
            .backgroundColor(C_DEEP)
            .borderRadius(6);
          Text('我同意用户协议和隐私政策')
            .fontSize(13)
            .fontColor(C_MUTED)
            .margin({ left: 11 });
        }
        .width('100%')
        .margin({ top: 18 });
        Row() {
          Text('●')
            .fontSize(13)
            .fontColor(C_GOLD);
          Text(this.backendStatus)
            .fontSize(13)
            .fontColor('#8A7A55')
            .lineHeight(19)
            .layoutWeight(1)
            .margin({ left: 8 });
        }
        .width('100%')
        .padding(14)
        .backgroundColor('#F3EDE4')
        .borderRadius(13)
        .margin({ top: 16 });
        Button('创建账号')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 28 })
          .enabled(this.startupReady && !this.authBusy)
          .onClick(() => { this.registerWithBackend(); });
      }
      .padding({ left: 28, right: 28, top: 14, bottom: 32 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  IdentityPage() {
    Scroll() {
      Column() {
        this.BrandLine();
        Text('创建你的线下社交身份')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .lineHeight(34)
          .width('100%')
          .margin({ top: 26 });
        Text('选择兴趣，让城市推荐更适合你')
          .fontSize(14)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 10, bottom: 22 });
        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(INTEREST_NAMES, (item: string) => {
            this.SelectableChip(item, this.selectedInterests.indexOf(item) >= 0, () => this.toggleInterest(item));
          }, (item: string) => item);
        }
        .width('100%');
        Text('你来到 MicroWorld，是为了：')
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 28, bottom: 14 });
        ForEach(INTENTS, (item: string) => {
          Row() {
            Text(this.selectedIntent === item ? '●' : '○')
              .fontSize(18)
              .fontColor(this.selectedIntent === item ? C_DEEP : '#A8A294');
            Text(item)
              .fontSize(15)
              .fontWeight(this.selectedIntent === item ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(C_INK)
              .margin({ left: 12 });
            Blank();
          }
          .width('100%')
          .height(50)
          .padding({ left: 16, right: 16 })
          .backgroundColor(this.selectedIntent === item ? '#EEF3F1' : C_CARD)
          .border({ width: 1, color: this.selectedIntent === item ? C_DEEP : C_LINE })
          .borderRadius(15)
          .margin({ bottom: 11 })
          .onClick(() => { this.selectedIntent = item; });
        }, (item: string) => item);
        Button('保存并进入 MicroWorld')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 16, bottom: 30 })
          .enabled(!this.identitySaving)
          .onClick(() => { this.saveIdentityWithBackend(); });
        Text(this.backendStatus).fontSize(12).fontColor(C_MUTED).width('100%');
      }
      .padding({ left: 28, right: 28, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  ExplorePage() {
    Stack() {
      // 华为原生 Map Kit 真实地图(需 AGC 地图服务 + agconnect-services.json,真机渲染)。
      MapComponent({ mapOptions: this.mapOptions, mapCallback: this.mapCallback })
        .width('100%')
        .height('100%');
      Column() {
        this.SearchHeader();
        Blank();
        if (this.exploreLoading) {
          Text('正在加载地点…').padding(20).backgroundColor(C_CARD).borderRadius(16);
        } else if (this.exploreError.length > 0) {
          Column() {
            Text(this.exploreError).fontColor(C_ORANGE);
            Button('重试').onClick(() => { this.loadExploreData(); });
          }.padding(20).backgroundColor(C_CARD).borderRadius(16);
        } else if (this.places.length === 0) {
          Text('没有符合条件的地点').padding(20).backgroundColor(C_CARD).borderRadius(16);
        } else {
          this.SelectedPlaceSheet();
        }
      }
      .width('100%')
      .height('100%')
      .padding({ left: 16, right: 16, top: 14, bottom: 92 });
    }
    .height('100%')
    .width('100%')
    .backgroundColor('#E8ECE5');
  }

  @Builder
  MapSurface() {
    Stack() {
      Text('')
        .width('100%')
        .height('100%')
        .backgroundColor('#E8ECE5');
      Text('')
        .width(540)
        .height(18)
        .backgroundColor('#FDFDF7')
        .opacity(0.8)
        .borderRadius(10)
        .rotate({ angle: 18 })
        .position({ x: -70, y: 160 });
      Text('')
        .width(560)
        .height(14)
        .backgroundColor('#FFFFFF')
        .opacity(0.62)
        .borderRadius(10)
        .rotate({ angle: -10 })
        .position({ x: -40, y: 430 });
      Text('')
        .width(16)
        .height(760)
        .backgroundColor('#FFFFFF')
        .opacity(0.5)
        .borderRadius(10)
        .rotate({ angle: 13 })
        .position({ x: 160, y: -50 });
      Text('●')
        .fontSize(22)
        .fontColor(C_BLUE)
        .position({ x: 172, y: 390 });
      this.MapPin(this.placeAt(0).shortName, 88, 260, 0);
      this.MapPin(this.placeAt(1).shortName, 238, 336, 1);
      this.MapPin(this.placeAt(2).shortName, 78, 520, 2);
      Text('高德地图 · 墨尔本')
        .fontSize(11)
        .fontWeight(FontWeight.Bold)
        .fontColor('#7C8378')
        .padding({ left: 11, right: 11, top: 5, bottom: 5 })
        .backgroundColor('#F9FBF7')
        .borderRadius(9)
        .position({ x: 16, y: 626 });
    }
    .width('100%')
    .height('100%');
  }

  @Builder
  MapPin(label: string, x: number, y: number, index: number) {
    Column() {
      Text(label)
        .fontSize(12)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .padding({ left: 12, right: 12, top: 7, bottom: 7 })
        .backgroundColor(index === this.selectedPlaceIndex ? C_DEEP : '#6F7C72')
        .borderRadius(18);
      Text('◆')
        .fontSize(24)
        .fontColor(index === this.selectedPlaceIndex ? C_ORANGE : C_DEEP)
        .margin({ top: -2 });
    }
    .position({ x, y })
    .onClick(() => { this.selectedPlaceIndex = index; this.loadPlaceDetail(); });
  }

  @Builder
  SearchHeader() {
    Column() {
      Row() {
        Text('⌕')
          .fontSize(18)
          .fontColor('#AEB1A6');
        TextInput({ placeholder: '搜索地点，输入后按搜索', text: this.exploreQuery })
          .layoutWeight(1)
          .height(42)
          .fontSize(14)
          .backgroundColor(Color.Transparent)
          .margin({ left: 8 })
          .enterKeyType(EnterKeyType.Search)
          .onChange((value: string) => { this.exploreQuery = value; })
          .onSubmit(() => { this.loadExploreData(); });
        Text('≡')
          .fontSize(17)
          .fontColor(Color.White)
          .width(32)
          .height(32)
          .textAlign(TextAlign.Center)
          .backgroundColor(C_DEEP)
          .borderRadius(11);
      }
      .width('100%')
      .height(58)
      .padding({ left: 16, right: 14 })
      .backgroundColor('#FAFCF8')
      .borderRadius(16);

      Scroll() {
        Row() {
          ForEach(FILTERS, (item: string) => {
            this.FilterChip(item);
          }, (item: string) => item);
        }
      }
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .height(42)
      .margin({ top: 11 });
    }
    .width('100%');
  }

  @Builder
  SelectedPlaceSheet() {
    Column() {
      Text('')
        .width(38)
        .height(4)
        .backgroundColor('#E2DED3')
        .borderRadius(3)
        .margin({ top: 9, bottom: 9 });
      Stack() {
        Text('')
          .width('100%')
          .height(96)
          .backgroundColor(C_GREEN_PALE)
          .borderRadius(16);
        Text('★ ' + this.currentPlace().rating + ' · ' + this.currentPlace().trust)
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_DEEP)
          .padding({ left: 11, right: 11, top: 5, bottom: 5 })
          .backgroundColor('#F9FBF7')
          .borderRadius(18)
          .position({ x: 13, y: 58 });
        Text('◎ 到场 ' + this.currentPlace().attend)
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 10, right: 10, top: 5, bottom: 5 })
          .backgroundColor('#1F241FCC')
          .borderRadius(18)
          .position({ x: 224, y: 12 });
      }
      .height(96)
      .width('100%')
      .padding({ left: 12, right: 12 });
      Column() {
        Text(this.currentPlace().name)
          .fontSize(17)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%');
        Text(this.currentPlace().category)
          .fontSize(13)
          .fontColor('#7C8378')
          .width('100%')
          .margin({ top: 5 });
        Row() {
          this.ScorePill('舒适 ' + this.currentPlace().comfort);
          this.ScorePill('匹配 ' + this.currentPlace().match);
          this.ScorePill(this.currentPlace().trust);
        }
        .margin({ top: 12 });
        Row() {
          Button('查看详情')
            .layoutWeight(1)
            .height(42)
            .fontColor(Color.White)
            .backgroundColor(C_DEEP)
            .borderRadius(13)
            .onClick(() => { this.loadPlaceDetail(); this.go('place'); });
          Button('导航')
            .layoutWeight(1)
            .height(42)
            .fontColor(C_DEEP)
            .backgroundColor(C_CARD)
            .border({ width: 1, color: '#D8E0D4' })
            .borderRadius(13)
            .margin({ left: 10 })
            .onClick(() => this.go('routePlan'));
        }
        .width('100%')
        .margin({ top: 15, bottom: 16 });
      }
      .padding({ left: 17, right: 17, top: 14 });
    }
    .width('100%')
    .backgroundColor(C_CARD)
    .borderRadius(24)
    .border({ width: 1, color: C_LINE });
  }

  @Builder
  PlacePage() {
    Scroll() {
      Column() {
        this.BackHeader(this.currentPlace().shortName, 'explore');
        Stack() {
          Text('')
            .width('100%')
            .height(170)
            .backgroundColor(C_GREEN_PALE)
            .borderRadius(22);
          Text(this.currentPlace().shortName)
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_DARK)
            .position({ x: 18, y: 108 });
          Text('★ ' + this.currentPlace().rating + ' · ' + this.currentPlace().trust)
            .fontSize(12)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_DEEP)
            .padding({ left: 11, right: 11, top: 6, bottom: 6 })
            .backgroundColor('#FFFFFFEE')
            .borderRadius(18)
            .position({ x: 16, y: 18 });
        }
        .height(170)
        .width('100%')
        .margin({ top: 8 });
        Text(this.currentPlace().intro)
          .fontSize(15)
          .fontColor(C_MUTED)
          .lineHeight(24)
          .width('100%')
          .margin({ top: 18 });
        this.RatingCard();
        this.SectionTitle('正在进行的活动 / 比赛', '地点页可用');
        ForEach(this.currentPlace().activities, (item: string, index: number) => {
          Row() {
            this.AvatarBox('赛', '#F0ECF6', '#7A5CC0', 42);
            Column() {
              Text(item)
                .fontSize(15)
                .fontWeight(FontWeight.Bold)
                .fontColor(C_INK)
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis });
              Text('到场后可加入，公共聊天和分享只在本地点页开放')
                .fontSize(12)
                .fontColor(C_MUTED)
                .lineHeight(18)
                .margin({ top: 4 });
            }
            .layoutWeight(1)
            .margin({ left: 12 });
            Text('›')
              .fontSize(22)
              .fontColor('#C7C2B5');
          }
          .width('100%')
          .padding(14)
          .backgroundColor(C_CARD)
          .border({ width: 1, color: C_LINE })
          .borderRadius(15)
          .margin({ bottom: 10 })
          .onClick(() => { this.selectedActivityIndex = index; this.go('placeActivity'); });
        }, (item: string) => item);
        this.SectionTitle('排行榜与 NFT 奖牌', '真实行为核验');
        ForEach(this.currentPlace().medals, (item: string) => {
          this.ListCard('🏅', item, '真实到场、任务或比赛后可领取展示');
        }, (item: string) => item);
        Row() {
          Button('地点广场')
            .layoutWeight(1)
            .height(50)
            .fontColor(C_DEEP)
            .backgroundColor('#EEF3F1')
            .borderRadius(16)
            .onClick(() => { this.openPlaceRoom(); this.go('placeChat'); });
          Button('导航')
            .layoutWeight(1)
            .height(50)
            .fontColor(Color.White)
            .backgroundColor(C_DEEP)
            .borderRadius(16)
            .margin({ left: 10 })
            .onClick(() => this.go('routePlan'));
        }
        .margin({ top: 18, bottom: 28 });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  RatingCard() {
    Column() {
      Text('线下社交五维评分')
        .fontSize(17)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .width('100%');
      this.RatingRow('社交舒适度', this.currentPlace().comfort);
      this.RatingRow('兴趣匹配度', this.currentPlace().match);
      this.RatingRow('安全感', this.currentPlace().safety);
      this.RatingRow('活动质量', this.currentPlace().activity);
      this.RatingRow('小世界丰富度', this.currentPlace().world);
      Text('真实碰触评价数 ' + this.currentPlace().attend + ' · 复参率 42% · ' + this.currentPlace().trust)
        .fontSize(12)
        .fontColor(C_MUTED)
        .margin({ top: 12 });
    }
    .width('100%')
    .padding(16)
    .backgroundColor(C_CARD)
    .border({ width: 1, color: C_LINE })
    .borderRadius(18)
    .margin({ top: 16 });
  }

  @Builder
  PlaceActivityPage() {
    Scroll() {
      Column() {
        this.BackHeader('活动 / 比赛详情', 'place');
        Text(this.currentActivity())
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 12 });
        Text(this.currentPlace().shortName + ' · 到场后可报名')
          .fontSize(13)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 6 });
        Row() {
          this.ScorePill('比赛');
          this.ScorePill('现场组队');
          this.ScorePill('12 名额');
        }
        .margin({ top: 14 });
        this.SectionTitle('活动简介', '低压力破冰');
        Text('在真实地点完成一个轻量任务，用共同目标自然开始对话。你可以旁听、加入，也可以只收藏活动。')
          .fontSize(14)
          .fontColor('#3A4038')
          .lineHeight(23)
          .width('100%');
        this.SectionTitle('规则', '真实到场');
        this.ListCard('1', '现场组队', '需要到达地点后才开放完整互动');
        this.ListCard('2', '尊重低打扰', '不强制自我介绍，不向未确认的人私聊');
        this.SectionTitle('奖励', '徽章 / 积分');
        this.ListCard('🏅', '城市探索赛徽章 + 50 积分', '可在个人奖杯和地点排行榜展示');
        Button('报名参加')
          .width('100%')
          .height(54)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 18, bottom: 28 })
          .onClick(() => this.go('place'));
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  PlaceRoomPage() {
    Column() {
      Column() {
        this.BackHeader('地点广场 · 公共聊天', 'place');
      }
      .padding({ left: 22, right: 22 });
      Text('仅保留最近 1 小时的消息 · 不可加好友。公共聊天与分享必须从地点页面进入。')
        .fontSize(13)
        .fontColor(C_MUTED)
        .lineHeight(20)
        .padding(12)
        .backgroundColor('#EEF3F1')
        .borderRadius(14)
        .margin({ left: 22, right: 22, top: 4 });
      Scroll() {
        Column() {
          ForEach(this.placeRoomPosts, (item: MomentItem) => {
            this.ChatBubble(item.author, item.text, item.author === '我');
          }, (item: MomentItem) => item.author + item.text + item.time);
        }
        .padding({ left: 22, right: 22, top: 16, bottom: 16 });
      }
      .align(Alignment.Top)
      .layoutWeight(1);
      Row() {
        TextInput({ placeholder: '在当前地点发言...', text: this.messageDraft })
          .layoutWeight(1)
          .height(46)
          .backgroundColor(C_CARD)
          .borderRadius(18)
          .onChange((value: string) => { this.messageDraft = value; });
        Button('发送')
          .width(76)
          .height(46)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ left: 8 })
          .onClick(() => { this.sendPlaceRoomMessage(); });
      }
      .padding({ left: 22, right: 22, bottom: 18 });
    }
    .height('100%');
  }

  @Builder
  RoutePlanPage() {
    Scroll() {
      Column() {
        this.BackHeader('路线规划', 'explore');
        Text('前往 ' + this.currentPlace().shortName)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 8 });
        Row() {
          Text('2D 导航')
            .layoutWeight(1)
            .height(38)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .textAlign(TextAlign.Center)
            .backgroundColor(C_DEEP)
            .borderRadius(10);
          Text('AR 实景导航')
            .layoutWeight(1)
            .height(38)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_MUTED)
            .textAlign(TextAlign.Center)
            .borderRadius(10)
            .onClick(() => this.go('routePlanAR'));
        }
        .padding(4)
        .backgroundColor('#EEEAE0')
        .borderRadius(13)
        .margin({ top: 14 });
        Row() {
          this.StatBox(this.routeDistance.length > 0 ? this.routeDistance : this.currentPlace().distance, '距离');
          this.StatBox(this.routeDuration, '步行');
          this.StatBox('低压力', '社交');
        }
        .width('100%')
        .padding(12)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: C_LINE })
        .borderRadius(16)
        .margin({ top: 14 });
        Stack() {
          Text('')
            .width('100%')
            .height(190)
            .backgroundColor('#E8ECE5')
            .borderRadius(16);
          Text('当前位置')
            .fontSize(12)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_BLUE)
            .position({ x: 28, y: 132 });
          Text(this.currentPlace().shortName)
            .fontSize(12)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_DEEP)
            .position({ x: 184, y: 52 });
          Text('')
            .width(220)
            .height(3)
            .backgroundColor('#FFFFFF')
            .borderRadius(2)
            .rotate({ angle: -20 })
            .position({ x: 46, y: 98 });
        }
        .height(190)
        .width('100%')
        .margin({ top: 14 });
        this.ListCard('步', '系统导航', '打开系统导航前往当前地点');
        Button('AI 导游')
          .width('100%')
          .height(54)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 18, bottom: 28 })
          .onClick(() => this.go('aiRoute'));
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  RoutePlanARPage() {
    Scroll() {
      Column() {
        Row() {
          Text('‹')
            .fontSize(34)
            .fontColor('#CFC7E6')
            .width(38)
            .height(40)
            .textAlign(TextAlign.Center)
            .onClick(() => this.go('routePlan'));
          Text('AR 实景导航')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis });
          Blank();
        }
        .width('100%')
        .height(48)
        .alignItems(VerticalAlign.Center)
        .margin({ bottom: 8 });
        Text('前往 ' + this.currentPlace().shortName)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .width('100%')
          .margin({ top: 8 });
        Row() {
          Text('2D 导航')
            .layoutWeight(1)
            .height(38)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor('#CFC7E6')
            .textAlign(TextAlign.Center)
            .borderRadius(10)
            .onClick(() => this.go('routePlan'));
          Text('AR 实景导航')
            .layoutWeight(1)
            .height(38)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .textAlign(TextAlign.Center)
            .backgroundColor('#7A5CC0')
            .borderRadius(10);
        }
        .padding(4)
        .backgroundColor('#FFFFFF1F')
        .borderRadius(13)
        .margin({ top: 14 });
        Stack() {
          Text('')
            .width('100%')
            .height(260)
            .backgroundColor('#2B2B34')
            .borderRadius(18);
          Text('AR 相机画面')
            .fontSize(13)
            .fontColor('#CFC7E6')
            .position({ x: 18, y: 18 });
          Text('➜')
            .fontSize(92)
            .fontColor('#9A7AD0')
            .position({ x: 128, y: 78 });
          Text('箭头指向 ' + this.currentPlace().shortName + ' 主入口')
            .fontSize(12)
            .fontColor('#CFC7E6')
            .position({ x: 18, y: 224 });
        }
        .height(260)
        .width('100%')
        .margin({ top: 16 });
        Button('生成 AI 轻社交路线')
          .width('100%')
          .height(54)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
          .backgroundColor('#7A5CC0')
          .borderRadius(18)
          .margin({ top: 20, bottom: 28 })
          .onClick(() => this.go('aiRoute'));
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%')
    .backgroundColor('#1C1C22');
  }

  @Builder
  AIRoutePage() {
    Scroll() {
      Column() {
        this.BackHeader('AI 导游', 'routePlan');
        Text('今天适合你的路线')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 8 });
        Text('轻社交 · 90 分钟 · 读书 / 咖啡')
          .fontSize(13)
          .fontColor(C_MUTED)
          .margin({ top: 6 });
        Row() {
          this.ScorePill('安静探索');
          this.ScorePill('3 公里内');
          this.ScorePill('低压力');
        }
        .margin({ top: 14 });
        this.ListCard('1', 'Market Lane Coffee 轻量破冰', '先从低压力咖啡空间开始，不直接强社交');
        this.ListCard('2', 'State Library 旁听读书交流', '到场后可以旁听，再决定是否加入');
        this.ListCard('3', 'Carlton Gardens 摄影角收尾漫步', '用城市观察自然结束路线');
        Button('开始这条路线')
          .width('100%')
          .height(54)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 18, bottom: 28 })
          .onClick(() => this.go('explore'));
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  InterestPage() {
    Scroll() {
      Column() {
        this.PageTitle('兴趣', '按分类找到你的兴趣、人和地方');
        // 左侧竖排分类栏 + 右侧搜索与卡片(对齐设计原型)。
        Row() {
          Column() {
            ForEach(this.interestCategories, (item: string) => {
              this.InterestCatChip(item);
            }, (item: string) => item);
          }
          .width(72);
          Column() {
            TextInput({ placeholder: '搜索兴趣，输入后按搜索', text: this.interestQuery })
              .height(44)
              .fontSize(14)
              .backgroundColor(C_CARD)
              .borderRadius(14)
              .margin({ bottom: 12 })
              .enterKeyType(EnterKeyType.Search)
              .onChange((value: string) => { this.interestQuery = value; })
              .onSubmit(() => { this.loadInterestData(); });
            Button('搜索 / 刷新').onClick(() => { this.loadInterestData(); });
            if (this.interestLoading) {
              Text('正在加载…').fontColor(C_MUTED).padding(16);
            } else if (this.interestError.length > 0) {
              Text(this.interestError).fontColor(C_ORANGE).padding(16);
              Button('重试').onClick(() => { this.loadInterestData(); });
            } else if (this.interests.length === 0) {
              Text('暂无兴趣内容')
                .fontSize(14)
                .fontColor(C_MUTED)
                .width('100%')
                .padding({ top: 24, bottom: 24 });
            }
            ForEach(this.interests, (item: InterestItem, index: number) => {
              Column() {
                Row() {
                  this.AvatarBox(item.icon, C_GREEN_PALE, C_DEEP, 38);
                  Text(item.name)
                    .fontSize(16)
                    .fontWeight(FontWeight.Bold)
                    .fontColor(C_INK)
                    .layoutWeight(1)
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                    .margin({ left: 10 });
                }
                .width('100%');
                Text(item.intro)
                  .fontSize(12)
                  .fontColor(C_MUTED)
                  .lineHeight(18)
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .width('100%')
                  .margin({ top: 8 });
                Text(item.clubs.length + ' 俱乐部 · ' + item.clubs.join(' / '))
                  .fontSize(11)
                  .fontColor(C_DEEP)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .width('100%')
                  .margin({ top: 8 });
              }
              .padding(14)
              .backgroundColor(C_CARD)
              .border({ width: 1, color: C_LINE })
              .borderRadius(16)
              .margin({ bottom: 10 })
              .onClick(() => { this.selectedInterestIndex = index; this.go('interestDetail'); });
            }, (item: InterestItem) => item.id);
          }
          .layoutWeight(1)
          .margin({ left: 12 });
        }
        .width('100%')
        .alignItems(VerticalAlign.Top)
        .margin({ top: 16 });
        Button('不知道从哪开始？兴趣指南')
          .width('100%')
          .height(48)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(16)
          .margin({ top: 6 })
          .onClick(() => this.go('interestAI'));
      }
      .padding({ left: 22, right: 22, top: 16, bottom: 96 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  InterestDetailPage() {
    Scroll() {
      Column() {
        this.BackHeader(this.currentInterest().name, 'interest');
        Row() {
          this.AvatarBox(this.currentInterest().icon, C_GREEN_PALE, C_DEEP, 72);
          Column() {
            Text(this.currentInterest().name)
              .fontSize(24)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK);
            Text(this.currentInterest().intro)
              .fontSize(14)
              .fontColor(C_MUTED)
              .lineHeight(21)
              .margin({ top: 6 });
          }
          .layoutWeight(1)
          .margin({ left: 14 });
        }
        .width('100%')
        .margin({ top: 8 });
        this.ListCard('法', '学习方法', this.currentInterest().method);
        this.SectionTitle('名下俱乐部', '同兴趣的人');
        ForEach(this.currentInterest().clubs, (club: string) => {
          Row() {
            this.AvatarBox('⌂', '#F5F3EE', C_DEEP, 42);
            Column() {
              Text(club)
                .fontSize(15)
                .fontWeight(FontWeight.Bold)
                .fontColor(C_INK);
              Text('进入俱乐部可查看活动、榜单和关联地标')
                .fontSize(12)
                .fontColor(C_MUTED)
                .lineHeight(18)
                .margin({ top: 4 });
            }
            .layoutWeight(1)
            .margin({ left: 12 });
            Text('›')
              .fontSize(22)
              .fontColor('#C7C2B5');
          }
          .width('100%')
          .padding(14)
          .backgroundColor(C_CARD)
          .border({ width: 1, color: C_LINE })
          .borderRadius(15)
          .margin({ bottom: 10 })
          .onClick(() => this.go('clubDetail'));
        }, (club: string) => club);
        this.SectionTitle('关联地标', '附近可线下参与');
        ForEach(this.currentInterest().places, (place: string) => {
          this.ListCard('◎', place, '发现与这个兴趣有关的真实地点');
        }, (place: string) => place);
        Button('兴趣 AI 助手')
          .width('100%')
          .height(52)
          .fontColor(C_BLUE)
          .fontWeight(FontWeight.Bold)
          .backgroundColor(C_CARD)
          .border({ width: 1, color: '#CDD9EF' })
          .borderRadius(16)
          .margin({ top: 18 })
          .onClick(() => this.go('interestAI'));
      }
      .padding({ left: 22, right: 22, top: 14, bottom: 28 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  ClubDetailPage() {
    Scroll() {
      Column() {
        this.BackHeader('俱乐部', 'interest');
        this.ListCard('⌂', 'State Library Reading Club', '读书 / 安静社交 / 新人友好');
        Row() {
          this.AvatarBox('榜', '#FDF7EC', C_GOLD, 42);
          Column() {
            Text('本月排行榜')
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK);
            Text('林间书页 156 · 城市手帐 132 · 慢半拍摄影 98')
              .fontSize(12)
              .fontColor(C_MUTED)
              .margin({ top: 4 });
          }
          .layoutWeight(1)
          .margin({ left: 12 });
          Text('›')
            .fontSize(22)
            .fontColor('#C7C2B5');
        }
        .width('100%')
        .padding(14)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: C_LINE })
        .borderRadius(15)
        .margin({ bottom: 10 })
        .onClick(() => this.go('leaderboard'));
        this.ListCard('◎', '关联地标', 'State Library · City Book Corner');
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  InterestAIPage() {
    Scroll() {
      Column() {
        this.BackHeader('兴趣 AI 助手', 'interestDetail');
        Text('想开始 ' + this.currentInterest().name + '，可以怎么做？')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .lineHeight(30)
          .width('100%')
          .margin({ top: 8 });
        Text('AI 助手后端暂缓，当前保留旧原型里的问答入口和建议卡片。')
          .fontSize(13)
          .fontColor(C_MUTED)
          .lineHeight(20)
          .width('100%')
          .margin({ top: 8 });
        this.ListCard('1', '入门方法', this.currentInterest().method);
        this.ListCard('2', '推荐俱乐部', this.currentInterest().clubs.join(' / '));
        this.ListCard('3', '推荐地标', this.currentInterest().places.join(' / '));
      }
      .padding({ left: 22, right: 22, top: 14, bottom: 28 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  WorldTabItem(label: string, tab: string) {
    Text(label)
      .layoutWeight(1)
      .height(38)
      .fontSize(13)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.worldTab === tab ? Color.White : '#5A6056')
      .textAlign(TextAlign.Center)
      .backgroundColor(this.worldTab === tab ? '#7A5CC0' : Color.Transparent)
      .borderRadius(10)
      .onClick(() => { this.worldTab = tab; });
  }

  @Builder
  WorldPage() {
    Scroll() {
      Column() {
        if (this.worldError.length > 0) {
          Text(this.worldError).fontColor(C_ORANGE).width('100%');
          Button('重试').onClick(() => { this.loadWorldData(); });
        } else if (this.worlds.length === 0 && this.worldTab === 'spaces') {
          Text('暂无可见的小世界，可以创建第一个').fontColor(C_MUTED).padding(16);
        }
        Row() {
          Column() {
            Text('世界')
              .fontSize(26)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK);
            Text(this.worldTab === 'scene' ? '到达真实地点，用实景发现任务' : '真实地点上的 3D 私有空间')
              .fontSize(13)
              .fontColor(C_MUTED)
              .margin({ top: 4 });
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start);
          if (this.worldTab === 'spaces') {
            Button('+')
              .width(44)
              .height(44)
              .fontSize(24)
              .fontColor(Color.White)
              .backgroundColor('#7A5CC0')
              .borderRadius(14)
              .onClick(() => this.go('createWorld'));
          }
        }
        .width('100%')
        .margin({ bottom: 16 });

        Row() {
          this.WorldTabItem('实景现场', 'scene');
          this.WorldTabItem('虚拟世界', 'spaces');
        }
        .width('100%')
        .padding(4)
        .backgroundColor('#EFEAF6')
        .borderRadius(13);

        if (this.worldTab === 'scene') {
          Stack() {
            Text('')
              .height(280)
              .width('100%')
              .backgroundColor('#23232B')
              .borderRadius(18);
            Text('实景相机')
              .fontSize(13)
              .fontColor('#CFC7E6')
              .position({ x: 18, y: 16 });
            Text('✨ 隐藏书签')
              .fontSize(13)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.White)
              .padding({ left: 12, right: 12, top: 8, bottom: 8 })
              .backgroundColor('#7A5CC0')
              .borderRadius(14)
              .position({ x: 42, y: 100 });
            Text('🌍 图书馆记忆墙')
              .fontSize(13)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.White)
              .padding({ left: 12, right: 12, top: 8, bottom: 8 })
              .backgroundColor(C_DEEP)
              .borderRadius(14)
              .position({ x: 132, y: 170 });
            Text('今日任务：找到隐藏书签 · 点击全屏')
              .fontSize(12)
              .fontColor('#CFC7E6')
              .position({ x: 18, y: 240 });
          }
          .height(280)
          .width('100%')
          .margin({ top: 16 })
          .onClick(() => this.go('cameraFull'));

          Row() {
            Button('扫描')
              .layoutWeight(1)
              .height(46)
              .fontColor(Color.White)
              .backgroundColor('#7A5CC0')
              .borderRadius(14)
              .onClick(() => this.go('cameraFull'));
            Button('附近的人')
              .layoutWeight(1)
              .height(46)
              .fontColor('#7A5CC0')
              .backgroundColor(C_CARD)
              .border({ width: 1, color: '#DDD2EF' })
              .borderRadius(14)
              .margin({ left: 10 })
              .onClick(() => this.go('cameraFull'));
          }
          .margin({ top: 12, bottom: 8 });
        } else {
          Row() {
            Text('我的世界')
              .fontSize(12)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.White)
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
              .backgroundColor('#9A7AD0')
              .borderRadius(14);
            Text('附近世界')
              .fontSize(12)
              .fontColor('#5A6056')
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
              .backgroundColor(C_CARD)
              .border({ width: 1, color: '#E7E2D8' })
              .borderRadius(14)
              .margin({ left: 8 });
          }
          .margin({ top: 18, bottom: 12 });

          ForEach(this.worlds, (world: WorldItem, index: number) => {
            Column() {
              Text(world.name)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor(C_INK)
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
                .width('100%');
              Text('绑定 ' + world.place + ' · ' + world.status)
                .fontSize(12)
                .fontColor('#9A7AD0')
                .fontWeight(FontWeight.Bold)
                .width('100%')
                .margin({ top: 5 });
              Text(world.desc)
                .fontSize(13)
                .fontColor(C_MUTED)
                .lineHeight(20)
                .width('100%')
                .margin({ top: 8 });
            }
            .padding(15)
            .backgroundColor(C_CARD)
            .border({ width: 1, color: C_LINE })
            .borderRadius(16)
            .margin({ bottom: 10 })
            .onClick(() => { this.selectedWorldIndex = index; this.go('worldDetail'); });
          }, (world: WorldItem) => world.id);

          Button('创建小世界')
            .width('100%')
            .height(50)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .backgroundColor('#7A5CC0')
            .borderRadius(16)
            .margin({ top: 6, bottom: 8 })
            .onClick(() => this.go('createWorld'));
        }
      }
      .padding({ left: 22, right: 22, top: 16, bottom: 96 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  CameraFullPage() {
    Column() {
      Row() {
        Text('‹ 世界实景')
          .fontSize(15)
          .fontColor('#CFC7E6')
          .onClick(() => this.go('world'));
        Blank();
        Text('完成')
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .padding({ left: 13, right: 13, top: 7, bottom: 7 })
          .backgroundColor('#7A5CC0')
          .borderRadius(9)
          .onClick(() => this.go('worldDetail'));
      }
      .width('100%');
      Stack() {
        Text('')
          .width('100%')
          .height('100%')
          .backgroundColor('#23232B')
          .borderRadius(18);
        Text('AR 相机画面')
          .fontSize(13)
          .fontColor('#CFC7E6')
          .position({ x: 22, y: 24 });
        Text('今日任务：找到隐藏书签')
          .fontSize(13)
          .fontColor('#E8E4F2')
          .padding({ left: 14, right: 14, top: 9, bottom: 9 })
          .backgroundColor('#00000066')
          .borderRadius(14)
          .position({ x: 24, y: 520 });
      }
      .layoutWeight(1)
      .width('100%')
      .margin({ top: 14 });
    }
    .height('100%')
    .padding({ left: 20, right: 20, top: 14, bottom: 24 })
    .backgroundColor('#1C1C22');
  }

  @Builder
  WorldDetailPage() {
    Scroll() {
      Column() {
        this.BackHeader(this.currentWorld().name, 'world');
        Text('绑定 ' + this.currentWorld().place + ' · ' + this.currentWorld().status)
          .fontSize(13)
          .fontColor('#9A7AD0')
          .fontWeight(FontWeight.Bold)
          .width('100%')
          .margin({ top: 4 });
        Stack() {
          Text('')
            .width('100%')
            .height(170)
            .backgroundColor('#241F2C')
            .borderRadius(16);
          Text('ArkGraphics3D')
            .fontSize(11)
            .fontColor(Color.White)
            .padding({ left: 8, right: 8, top: 4, bottom: 4 })
            .backgroundColor('#FFFFFF29')
            .borderRadius(6)
            .position({ x: 12, y: 10 });
          Text('')
            .width(44)
            .height(44)
            .backgroundColor('#7A5CC08A')
            .borderRadius(22)
            .position({ x: 44, y: 104 });
        }
        .height(170)
        .width('100%')
        .margin({ top: 14 });
        Row() {
          this.StatBox(this.currentWorld().visits, '访问');
          this.StatBox(this.currentWorld().builders, '共建');
          this.StatBox(this.currentWorld().objectCount || String(this.currentWorld().objects.length), '物件');
        }
        .padding(14)
        .backgroundColor(C_CARD)
        .borderRadius(16)
        .margin({ top: 14 });
        Row() {
          Button('进入建设')
            .layoutWeight(1)
            .height(50)
            .fontColor(Color.White)
            .fontWeight(FontWeight.Bold)
            .backgroundColor('#9A7AD0')
            .borderRadius(16)
            .onClick(() => this.go('worldEditor'));
          Button('共享')
            .layoutWeight(1)
            .height(50)
            .fontColor('#9A7AD0')
            .fontWeight(FontWeight.Bold)
            .backgroundColor(C_CARD)
            .border({ width: 1, color: '#DDD2EF' })
            .borderRadius(16)
            .margin({ left: 10 })
            .onClick(() => this.go('shareWorld'));
        }
        .margin({ top: 20, bottom: 28 });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  WorldEditorPage() {
    Column() {
      Row() {
        Text('‹ 建设：' + this.currentWorld().name)
          .fontSize(14)
          .fontColor('#CFC7E6')
          .onClick(() => this.go('worldDetail'));
        Blank();
        Text('保存')
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .padding({ left: 13, right: 13, top: 7, bottom: 7 })
          .backgroundColor('#9A7AD0')
          .borderRadius(9)
          .onClick(() => { this.addWorldAssetWithBackend(); });
      }
      .width('100%');
      Row() {
        this.ToolPill('选择', false);
        this.ToolPill('移动', true);
        this.ToolPill('旋转', false);
        this.ToolPill('缩放', false);
      }
      .margin({ top: 14 });
      Stack() {
        Text('')
          .width(124)
          .height(124)
          .backgroundColor('#9A7AD080')
          .borderRadius(26);
      }
      .layoutWeight(1)
      .width('100%')
      .align(Alignment.Center);
      Column() {
        Text('AI 创造物件')
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor('#CFC7E6')
          .width('100%');
        Text('由城市书签和柔和灯光组成的记忆树')
          .fontSize(12)
          .fontColor('#9B94AD')
          .lineHeight(18)
          .width('100%')
          .margin({ top: 5 });
        Button('生成')
          .width('100%')
          .height(42)
          .fontColor(Color.White)
          .backgroundColor('#9A7AD0')
          .borderRadius(10)
          .margin({ top: 10 })
          .onClick(() => { this.generateWorldAssetWithBackend(); });
      }
      .padding(14)
      .backgroundColor('#00000066')
      .borderRadius(14);
    }
    .height('100%')
    .padding({ left: 20, right: 20, top: 14, bottom: 24 })
    .backgroundColor('#201B28');
  }

  @Builder
  ShareWorldPage() {
    Scroll() {
      Column() {
        this.BackHeader('共享这个世界', 'worldDetail');
        Text('让朋友也能访问 / 共建这个小世界')
          .fontSize(13)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 6 });
        this.SectionTitle('谁可以看到', '可见范围');
        this.ListCard('●', '仅受邀朋友', '默认保护私人创作空间');
        this.ListCard('○', '附近所有人', '到场用户可以看见并申请共建');
        this.SectionTitle('分享方式', '链接 / 二维码 / 邀请');
        Row() {
          this.ShareBox('链', '复制链接');
          this.ShareBox('▦', '分享二维码');
          this.ShareBox('＋', '邀请好友');
        }
        .width('100%')
        .margin({ top: 10 });
        Button('完成')
          .width('100%')
          .height(54)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
          .backgroundColor('#9A7AD0')
          .borderRadius(18)
          .margin({ top: 24, bottom: 28 })
          .onClick(() => this.go('worldDetail'));
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  CreateWorldPage() {
    Scroll() {
      Column() {
        this.BackHeader('创建小世界', 'world');
        this.InputBlock('世界名称', '我的城市微缩世界', this.worldNameDraft, false);
        Text('绑定真实地点')
          .fontSize(11)
          .fontWeight(FontWeight.Bold)
          .fontColor('#9AA194')
          .width('100%')
          .margin({ top: 2, bottom: 8 });
        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(this.places, (place: PlaceItem) => {
            this.SelectableChip(place.shortName, this.worldPlaceIdDraft === place.id, () => { this.worldPlaceIdDraft = place.id; });
          }, (place: PlaceItem) => place.id);
        }
        Text('主题')
          .fontSize(11)
          .fontWeight(FontWeight.Bold)
          .fontColor('#9AA194')
          .width('100%')
          .margin({ top: 18, bottom: 8 });
        Row() {
          this.SelectableChip('记忆花园', this.worldThemeDraft === 'memoryGarden', () => { this.worldThemeDraft = 'memoryGarden'; });
          this.SelectableChip('城市工作室', this.worldThemeDraft === 'cityStudio', () => { this.worldThemeDraft = 'cityStudio'; });
        }
        Text('可见范围')
          .fontSize(11)
          .fontWeight(FontWeight.Bold)
          .fontColor('#9AA194')
          .width('100%')
          .margin({ top: 18, bottom: 8 });
        this.SelectableChip('仅自己可见', this.worldVisibilityDraft === 'private', () => { this.worldVisibilityDraft = 'private'; });
        this.SelectableChip('公开', this.worldVisibilityDraft === 'public', () => { this.worldVisibilityDraft = 'public'; });
        if (this.worldFormError.length > 0) {
          Text(this.worldFormError).fontColor(C_ORANGE).width('100%');
        }
        Button(this.worldSaving ? '正在创建…' : '生成小世界')
          .enabled(!this.worldSaving)
          .width('100%')
          .height(54)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
          .backgroundColor('#9A7AD0')
          .borderRadius(18)
          .margin({ top: 18, bottom: 26 })
          .onClick(() => { this.createWorldWithBackend(); });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  ChatPage(mode: string) {
    Scroll() {
      Column() {
        Row() {
          Column() {
            Text(mode === 'friends' ? '朋友' : (mode === 'moments' ? '动态' : '聊天'))
              .fontSize(24)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK);
            Text(mode === 'friends' ? '都是真实碰过面的人' : (mode === 'moments' ? '只看真实见过的人的动态' : '只显示真实见过或共同互动的人'))
              .fontSize(12)
              .fontColor(C_MUTED)
              .margin({ top: 4 });
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start);
          Column() {
            Text('🏆')
              .fontSize(16)
              .height(20);
            Text('排行榜')
              .fontSize(10)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_GOLD)
              .margin({ top: 2 });
          }
          .width(48)
          .height(44)
          .alignItems(HorizontalAlign.Center)
          .justifyContent(FlexAlign.Center)
          .backgroundColor('#FDF7EC')
          .border({ width: 1, color: '#ECDCBD' })
          .borderRadius(12)
          .onClick(() => this.go('leaderboard'));
        }
        .width('100%');
        Row() {
          this.ChatSegment('对话', 'chat', mode === 'chat');
          this.ChatSegment('朋友', 'chatFriends', mode === 'friends');
          this.ChatSegment('动态', 'chatMoments', mode === 'moments');
        }
        .width('100%')
        .margin({ top: 14, bottom: 10 });
        if (this.socialError.length > 0) {
          Text(this.socialError).fontColor(C_ORANGE).width('100%');
          Button('重试').onClick(() => { this.loadSocialData(); });
        }
        if (mode === 'moments') {
          if (this.moments.length === 0) {
            Text('暂无动态').fontColor(C_MUTED).padding(24);
          }
          ForEach(this.moments, (item: MomentItem) => {
            this.MomentCard(item);
          }, (item: MomentItem) => item.author + item.time);
        } else {
          if (this.people.length === 0) {
            Text(this.authToken.length === 0 ? '登录后查看朋友和对话' : '还没有建立连接的朋友')
              .fontColor(C_MUTED).padding(24);
          }
          ForEach(this.people, (person: ChatPerson, index: number) => {
            this.PersonCard(person, index, mode === 'friends');
          }, (person: ChatPerson) => person.id);
        }
      }
      .width('100%')
      .padding({ left: 22, right: 22, top: 16, bottom: 96 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  ChatDetailPage() {
    Column() {
      Row() {
        Text('‹')
          .fontSize(34)
          .fontColor(C_DEEP)
          .width(34)
          .onClick(() => this.go('chat'));
        Row() {
          this.AvatarBox(this.currentPerson().avatar, this.currentPerson().color, C_DEEP, 34);
        }
        .onClick(() => this.go('profileDetail'));
        Text(this.currentPerson().name)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .margin({ left: 10 });
        Blank();
        Text('•••')
          .fontSize(18)
          .fontColor(C_MUTED)
          .onClick(() => this.go('chatSettings'));
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 12, bottom: 10 })
      .border({ width: { bottom: 1 }, color: C_LINE });
      Text('你们的共同来源\n地点：' + this.currentPerson().place)
        .fontSize(12)
        .fontColor('#3F8A78')
        .lineHeight(18)
        .padding(10)
        .backgroundColor('#EEF3F1')
        .borderRadius(11)
        .margin({ left: 20, right: 20, top: 12 });
      Scroll() {
        Column() {
          if (this.chatError.length > 0) {
            Text(this.chatError).fontColor(C_ORANGE).width('100%');
            Button('重试加载').onClick(() => { this.loadChatMessages(); });
          } else if (this.chatMessages.length === 0) {
            Text(this.chatLoading ? '正在加载消息…' : '暂无消息，打个招呼吧')
              .fontColor(C_MUTED).padding(24);
          }
          ForEach(this.chatMessages, (message: ChatMessageItem) => {
            this.ChatBubble(message.mine ? '我' : this.currentPerson().name, message.text, message.mine);
          }, (message: ChatMessageItem) => message.id);
        }
        .padding({ left: 20, right: 20, top: 14, bottom: 14 });
      }
      .align(Alignment.Top)
      .layoutWeight(1);
      Row() {
        TextInput({ placeholder: '输入消息...', text: this.messageDraft })
          .maxLength(500)
          .layoutWeight(1)
          .height(44)
          .backgroundColor(C_CARD)
          .borderRadius(18)
          .onChange((value: string) => { this.messageDraft = value; });
        Button(this.sendingMessage ? '发送中' : '发送')
          .enabled(!this.sendingMessage && this.messageDraft.trim().length > 0)
          .width(76)
          .height(44)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ left: 8 })
          .onClick(() => { this.sendChatMessage(); });
      }
      .width('100%')
      .padding({ left: 20, right: 20, bottom: 18 });
    }
    .width('100%')
    .height('100%')
    .alignItems(HorizontalAlign.Start);
  }

  @Builder
  LeaderboardPage() {
    Scroll() {
      Column() {
        this.BackHeader('排行榜', 'chat');
        Row() {
          this.PillText('读书', true, C_GOLD);
          this.PillText('摄影', false, C_DEEP);
          this.PillText('全部', false, C_DEEP);
        }
        .margin({ top: 8, bottom: 14 });
        this.RankRow('1', '林间共读社', '读书俱乐部 · 非好友', '156', true);
        ForEach(this.people, (person: ChatPerson, index: number) => {
          this.RankRow((index + 2).toString(), person.name, person.tag, (132 - index * 18).toString(), false);
        }, (person: ChatPerson) => person.id);
      }
      .padding({ left: 22, right: 22, top: 14, bottom: 28 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  ChatSettingsPage() {
    Scroll() {
      Column() {
        this.BackHeader('聊天设置', 'chatDetail');
        Column() {
          this.AvatarBox(this.currentPerson().avatar, this.currentPerson().color, C_DEEP, 56);
          Text(this.currentPerson().name)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_INK)
            .margin({ top: 8 });
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .margin({ top: 8, bottom: 18 });
        this.ListCard('查', '查找聊天记录', '按地点、任务和关键词检索');
        this.ListCard('免', '消息免打扰', '当前关闭');
        this.ListCard('顶', '置顶聊天', '当前关闭');
        this.ListCard('★', '设为星标朋友', '标记真实见过、常联系的人');
        this.ListCard('清', '清空聊天记录', '仅清空本地消息展示');
        this.ListCard('删', '删除好友', '需要双方解除连接');
      }
      .padding({ left: 22, right: 22, top: 14, bottom: 28 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  PersonLinkRow(icon: string, tint: string, label: string) {
    Row() {
      this.AvatarBox(icon, '#F5F3EE', tint, 40);
      Text(label)
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .layoutWeight(1)
        .margin({ left: 12 });
      Text('›')
        .fontSize(24)
        .fontColor('#A8A294');
    }
    .width('100%')
    .padding({ left: 14, right: 14, top: 13, bottom: 13 })
    .backgroundColor(C_CARD)
    .border({ width: 1, color: C_LINE })
    .borderRadius(15)
    .margin({ bottom: 10 });
  }

  @Builder
  ProfileDetailPage(readOnly: boolean) {
    Scroll() {
      Column() {
        this.BackHeader(readOnly ? '只读资料' : '个人资料', readOnly ? 'leaderboard' : 'chatDetail');
        Column() {
          this.AvatarBox(readOnly ? '城' : this.currentPerson().avatar, readOnly ? '#EAF0FA' : this.currentPerson().color, readOnly ? C_BLUE : C_DEEP, 72);
          Text(readOnly ? '林间共读社' : this.currentPerson().name)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_INK)
            .margin({ top: 12 });
          Text(readOnly ? '读书类俱乐部 · 排行榜第 1 名' : this.currentPerson().tag)
            .fontSize(12)
            .fontColor(C_MUTED)
            .margin({ top: 4 });
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .margin({ top: 12 });
        this.ListCard('简', '简介', readOnly ? '128 名成员的读书俱乐部，每周举办 2 场共读活动。' : this.currentPerson().bio);
        this.ListCard('地', '相遇地点', readOnly ? '排行榜展示 · 非好友' : this.currentPerson().place);
        this.PersonLinkRow('🏆', C_GOLD, '比赛奖杯展示');
        this.PersonLinkRow('✦', C_BLUE, '个人动态');
        this.PersonLinkRow('◎', C_DEEP, '个人虚拟世界');
        if (!readOnly) {
          Button('发消息')
            .width('100%')
            .height(54)
            .fontColor(Color.White)
            .fontWeight(FontWeight.Bold)
            .backgroundColor(C_DEEP)
            .borderRadius(18)
            .margin({ top: 16 })
            .onClick(() => this.go('chatDetail'));
        } else {
          Text('非好友 · 暂不可发消息或添加好友')
            .fontSize(12)
            .fontColor('#A8A294')
            .textAlign(TextAlign.Center)
            .width('100%')
            .margin({ top: 16 });
        }
      }
      .padding({ left: 22, right: 22, top: 14, bottom: 28 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  ProfilePage() {
    Scroll() {
      Column() {
        this.PageTitle('我', '个人身份、兴趣标签、线下足迹和隐私设置');
        Row() {
          this.AvatarBox('你', C_GREEN_PALE, C_DEEP, 64);
          Column() {
            Text(this.profileName)
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK);
            Text(this.profileSubtitle)
              .fontSize(13)
              .fontColor(C_MUTED)
              .margin({ top: 5 });
            Text(this.profileIntentText)
              .fontSize(13)
              .fontColor(C_MUTED)
              .margin({ top: 4 });
          }
          .layoutWeight(1)
          .margin({ left: 14 });
        }
        .width('100%')
        .margin({ top: 18 });
        Row() {
          this.StatBox(this.profileStats[0], '去过地点');
          this.StatBox(this.profileStats[1], '碰一碰');
          this.StatBox(this.profileStats[2], '复参地点');
          this.StatBox(this.profileStats[3], '真实见过');
        }
        .width('100%')
        .padding(16)
        .backgroundColor(C_CARD)
        .borderRadius(20)
        .margin({ top: 20, bottom: 14 });
        ForEach(this.profileMenus, (item: ProfileMenuItem) => {
          Row() {
            this.AvatarBox(item.icon, '#F5F3EE', item.tint, 40);
            Text(item.label)
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK)
              .layoutWeight(1)
              .margin({ left: 12 });
            Text('›')
              .fontSize(24)
              .fontColor('#A8A294');
          }
          .width('100%')
          .padding({ left: 14, right: 14, top: 13, bottom: 13 })
          .backgroundColor(C_CARD)
          .border({ width: 1, color: C_LINE })
          .borderRadius(15)
          .margin({ bottom: 10 })
          .onClick(() => this.go(item.to));
        }, (item: ProfileMenuItem) => item.to);
        Row() {
          this.AvatarBox('设', '#EEECE5', '#5A6056', 40);
          Text('设置')
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_INK)
            .layoutWeight(1)
            .margin({ left: 12 });
          Text('›')
            .fontSize(24)
            .fontColor('#A8A294');
        }
        .width('100%')
        .padding({ left: 14, right: 14, top: 13, bottom: 13 })
        .backgroundColor(C_CARD)
        .border({ width: 1, color: C_LINE })
        .borderRadius(15)
        .margin({ bottom: 10 })
        .onClick(() => this.go('meSettings'));
      }
      .padding({ left: 22, right: 22, top: 16, bottom: 96 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  NfcTouchPage() {
    Scroll() {
      Column() {
        this.BackHeader('碰一碰 · TAP TO REVIEW', 'meNfc');
        Text('线下真实碰面后靠近碰一碰，分个人 / 商家两种')
          .fontSize(14)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 2 });

        Row() {
          this.NfcKindTab('个人 ↔ 个人', 'personal');
          this.NfcKindTab('个人 ↔ 商家', 'merchant');
        }
        .width('100%')
        .padding(4)
        .backgroundColor('#EEEAE0')
        .borderRadius(13)
        .margin({ top: 16 });

        if (this.nfcKind === 'personal') {
          this.PersonalNfcFlow();
        } else {
          Column() {
            Row() {
              this.AvatarBox('☕', C_IVORY, C_GOLD, 44);
              Column() {
                Text(this.merchantName)
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(C_INK)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .width('100%');
                Text('● 已认证商家')
                  .fontSize(12)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(C_DEEP)
                  .margin({ top: 4 });
              }
              .layoutWeight(1)
              .margin({ left: 12 });
            }
            .width('100%');
            Text(this.merchantStatus)
              .fontSize(13)
              .fontColor(C_MUTED)
              .lineHeight(20)
              .width('100%')
              .margin({ top: 12 });
          }
          .width('100%')
          .padding(16)
          .backgroundColor(C_CARD)
          .border({ width: 1, color: C_LINE })
          .borderRadius(16)
          .margin({ top: 18 });

          Button('碰门贴 · 开始')
            .width('100%')
            .height(54)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .backgroundColor(C_DEEP)
            .borderRadius(18)
            .margin({ top: 16 })
            .onClick(() => { this.startMerchantTap(); });
        }

        Text('真机说明：碰一碰依赖 NFC，需支持 NFC 的鸿蒙真机贴靠商家设备/门贴测试，模拟器无法验证。')
          .fontSize(12)
          .fontColor('#A8A294')
          .lineHeight(18)
          .width('100%')
          .margin({ top: 20, bottom: 28 });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  NfcKindTab(label: string, kind: string) {
    Text(label)
      .layoutWeight(1)
      .height(38)
      .fontSize(13)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.nfcKind === kind ? Color.White : C_MUTED)
      .textAlign(TextAlign.Center)
      .backgroundColor(this.nfcKind === kind ? C_DEEP : Color.Transparent)
      .borderRadius(10)
      .onClick(() => { this.nfcKind = kind; });
  }

  @Builder
  NfcRoleCard(title: string, sub: string, active: boolean, last: boolean, action: () => void) {
    Column() {
      Text(title)
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .fontColor(active ? Color.White : C_INK)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%');
      Text(sub)
        .fontSize(12)
        .fontColor(active ? '#E8F0EB' : C_MUTED)
        .lineHeight(17)
        .width('100%')
        .margin({ top: 6 });
    }
    .layoutWeight(1)
    .padding(14)
    .backgroundColor(active ? C_DEEP : C_CARD)
    .border({ width: 1, color: active ? C_DEEP : C_LINE })
    .borderRadius(15)
    .margin({ right: last ? 0 : 10 })
    .onClick(action);
  }

  @Builder
  PersonalNfcFlow() {
    if (this.nfcStep === 'idle') {
      Text('选择角色')
        .fontSize(11)
        .fontWeight(FontWeight.Bold)
        .fontColor('#9AA194')
        .letterSpacing(1.5)
        .width('100%')
        .margin({ top: 20, bottom: 10 });
      Row() {
        this.NfcRoleCard('被碰 · 展示令牌', 'HCE 广播，等对方读取', false, false, () => { this.startNfcHost(); });
        this.NfcRoleCard('主动碰 · 读取', 'ISO-DEP 读取对方令牌', false, true, () => { this.startNfcReader(); });
      }
      .width('100%');
      Text('首次见面需双向确认；已是好友碰面免确认，直接掉落 3D 纪念徽章 + 好感度。')
        .fontSize(13)
        .fontColor(C_MUTED)
        .lineHeight(20)
        .width('100%')
        .margin({ top: 16 });
    } else if (this.nfcStep === 'wait') {
      this.NfcStatusBlock('◎', '把两部手机背靠背靠近', this.nfcStatus);
      Button('取消')
        .width('100%')
        .height(50)
        .fontColor(C_ORANGE)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: '#E7CBB8' })
        .borderRadius(16)
        .margin({ top: 16 })
        .onClick(() => { this.stopNfc(); });
    } else if (this.nfcStep === 'sense') {
      this.NfcStatusBlock('✦', '碰到了！', '确认是你们本人在一起吗？');
      Row() {
        this.AvatarBox('书', C_GREEN_PALE, C_DEEP, 44);
        Column() {
          Text(this.nfcSensedName)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_INK)
            .width('100%');
          Text('读书 / 咖啡 · 距 0.3m')
            .fontSize(12)
            .fontColor(C_MUTED)
            .margin({ top: 4 });
        }
        .layoutWeight(1)
        .margin({ left: 12 });
      }
      .width('100%')
      .padding(14)
      .backgroundColor(C_CARD)
      .border({ width: 1, color: C_LINE })
      .borderRadius(15)
      .margin({ top: 12 });
      Button('确认碰到本人')
        .width('100%')
        .height(54)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .backgroundColor(C_DEEP)
        .borderRadius(18)
        .margin({ top: 16 })
        .onClick(() => { this.confirmNfcTouch(); });
      Button('取消')
        .width('100%')
        .height(48)
        .fontColor(C_MUTED)
        .backgroundColor(Color.Transparent)
        .margin({ top: 8 })
        .onClick(() => { this.stopNfc(); });
    } else if (this.nfcStep === 'confirm') {
      this.NfcStatusBlock('◌', '你已确认 ✓，等待对方确认…', '双方都确认见过面，才会建立可信连接。');
    } else if (this.nfcStep === 'done') {
      this.NfcStatusBlock('✓', '可信连接已建立', '你们在真实地点碰过面并互评，双方可信度 +1，现在可以聊天。');
      Button('进入聊天')
        .width('100%')
        .height(54)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .backgroundColor(C_DEEP)
        .borderRadius(18)
        .margin({ top: 16 })
        .onClick(() => this.go('chatDetail'));
      Button('返回首页')
        .width('100%')
        .height(50)
        .fontColor(C_DEEP)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: '#D8E0D4' })
        .borderRadius(16)
        .margin({ top: 10 })
        .onClick(() => this.mainPage('explore'));
    } else {
      Text('碰一碰结果 · 好友')
        .fontSize(12)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_GOLD)
        .letterSpacing(1)
        .width('100%')
        .margin({ top: 18 });
      Text('你和 ' + this.nfcSensedName + ' · 第 ' + this.nfcTimesMet + ' 次真实碰面')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .lineHeight(28)
        .width('100%')
        .margin({ top: 8 });
      Column() {
        Text('3D')
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 3, bottom: 3 })
          .backgroundColor('#9A7AD0')
          .borderRadius(7);
        Text(this.nfcBadgeText.length > 0 ? this.nfcBadgeText : '这次未掉落 · 仅记录本次碰面')
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.nfcBadgeText.length > 0 ? C_DEEP : C_MUTED)
          .lineHeight(22)
          .textAlign(TextAlign.Center)
          .margin({ top: 10 });
        Text('幸运掉落 · 稀有度 R · 碰面有几率获得')
          .fontSize(12)
          .fontColor(C_MUTED)
          .margin({ top: 6 });
      }
      .width('100%')
      .alignItems(HorizontalAlign.Center)
      .padding(20)
      .backgroundColor(C_IVORY)
      .border({ width: 1, color: '#ECDCBD' })
      .borderRadius(18)
      .margin({ top: 16 });
      Row() {
        Text('好感度')
          .fontSize(13)
          .fontColor(C_MUTED)
          .layoutWeight(1);
        Text(this.nfcAffinityText)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor('#B0577C');
      }
      .width('100%')
      .padding(16)
      .backgroundColor(C_CARD)
      .border({ width: 1, color: C_LINE })
      .borderRadius(16)
      .margin({ top: 12 });
      Row() {
        Text('积分')
          .fontSize(13)
          .fontColor(C_MUTED)
          .layoutWeight(1);
        Text(this.nfcPointsText)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_GOLD);
      }
      .width('100%')
      .padding(16)
      .backgroundColor(C_CARD)
      .border({ width: 1, color: C_LINE })
      .borderRadius(16)
      .margin({ top: 10 });
      Button('收下并进入聊天')
        .width('100%')
        .height(54)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .backgroundColor(C_DEEP)
        .borderRadius(18)
        .margin({ top: 18 })
        .onClick(() => this.go('chatDetail'));
    }
  }

  @Builder
  NfcStatusBlock(icon: string, title: string, body: string) {
    Column() {
      Text(icon)
        .fontSize(40)
        .fontColor(C_DEEP);
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .textAlign(TextAlign.Center)
        .margin({ top: 12 });
      Text(body)
        .fontSize(14)
        .fontColor(C_MUTED)
        .lineHeight(22)
        .textAlign(TextAlign.Center)
        .margin({ top: 8 });
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
    .padding(24)
    .backgroundColor('#EEF3F1')
    .borderRadius(18)
    .margin({ top: 20 });
  }

  @Builder
  MerchantActionPage() {
    Scroll() {
      Column() {
        this.BackHeader('到店 · ' + this.merchantName, 'nfcTouch');
        Row() {
          this.AvatarBox('☕', C_IVORY, C_GOLD, 44);
          Column() {
            Text(this.merchantName)
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK)
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width('100%');
            Text('GPS 匹配 ✓ · 到店确认')
              .fontSize(12)
              .fontColor(C_DEEP)
              .margin({ top: 4 });
          }
          .layoutWeight(1)
          .margin({ left: 12 });
        }
        .width('100%')
        .padding(14)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: C_LINE })
        .borderRadius(16)
        .margin({ top: 8 });

        Text('选择本次操作')
          .fontSize(11)
          .fontWeight(FontWeight.Bold)
          .fontColor('#9AA194')
          .letterSpacing(1.5)
          .width('100%')
          .margin({ top: 20, bottom: 10 });
        Row() {
          this.MerchantActionCard('到店打卡', '城市足迹 +1', this.merchantCheckedIn, false, () => { this.doMerchantCheckin(); });
          this.MerchantActionCard('支付', this.merchantItemName + ' · ¥28', this.merchantPaid, true, () => { this.doMerchantPay(); });
        }
        .width('100%');

        Text(this.merchantStatus)
          .fontSize(13)
          .fontColor(C_MUTED)
          .lineHeight(20)
          .width('100%')
          .padding(14)
          .backgroundColor('#EEF3F1')
          .borderRadius(14)
          .margin({ top: 16 });

        Button('评价这家店')
          .width('100%')
          .height(52)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.merchantCheckedIn ? Color.White : '#A8A294')
          .backgroundColor(this.merchantCheckedIn ? C_DEEP : '#E7E2D8')
          .borderRadius(16)
          .margin({ top: 18 })
          .onClick(() => { if (this.merchantCheckedIn) { this.merchantStars = 5; this.merchantTags = []; this.go('merchantRatePlace'); } });
        Button('评价消费物品')
          .width('100%')
          .height(50)
          .fontSize(15)
          .fontColor(this.merchantPaid ? C_DEEP : '#A8A294')
          .backgroundColor(C_CARD)
          .border({ width: 1, color: this.merchantPaid ? '#D8E0D4' : C_LINE })
          .borderRadius(16)
          .margin({ top: 10, bottom: 28 })
          .onClick(() => { if (this.merchantPaid) { this.merchantStars = 5; this.merchantTags = []; this.go('merchantRateItem'); } });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  MerchantActionCard(title: string, sub: string, done: boolean, last: boolean, action: () => void) {
    Column() {
      Row() {
        Text(title)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(done ? Color.White : C_INK)
          .layoutWeight(1);
        Text(done ? '✓' : '')
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White);
      }
      .width('100%');
      Text(sub)
        .fontSize(12)
        .fontColor(done ? '#E8F0EB' : C_MUTED)
        .lineHeight(17)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')
        .margin({ top: 6 });
    }
    .layoutWeight(1)
    .padding(14)
    .backgroundColor(done ? C_DEEP : C_CARD)
    .border({ width: 1, color: done ? C_DEEP : C_LINE })
    .borderRadius(15)
    .margin({ right: last ? 0 : 10 })
    .onClick(action);
  }

  @Builder
  MerchantRatePlacePage() {
    Scroll() {
      Column() {
        this.BackHeader('评价地点', 'merchantAction');
        Text('评价 ' + this.merchantName)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .margin({ top: 8 });
        Text('到店打卡后才可评价 · 更可信')
          .fontSize(13)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 6 });
        this.StarRow();
        Text('这家店怎么样')
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 18, bottom: 12 });
        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(MERCHANT_PLACE_TAGS, (item: string) => {
            this.SelectableChip(item, this.merchantTags.indexOf(item) >= 0, () => this.toggleMerchantTag(item));
          }, (item: string) => item);
        }
        .width('100%');
        TextInput({ placeholder: '写下你的到店体验（选填）', text: this.merchantPlaceComment })
          .maxLength(240)
          .onChange((value: string) => { this.merchantPlaceComment = value; });
        Button('提交评价')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 22, bottom: 28 })
          .onClick(() => { this.submitMerchantPlaceReview(); });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  MerchantRateItemPage() {
    Scroll() {
      Column() {
        this.BackHeader('评价消费物品', 'merchantAction');
        Text('评价你买的东西')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 8 });
        Text('支付后才可评价 · 更可信')
          .fontSize(13)
          .fontColor(C_MUTED)
          .width('100%')
          .margin({ top: 6 });
        Row() {
          this.AvatarBox('☕', C_IVORY, C_GOLD, 42);
          Column() {
            Text(this.merchantItemName)
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor(C_INK)
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width('100%');
            Text('¥28')
              .fontSize(13)
              .fontColor(C_MUTED)
              .margin({ top: 4 });
          }
          .layoutWeight(1)
          .margin({ left: 12 });
        }
        .width('100%')
        .padding(14)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: C_LINE })
        .borderRadius(15)
        .margin({ top: 16 });
        this.StarRow();
        Text('这件商品怎么样')
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .width('100%')
          .margin({ top: 18, bottom: 12 });
        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(MERCHANT_ITEM_TAGS, (item: string) => {
            this.SelectableChip(item, this.merchantTags.indexOf(item) >= 0, () => this.toggleMerchantTag(item));
          }, (item: string) => item);
        }
        .width('100%');
        TextInput({ placeholder: '写下你的商品体验（选填）', text: this.merchantItemComment })
          .maxLength(240)
          .onChange((value: string) => { this.merchantItemComment = value; });
        Button('提交评价')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 22, bottom: 28 })
          .onClick(() => { this.submitMerchantItemReview(); });
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  MerchantRewardPage() {
    Scroll() {
      Column() {
        this.BackHeader('商家碰一碰结果', 'explore');
        Column() {
          Text('已评价')
            .fontSize(26)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_INK);
          Text(this.merchantRewardText)
            .fontSize(14)
            .fontColor(C_MUTED)
            .lineHeight(22)
            .textAlign(TextAlign.Center)
            .margin({ top: 10 });
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .margin({ top: 12, bottom: 6 });

        Column() {
          Text('3D')
            .fontSize(12)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .padding({ left: 8, right: 8, top: 3, bottom: 3 })
            .backgroundColor('#9A7AD0')
            .borderRadius(7);
          Text(this.merchantRewardBadge)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_DEEP)
            .lineHeight(22)
            .textAlign(TextAlign.Center)
            .margin({ top: 10 });
          Text('商家纪念徽章 · 稀有度 R')
            .fontSize(12)
            .fontColor(C_MUTED)
            .margin({ top: 6 });
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .padding(20)
        .backgroundColor(C_IVORY)
        .border({ width: 1, color: '#ECDCBD' })
        .borderRadius(18)
        .margin({ top: 16 });

        Row() {
          Text('积分')
            .fontSize(13)
            .fontColor(C_MUTED)
            .layoutWeight(1);
          Text(this.merchantRewardPoints)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(C_GOLD);
        }
        .width('100%')
        .padding(16)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: C_LINE })
        .borderRadius(16)
        .margin({ top: 12 });

        Button('回到探索')
          .width('100%')
          .height(54)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .backgroundColor(C_DEEP)
          .borderRadius(18)
          .margin({ top: 22 })
          .onClick(() => this.mainPage('explore'));
        Button('查看我的碰一碰记录')
          .width('100%')
          .height(50)
          .fontSize(15)
          .fontColor(C_DEEP)
          .backgroundColor(C_CARD)
          .border({ width: 1, color: '#D8E0D4' })
          .borderRadius(16)
          .margin({ top: 10, bottom: 28 })
          .onClick(() => this.go('meNfc'));
      }
      .padding({ left: 22, right: 22, top: 14 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  @Builder
  StarRow() {
    Row() {
      ForEach(STAR_SLOTS, (n: number) => {
        Text(n <= this.merchantStars ? '★' : '☆')
          .fontSize(32)
          .fontColor(n <= this.merchantStars ? C_GOLD : '#C7C2B5')
          .margin({ right: 10 })
          .onClick(() => { this.merchantStars = n; });
      }, (n: number) => n.toString());
    }
    .width('100%')
    .margin({ top: 16, bottom: 2 });
  }

  @Builder
  ProfileSubPage() {
    Scroll() {
      Column() {
        this.BackHeader(this.profileSubTitle(), 'profile');
        if (this.page === 'meTrophies') {
          this.ListCard('冠', '阅读同行者', 'State Library · 2026');
          this.ListCard('奖', '咖啡地图员', 'Market Lane · 2026');
        } else if (this.page === 'meMoments') {
          ForEach(this.moments, (item: MomentItem) => {
            this.MomentCard(item);
          }, (item: MomentItem) => item.author + item.time);
        } else if (this.page === 'meWorld') {
          ForEach(this.worlds, (item: WorldItem, index: number) => {
            this.ListCard('◎', item.name, item.desc);
          }, (item: WorldItem) => item.id);
        } else if (this.page === 'meClubs') {
          this.ListCard('⌂', 'State Library Reading Club', '128 位成员');
          this.ListCard('⌂', 'Market Lane Coffee Club', '42 位成员');
        } else if (this.page === 'meSchedule') {
          this.ListCard('16', '咖啡地图任务', 'Market Lane · 今天');
          this.ListCard('20', '城市书签 AR 任务', 'State Library · 今晚');
        } else if (this.page === 'meInterestData') {
          this.ListCard('读', '读书 18 次', '最常到达 State Library');
          this.ListCard('啡', '咖啡 11 次', '最常到达 Market Lane');
        } else if (this.page === 'meNfc') {
          Button('开始碰一碰')
            .width('100%')
            .height(52)
            .fontColor(Color.White)
            .fontWeight(FontWeight.Bold)
            .backgroundColor(C_DEEP)
            .borderRadius(16)
            .margin({ bottom: 12 })
            .onClick(() => this.go('nfcTouch'));
          this.ListCard('NFC', '碰一碰记录', '最近 7 次真实见过的人');
          this.ListCard('开', '碰一碰已开启', '累计交换 27 次');
        } else {
          this.ListCard('隐', '隐私设置', '今天不想被发现 / 隐身模式');
          this.ListCard('通', '通知设置', '活动提醒、连接请求、地点广场');
          Text(this.backendStatus).fontColor(C_MUTED).width('100%');
          Button(this.authBusy ? '正在退出…' : '退出登录')
            .enabled(!this.authBusy)
            .onClick(() => { this.logoutWithBackend(); });
        }
      }
      .padding({ left: 22, right: 22, top: 14, bottom: 28 });
    }
    .align(Alignment.Top)
    .height('100%');
  }

  private profileSubTitle(): string {
    if (this.page === 'meTrophies') return '比赛奖杯展示';
    if (this.page === 'meMoments') return '个人动态';
    if (this.page === 'meWorld') return '个人虚拟世界';
    if (this.page === 'meClubs') return '已加入的俱乐部';
    if (this.page === 'meSchedule') return '个人比赛日程';
    if (this.page === 'meInterestData') return '兴趣记录数据';
    if (this.page === 'meNfc') return '碰一碰信息';
    return '设置';
  }

  @Builder
  TabBar() {
    Row() {
      this.TabItem('⌖', '探索', 'explore');
      this.TabItem('✦', '兴趣', 'interest');
      this.TabItem('◎', '世界', 'world');
      this.TabItem('◇', '聊天', 'chat');
      this.TabItem('◉', '我', 'profile');
    }
    .width('100%')
    .height(76)
    .padding({ left: 10, right: 10, top: 8, bottom: 12 })
    // 真机毛玻璃:只用系统材质模糊,不叠 backgroundColor——纯色背景会盖住模糊,
    // 之前真机看着像实心栏就是这个原因。底栏已叠在内容之上,滚动时内容从玻璃下透出。
    .backgroundBlurStyle(BlurStyle.COMPONENT_THICK)
    .border({ width: { top: 0.5 }, color: '#00000012' });
  }

  @Builder
  TabItem(icon: string, label: string, tab: string) {
    Column() {
      Text(icon)
        .fontSize(21)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.activeTab === tab ? C_DEEP : '#ABADA3')
        .height(24)
        .textAlign(TextAlign.Center);
      Text(label)
        .fontSize(12)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.activeTab === tab ? C_DEEP : '#ABADA3')
        .height(16)
        .margin({ top: 4 });
    }
    .layoutWeight(1)
    .height(56)
    .justifyContent(FlexAlign.Center)
    .onClick(() => this.mainPage(tab));
  }

  @Builder
  BrandLine() {
    Row() {
      this.SmallLogo(26);
      Text('MicroWorld')
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .margin({ left: 9 });
    }
    .width('100%')
    .margin({ top: 6 });
  }

  @Builder
  SmallLogo(size: number) {
    Text('MW')
      .fontSize(size * 0.34)
      .fontWeight(FontWeight.Bold)
      .fontColor(C_IVORY)
      .width(size)
      .height(size)
      .textAlign(TextAlign.Center)
      .backgroundColor(C_DARK)
      .borderRadius(size * 0.28);
  }

  @Builder
  BackHeader(title: string, backTo: string) {
    Row() {
      Text('‹')
        .fontSize(34)
        .fontColor(C_DEEP)
        .width(38)
        .height(40)
        .textAlign(TextAlign.Center)
        .onClick(() => this.go(backTo));
      Text(title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis });
      Blank();
    }
    .width('100%')
    .height(48)
    .alignItems(VerticalAlign.Center)
    .margin({ bottom: 8 });
  }

  @Builder
  PageTitle(title: string, subtitle: string) {
    Column() {
      Text(title)
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK)
        .width('100%');
      Text(subtitle)
        .fontSize(13)
        .fontColor(C_MUTED)
        .width('100%')
        .margin({ top: 4 });
    }
    .width('100%');
  }

  @Builder
  InputBlock(label: string, placeholder: string, value: string, secure: boolean) {
    Column() {
      Text(label)
        .fontSize(11)
        .fontWeight(FontWeight.Bold)
        .fontColor('#9AA194')
        .letterSpacing(1.5)
        .width('100%')
        .margin({ bottom: 8 });
      TextInput({ placeholder, text: value })
        .width('100%')
        .height(50)
        .fontSize(15)
        .backgroundColor(C_CARD)
        .border({ width: 1, color: '#E2DED3' })
        .borderRadius(14)
        .type(secure ? InputType.Password : InputType.Normal)
        .onChange((nextValue: string) => {
          this.updateInput(label, placeholder, nextValue);
        });
    }
    .width('100%')
    .margin({ bottom: 16 });
  }

  @Builder
  SelectableChip(text: string, active: boolean, action: () => void) {
    Text(text)
      .fontSize(14)
      .fontWeight(active ? FontWeight.Bold : FontWeight.Normal)
      .fontColor(active ? Color.White : '#4D554B')
      .padding({ left: 15, right: 15, top: 10, bottom: 10 })
      .backgroundColor(active ? C_DEEP : C_CARD)
      .border({ width: 1, color: active ? C_DEEP : C_LINE })
      .borderRadius(18)
      .margin({ right: 9, bottom: 10 })
      .onClick(action);
  }

  @Builder
  FilterChip(text: string) {
    Text(text)
      .fontSize(13)
      .fontWeight(this.selectedFilter === text ? FontWeight.Bold : FontWeight.Normal)
      .fontColor(this.selectedFilter === text ? Color.White : '#5A6056')
      .padding({ left: 15, right: 15, top: 8, bottom: 8 })
      .backgroundColor(this.selectedFilter === text ? C_DEEP : '#FFFFFFF4')
      .border({ width: 1, color: this.selectedFilter === text ? C_DEEP : '#E7E2D8' })
      .borderRadius(20)
      .margin({ right: 8 })
      .onClick(() => { this.selectedFilter = text; this.loadExploreData(); });
  }

  @Builder
  InterestCatChip(text: string) {
    // 左侧竖排分类栏的条目:整宽药丸,选中为深绿填充。
    Text(text)
      .width('100%')
      .height(42)
      .fontSize(14)
      .fontWeight(this.selectedInterestCat === text ? FontWeight.Bold : FontWeight.Normal)
      .fontColor(this.selectedInterestCat === text ? Color.White : '#5A6056')
      .textAlign(TextAlign.Center)
      .backgroundColor(this.selectedInterestCat === text ? C_DEEP : C_CARD)
      .border({ width: 1, color: this.selectedInterestCat === text ? C_DEEP : '#E7E2D8' })
      .borderRadius(14)
      .margin({ bottom: 10 })
      .onClick(() => { this.selectedInterestCat = text; this.loadInterestData(); });
  }

  @Builder
  ScorePill(text: string) {
    Text(text)
      .fontSize(12)
      .fontWeight(FontWeight.Bold)
      .fontColor(C_DEEP)
      .padding({ left: 9, right: 9, top: 6, bottom: 6 })
      .backgroundColor('#F1F4EF')
      .borderRadius(9)
      .margin({ right: 8 });
  }

  @Builder
  RatingRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(13)
        .fontColor(C_MUTED)
        .width(96);
      Text(value)
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_DEEP);
      Blank();
    }
    .width('100%')
    .margin({ top: 10 });
  }

  @Builder
  SectionTitle(title: string, sub: string) {
    Row() {
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_INK);
      Blank();
      Text(sub)
        .fontSize(12)
        .fontColor(C_MUTED);
    }
    .width('100%')
    .margin({ top: 22, bottom: 12 });
  }

  @Builder
  ListCard(icon: string, title: string, body: string) {
    Row() {
      this.AvatarBox(icon, '#F5F3EE', C_DEEP, 42);
      Column() {
        Text(title)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
        Text(body)
          .fontSize(12)
          .fontColor(C_MUTED)
          .lineHeight(18)
          .maxLines(2)
          .margin({ top: 4 });
      }
      .layoutWeight(1)
      .margin({ left: 12 });
    }
    .width('100%')
    .padding(14)
    .backgroundColor(C_CARD)
    .border({ width: 1, color: C_LINE })
    .borderRadius(15)
    .margin({ bottom: 10 });
  }

  @Builder
  AvatarBox(text: string, bg: string, color: string, size: number) {
    Text(text)
      .fontSize(size * 0.34)
      .fontWeight(FontWeight.Bold)
      .fontColor(color)
      .maxLines(1)
      .width(size)
      .height(size)
      .textAlign(TextAlign.Center)
      .backgroundColor(bg)
      .borderRadius(size * 0.32);
  }

  @Builder
  StatBox(value: string, label: string) {
    Column() {
      Text(value)
        .fontSize(19)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_DARK)
        .maxLines(1);
      Text(label)
        .fontSize(11)
        .fontColor(C_MUTED)
        .margin({ top: 5 })
        .maxLines(1);
    }
    .layoutWeight(1)
    .alignItems(HorizontalAlign.Center);
  }

  @Builder
  ChatSegment(label: string, to: string, active: boolean) {
    Button(label)
      .layoutWeight(1)
      .height(38)
      .fontSize(13)
      .fontWeight(FontWeight.Bold)
      .fontColor(active ? Color.White : C_DEEP)
      .backgroundColor(active ? C_DEEP : C_CARD)
      .border({ width: 1, color: active ? C_DEEP : C_LINE })
      .borderRadius(11)
      .margin({ right: 7 })
      .onClick(() => this.go(to));
  }

  @Builder
  PersonCard(person: ChatPerson, index: number, friendMode: boolean) {
    Row() {
      this.AvatarBox(person.avatar, person.color, C_DEEP, 42);
      Column() {
        Text(person.name)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK);
        Text(friendMode ? person.tag : person.lastMsg)
          .fontSize(12)
          .fontColor(C_MUTED)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 3 });
        Text(person.place)
          .fontSize(11)
          .fontColor(C_DEEP)
          .margin({ top: 4 });
      }
      .layoutWeight(1)
      .margin({ left: 11 });
      Text(friendMode ? '联系' : '›')
        .fontSize(friendMode ? 12 : 24)
        .fontWeight(FontWeight.Bold)
        .fontColor(friendMode ? C_DEEP : '#A8A294');
    }
    .width('100%')
    .padding(12)
    .backgroundColor(C_CARD)
    .border({ width: 1, color: C_LINE })
    .borderRadius(14)
    .margin({ bottom: 9 })
    .onClick(() => { this.selectedPersonIndex = index; this.go('chatDetail'); });
  }

  @Builder
  MomentCard(item: MomentItem) {
    Column() {
      Row() {
        Text(item.author)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK)
          .layoutWeight(1);
        Text(item.time)
          .fontSize(11)
          .fontColor('#A8A294');
      }
      .width('100%');
      Text(item.text)
        .fontSize(13)
        .fontColor('#3A4038')
        .lineHeight(20)
        .width('100%')
        .margin({ top: 8 });
      Text(item.place)
        .fontSize(12)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_DEEP)
        .margin({ top: 8 });
    }
    .width('100%')
    .padding(14)
    .backgroundColor(C_CARD)
    .border({ width: 1, color: C_LINE })
    .borderRadius(14)
    .margin({ bottom: 10 });
  }

  @Builder
  ToolPill(text: string, active: boolean) {
    Text(text)
      .fontSize(12)
      .fontColor(Color.White)
      .fontWeight(active ? FontWeight.Bold : FontWeight.Normal)
      .padding({ left: 12, right: 12, top: 6, bottom: 6 })
      .backgroundColor(active ? '#9A7AD0' : '#FFFFFF29')
      .borderRadius(9)
      .margin({ right: 6 });
  }

  @Builder
  PurpleChip(text: string, active: boolean) {
    Text(text)
      .fontSize(13)
      .fontWeight(active ? FontWeight.Bold : FontWeight.Normal)
      .fontColor(active ? Color.White : '#5A6056')
      .padding({ left: 14, right: 14, top: 8, bottom: 8 })
      .backgroundColor(active ? '#9A7AD0' : C_CARD)
      .border({ width: 1, color: active ? '#9A7AD0' : '#E7E2D8' })
      .borderRadius(12)
      .margin({ right: 8 });
  }

  @Builder
  PillText(text: string, active: boolean, color: string) {
    Text(text)
      .fontSize(12)
      .fontWeight(active ? FontWeight.Bold : FontWeight.Normal)
      .fontColor(active ? Color.White : '#5A6056')
      .padding({ left: 12, right: 12, top: 6, bottom: 6 })
      .backgroundColor(active ? color : C_CARD)
      .border({ width: 1, color: active ? color : '#E7E2D8' })
      .borderRadius(9)
      .margin({ right: 7 });
  }

  @Builder
  RankRow(rank: string, name: string, meta: string, score: string, top: boolean) {
    Row() {
      Text(rank)
        .fontSize(11)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .width(24)
        .height(24)
        .textAlign(TextAlign.Center)
        .backgroundColor(top ? C_GOLD : '#D8C49A')
        .borderRadius(12);
      this.AvatarBox(name.substring(0, 1), top ? '#EAF0FA' : C_GREEN_PALE, top ? C_BLUE : C_DEEP, 36);
      Column() {
        Text(name)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(C_INK);
        Text(meta)
          .fontSize(11)
          .fontColor(C_MUTED)
          .margin({ top: 2 });
      }
      .layoutWeight(1)
      .margin({ left: 10 });
      Text(score)
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor(C_GOLD);
    }
    .width('100%')
    .padding(11)
    .backgroundColor(top ? '#FDF7EC' : C_CARD)
    .border({ width: 1, color: top ? '#ECDCBD' : C_LINE })
    .borderRadius(13)
    .margin({ bottom: 9 })
    .onClick(() => {
      if (top) {
        this.go('profileDetailReadOnly');
      }
    });
  }

  @Builder
  ShareBox(icon: string, label: string) {
    Column() {
      Text(icon)
        .fontSize(20)
        .fontColor('#7A5CC0');
      Text(label)
        .fontSize(11)
        .fontColor('#5A6056')
        .margin({ top: 5 });
    }
    .layoutWeight(1)
    .height(82)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor(C_CARD)
    .border({ width: 1, color: C_LINE })
    .borderRadius(14)
    .margin({ right: 8 });
  }

  @Builder
  ChatBubble(name: string, text: string, mine: boolean) {
    Row() {
      if (mine) {
        Blank();
      }
      Column() {
        Text(name)
          .fontSize(11)
          .fontColor(C_MUTED);
        Text(text)
          .fontSize(14)
          .fontColor(mine ? Color.White : C_INK)
          .lineHeight(20)
          .padding(12)
          .backgroundColor(mine ? C_DEEP : C_CARD)
          .border({ width: mine ? 0 : 1, color: C_LINE })
          .borderRadius(16)
          .margin({ top: 4 });
      }
      .width('74%')
      .alignItems(mine ? HorizontalAlign.End : HorizontalAlign.Start);
      if (!mine) {
        Blank();
      }
    }
    .width('100%')
    .margin({ bottom: 10 });
  }
}
