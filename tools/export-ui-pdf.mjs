import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const exportDir = resolve(projectRoot, 'exports');
const htmlPath = resolve(exportDir, 'smallworld-ui-pages.html');
const pdfPath = resolve(exportDir, 'SmallWorld_UI_Pages.pdf');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(exportDir, { recursive: true });

const tabs = ['探索', '兴趣', '世界', '聊天', '我'];

function tabbar(active) {
  return `
    <div class="tabbar">
      ${tabs.map((tab) => `<div class="tab ${tab === active ? 'active' : ''}"><b>${tabIcon(tab)}</b><span>${tab}</span></div>`).join('')}
    </div>
  `;
}

function tabIcon(tab) {
  const map = { '探索': '⌖', '兴趣': '✦', '世界': '◎', '聊天': '◇', '我': '◉' };
  return map[tab] || '•';
}

function status() {
  return '<div class="status"><span>10:36</span><span>5G 89%</span></div>';
}

function phone(body, activeTab = '', extraClass = '') {
  return `
    <div class="phone ${extraClass}">
      ${status()}
      <main class="screen ${activeTab ? 'with-tab' : ''}">${body}</main>
      ${activeTab ? tabbar(activeTab) : ''}
    </div>
  `;
}

function chips(items, active = 0) {
  return `<div class="chips">${items.map((item, index) => `<span class="chip ${index === active ? 'on' : ''}">${item}</span>`).join('')}</div>`;
}

function card(title, body = '', cls = '') {
  return `<section class="card ${cls}">${title ? `<h3>${title}</h3>` : ''}${body}</section>`;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><b>${value}</b><i><em style="width:${value}%"></em></i></div>`;
}

function sheet(title, route, notes, body, activeTab = '', extraClass = '') {
  return `
    <section class="sheet">
      <div class="canvas">${phone(body, activeTab, extraClass)}</div>
      <aside class="meta">
        <p class="eyebrow">SmallWorld UI Export</p>
        <h1>${title}</h1>
        <p class="route">${route}</p>
        <h2>改版关注点</h2>
        <ul>${notes.map((note) => `<li>${note}</li>`).join('')}</ul>
      </aside>
    </section>
  `;
}

const pages = [
  sheet(
    '欢迎页 / 启动页',
    'page = welcome',
    ['第一屏直接说明真实地点、兴趣和线下连接', '主按钮进入身份创建，次按钮进入登录', '品牌视觉要轻盈，避免普通交友 App 气质'],
    `
      <div class="hero">
        <div class="brand-orbit"><span>◎</span><small>到场</small></div>
        <h1>SmallWorld</h1>
        <h2>在真实地点，遇见同频的人</h2>
        <p>探索附近兴趣空间，参与线下活动，用实景 AR 发现隐藏互动，和真实见过的人建立连接。</p>
        <div class="formula"><span>线下相遇</span><b>×</b><span>实景互动</span><b>×</b><span>虚拟世界</span></div>
      </div>
      <button class="primary">开始探索</button>
      <button class="link">已有账号登录</button>
    `
  ),
  sheet(
    '登录页',
    'page = login',
    ['用于真实账号登录，不再只是跳过入口', '错误提示区域需要保留给后端连接和密码错误', '按钮状态要体现正在验证账号'],
    `
      <div class="top-title"><p>SmallWorld</p><h1>登录你的账号</h1><span>回到你真实见过的人和地点</span></div>
      <label>邮箱</label><div class="input">name@example.com</div>
      <label>密码</label><div class="input">至少 8 位密码</div>
      <div class="notice slim">后端连接状态与登录错误显示在这里</div>
      <button class="primary">登录</button>
      <button class="secondary">创建新账号</button>
    `
  ),
  sheet(
    '注册页',
    'page = register',
    ['注册表单需要服务真实后端', '协议与隐私必须有明确勾选', '注册后进入身份兴趣选择'],
    `
      <div class="top-title"><p>SmallWorld</p><h1>创建账号</h1><span>建立低压力的线下社交身份</span></div>
      <label>昵称</label><div class="input">城市书签</div>
      <label>邮箱</label><div class="input">name@example.com</div>
      <label>密码</label><div class="input">至少 8 位密码</div>
      <label>确认密码</label><div class="input">再次输入密码</div>
      <div class="check">☑ 我同意用户协议和隐私政策</div>
      <button class="primary">创建账号</button>
    `
  ),
  sheet(
    '创建身份页',
    'page = identity',
    ['轻量选择兴趣和社交意图', '选择结果会保存到后端用户资料', '避免像交友画像，要像城市兴趣通行证'],
    `
      <div class="top-title"><p>SmallWorld</p><h1>创建你的线下社交身份</h1><span>选择兴趣，让城市推荐更适合你</span></div>
      ${chips(['咖啡', '读书', '摄影', '运动', '桌游', '音乐', '艺术', '电影', '城市探索', '展览', '手作', '宠物'], 1)}
      <h2 class="section">你来到 SmallWorld，是为了：</h2>
      ${card('', '<div class="row">○ 参加线下活动</div><div class="row">● 遇见同频的人</div><div class="row">○ 探索城市地点</div><div class="row">○ 创造虚拟世界</div>')}
      <button class="primary">保存并进入 SmallWorld</button>
    `
  ),
  sheet(
    '探索首页',
    'page = explore',
    ['核心判断附近哪里值得去', '地图、搜索、兴趣/距离筛选和推荐卡片同屏出现', '评分必须突出线下社交质量和真实碰触评价'],
    `
      <div class="app-head"><div><h1>SmallWorld</h1><p>墨尔本 · 真实地点上的兴趣社交</p></div><b>铃</b></div>
      <div class="search">搜索地点 / 兴趣 / 活动</div>
      ${chips(['全部', '咖啡', '读书', '摄影', '运动', '3公里内'], 0)}
      <div class="map"><h3>高德城市地图</h3><span class="pin p1">当前位置</span><span class="pin p2">State Library</span><span class="pin p3">Market Lane</span></div>
      ${card('附近适合线下见面的地方', '<h4>State Library Reading Club <b>4.8</b></h4><p>读书 / 咖啡 / 安静社交</p><div class="badges"><span>舒适 92%</span><span>匹配 88%</span><span>高可信</span></div><p>真实碰触评价 42 条｜到场 238｜复参率 68%</p><div class="actions"><button>查看详情</button><button>导航</button></div>')}
    `,
    '探索'
  ),
  sheet(
    '兴趣首页',
    'page = interest',
    ['替代原底栏实景位置', '检索兴趣、学习方法、俱乐部和关联地标', '要像兴趣指南，不像内容社区信息流'],
    `
      <div class="app-head"><div><h1>兴趣</h1><p>先了解怎么开始，再找到可以一起参与的人和地方</p></div><b>8 个方向</b></div>
      <div class="search">搜索兴趣、学习方法、俱乐部或关键词</div>
      ${chips(['全部', '人文', '艺术', '运动', '技能', '城市', '桌面', '自然'], 0)}
      <div class="dark-panel"><h3>不知道从哪里开始？</h3><p>从低压力、零基础和附近可参与三个条件开始选</p><b>兴趣指南</b></div>
      ${card('兴趣目录', '<div class="topic"><b>书</b><div><h4>阅读</h4><p>零基础友好 · 每天20分钟 · 安静社交</p><small>2 个俱乐部 · 2 个关联地标</small></div></div><div class="topic"><b>镜</b><div><h4>摄影</h4><p>手机即可 · 2 周入门 · 城市散步</p><small>2 个俱乐部 · 2 个关联地标</small></div></div>')}
      ${card('本周可加入的俱乐部', '<p>State Library 共读会 · 每周三 19:00</p><p>慢半拍摄影散步 · 周六傍晚</p>')}
    `,
    '兴趣'
  ),
  sheet(
    '兴趣详情页',
    'page = interestDetail',
    ['显示简介、入门周期、社交方式', '学习路径和工具要清晰', '俱乐部和真实地标是主要转化入口'],
    `
      <div class="back">‹ 阅读</div>
      ${card('', '<div class="topic big"><b>书</b><div><h2>阅读</h2><p>人文 · 零基础友好</p></div></div><p>从独自阅读到主题共读，用一本书建立低压力、可持续的线下交流。</p><div class="stats"><span><b>每天20分钟</b><small>入门周期</small></span><span><b>安静社交</b><small>社交方式</small></span><span><b>2</b><small>俱乐部</small></span></div>')}
      ${card('学习路径', '<ol><li>选择一个真正好奇的主题</li><li>建立每天20分钟固定阅读时间</li><li>用三句话记录观点与疑问</li><li>参加一次允许旁听的线下共读</li></ol>')}
      ${card('相关俱乐部', '<p>State Library 共读会 · 已认证</p><p>城市短文写作小组 · 新手友好</p>')}
      ${card('去这些地标开始', '<p>State Library · 低压力 · 330m</p><p>Market Lane · 轻社交 · 290m</p>')}
    `
  ),
  sheet(
    '地点详情页',
    'page = place',
    ['地点详情承载简介、活动/比赛、公共聊天和分享', '公共聊天必须只在地点页可用', '排行榜和数字奖牌也从这里进入'],
    `
      <div class="back">‹ State Library Reading Club</div>
      <div class="cover"><span>城市图书馆 · 夜间读书会</span><b>AR</b></div>
      ${card('', '<h2>State Library Reading Club</h2><p>328 Swanston St, Melbourne VIC</p><p>读书 / 咖啡 / 安静社交 / 城市探索</p><button>到达后进入世界 · 实景现场</button>')}
      ${card('适合线下社交指数', `${metric('社交舒适度', 92)}${metric('兴趣匹配度', 88)}${metric('安全感', 95)}`)}
      ${card('进行中 / 即将开始', '<p>19:00 夜间读书交流会</p><p>20:30 城市书签 AR 任务</p>')}
      ${card('地点广场', '<p>公共聊天与分享只在当前地点开放</p><div class="input">写一条现场消息...</div>')}
    `
  ),
  sheet(
    '活动 / 比赛详情页',
    'page = placeActivity',
    ['展示当前地点正在进行的活动或比赛', '需要组织者、时间、人数、规则、奖励', '从地点页进入，回到地点页'],
    `
      <div class="back">‹ 城市书签 AR 任务</div>
      ${card('', '<h1>城市书签 AR 任务</h1><p>今天 20:30 · State Library 主入口</p><div class="badges"><span>比赛</span><span>现场组队</span><span>12 个名额</span></div>')}
      ${card('活动简介', '<p>两人一组寻找馆内隐藏书签并完成城市故事线索，按完成度和合作质量计分。</p>')}
      ${card('规则', '<ol><li>必须现场组队</li><li>禁止进入非开放区域</li><li>不得代替其他队伍扫码</li></ol>')}
      ${card('奖励', '<p>城市探索徽章与隐藏书签花园共建资格</p>')}
    `
  ),
  sheet(
    '路线规划页',
    'page = routePlan',
    ['地点详情的路线入口', '展示步行距离、预计时间和系统导航', 'AI 路线入口作为补充'],
    `
      <div class="back">‹ 路线规划</div>
      <div class="map tall"><h3>路线地图</h3><span class="pin p1">你</span><span class="pin p2">目的地</span><div class="route-line"></div></div>
      ${card('前往 State Library', '<div class="stats"><span><b>330m</b><small>距离</small></span><span><b>6分钟</b><small>步行</small></span><span><b>低压力</b><small>社交压力</small></span></div><button>打开系统导航</button><button class="ghost">生成 AI 轻社交路线</button>')}
    `
  ),
  sheet(
    'AI 线下导游路线页',
    'page = aiRoute',
    ['作为探索和地点详情的跨页面能力', '路线偏好包含时间、距离、兴趣和社交压力', '不新增底部聊天式 AI Tab'],
    `
      <div class="back">‹ AI 线下导游</div>
      ${card('今天适合你的路线', '<p>轻社交 · 90 分钟 · 读书 / 咖啡 / 城市探索</p><div class="badges"><span>安静探索</span><span>3公里内</span><span>低压力</span></div>')}
      ${card('路线节点', '<div class="step"><b>1</b><p>Market Lane Coffee：先用咖啡地图轻量破冰</p></div><div class="step"><b>2</b><p>State Library：参加可旁听的读书交流</p></div><div class="step"><b>3</b><p>隐藏书签花园：到场后解锁小世界</p></div>')}
      ${card('AI 理由', '<p>路线优先选择低压力空间，并避开需要强自我介绍的活动。</p>')}
    `
  ),
  sheet(
    'NFC 碰一碰评价页',
    'page = nfcPair',
    ['双手机碰一碰后才解锁评价', '要清楚显示等待碰触、已验证和提交评价状态', '评分进入探索页可信等级'],
    `
      <div class="back">‹ 真实碰触评价</div>
      <div class="nfc-orbit"><span>NFC</span><p>两部手机靠近碰一碰</p></div>
      ${card('当前地点', '<h3>State Library</h3><p>GPS + QR 已验证 · 等待 NFC 碰触</p>')}
      ${card('五维评分', `${metric('社交舒适度', 90)}${metric('兴趣匹配度', 88)}${metric('安全感', 95)}${metric('活动质量', 86)}${metric('小世界丰富度', 80)}`)}
      <button class="primary">提交真实评价</button>
    `
  ),
  sheet(
    '世界页 · 实景现场',
    'page = world / worldHomeMode = scene',
    ['实景已经合并到世界页', 'CameraKit 预览、AR 节点、现场成员入口在此呈现', '点击相机画面进入全屏'],
    `
      <div class="app-head"><div><h1>世界</h1><p>到达真实地点后，用实景发现任务和小世界入口</p></div><b>AR</b></div>
      <div class="segments"><span class="on">实景现场</span><span>虚拟世界</span></div>
      ${card('', '<h3>State Library</h3><p>已到达现场 · GPS + QR 已验证</p>')}
      <div class="camera"><span>AR 相机画面</span><b class="ar a1">隐藏书签</b><b class="ar a2">图书馆记忆墙</b><b class="ar a3">破冰任务</b></div>
      ${card('今日任务：找到隐藏书签', '<p>邀请一位现场用户共同解锁。</p><div class="actions"><button>扫描</button><button>任务</button><button>附近的人</button></div>')}
    `,
    '世界'
  ),
  sheet(
    '全屏 AR 相机页',
    'page = cameraFull',
    ['从世界实景现场点击相机画面进入', '退出后回到世界实景现场', '适合检查沉浸式信息密度'],
    `
      <div class="fullscreen-camera">
        <div class="camera-head"><b>×</b><div><h3>实景模式</h3><p>State Library｜已到达现场</p></div><span>GPS + QR</span></div>
        <b class="ar a1">隐藏书签</b><b class="ar a2">图书馆记忆墙</b><b class="ar a3">破冰任务</b>
        <div class="task-glass"><h3>今日任务：找到隐藏书签</h3><p>邀请一位现场用户共同解锁</p><div class="actions"><button>扫描</button><button>附近的人</button></div></div>
      </div>
    `,
    '',
    'no-status'
  ),
  sheet(
    '现场成员页',
    'page = members',
    ['只展示愿意被发现的现场用户', '默认不能直接私聊', '破冰动作优先于强关系'],
    `
      <div class="back">‹ 现场成员</div>
      <div class="notice"><b>仅展示愿意被发现的现场用户</b><p>你可以先通过任务或兴趣自然破冰。默认不能直接私聊。</p></div>
      ${chips(['同兴趣', '同任务', '同小世界', '安静社交'], 0)}
      ${card('现场有 12 位同频用户', '<div class="person"><b>书</b><div><h4>林间书页</h4><p>读书 / 咖啡 / 城市探索</p><small>可接受轻互动</small></div></div><div class="actions"><button>邀请完成任务</button><button>轻打招呼</button></div>')}
      ${card('', '<div class="person"><b>镜</b><div><h4>慢半拍摄影</h4><p>正在参与隐藏书签 AR 任务</p><small>任务中</small></div></div>')}
    `,
    '世界'
  ),
  sheet(
    '建立关系页',
    'page = relation',
    ['关系来源必须可解释', '双方确认后才开放聊天', '隐私默认只开放必要信息'],
    `
      <div class="back">‹ 建立连接</div>
      <div class="notice"><b>你们不是陌生网友</b><p>你们刚刚在真实地点产生过交集，确认后才会开放聊天。</p></div>
      ${card('关系来源', '<p>地点：State Library</p><p>共同完成：隐藏书签 AR 任务</p><p>时间：今天 20:36</p>')}
      ${card('林间书页', '<p>读书 / 咖啡 / 城市探索</p><p>共同小世界：图书馆记忆墙</p>')}
      ${card('你想如何建立关系？', '<div class="row">○ 活动搭子</div><div class="row">● 兴趣同频</div><div class="row">○ 小世界共建者</div><div class="row">○ 仅保持轻联系</div>')}
      <button class="primary">发送连接请求</button>
    `
  ),
  sheet(
    '连接成功页',
    'page = relationSuccess',
    ['说明为什么可以聊天', '主按钮进入聊天，次按钮回到世界实景现场', '语气保持低压力'],
    `
      <div class="success"><h1>连接已建立</h1><p>你们现在可以聊天了，因为你们在 State Library 共同完成了隐藏书签任务。</p><button class="primary">进入聊天</button><button class="secondary">回到实景</button></div>
    `
  ),
  sheet(
    '世界页 · 虚拟世界',
    'page = world / worldHomeMode = spaces',
    ['显示绑定真实地点的 3D 私有世界', '列表、状态、创建入口要同屏明确', '3D / AR / MR 未来可作为显示方式切换'],
    `
      <div class="app-head"><div><h1>世界</h1><p>在真实地点，建设可自由观察的 3D 私有空间</p></div><b>＋</b></div>
      <div class="segments"><span>实景现场</span><span class="on">虚拟世界</span></div>
      <div class="segments small"><span class="on">我的世界</span><span>附近世界</span><span>共建中</span></div>
      ${card('', '<div class="world-cover">3D</div><h3>图书馆记忆墙</h3><p>绑定地点：State Library</p><p>128 人访问｜12 人共建｜新增 3 条书签故事</p><div class="actions"><button>管理</button><button>进入世界</button></div>')}
      ${card('', '<div class="world-cover coffee">AR</div><h3>巷口咖啡时间</h3><p>AI 物件 / 咖啡地图 / 到场可见</p>')}
    `,
    '世界'
  ),
  sheet(
    '创建小世界页',
    'page = createWorld',
    ['创建世界必须绑定真实地点', '可见范围影响到场、邀请和公开访问', 'AI 创造入口后续接图像/模型服务'],
    `
      <div class="back">‹ 创建小世界</div>
      <label>世界名称</label><div class="input">我的城市微缩世界</div>
      <label>世界说明</label><div class="textarea">把在这个真实地点发生的故事，建造成可以再次进入的私人空间。</div>
      <h2 class="section">绑定真实地点</h2>${chips(['State Library', 'Market Lane', 'Carlton Board Game'], 0)}
      <h2 class="section">主题</h2>${chips(['记忆花园', '城市书签', '咖啡地图', '桌游档案'], 0)}
      ${card('可见范围', '<div class="row">● 到场后可见</div><div class="row">○ 公开可见</div><div class="row">○ 仅邀请可见</div>')}
      <button class="primary">生成小世界</button>
    `
  ),
  sheet(
    '世界详情页',
    'page = worldDetail',
    ['展示 3D 世界画布', '进入建设、发布、邀请共建是主要操作', '需要清晰标注真实地点绑定'],
    `
      <div class="back">‹ 图书馆记忆墙</div>
      <div class="world3d"><span>ArkGraphics3D 视图</span><b>记忆树</b><b class="obj2">书签墙</b></div>
      ${card('', '<h2>图书馆记忆墙</h2><p>绑定地点：State Library · 到场后可见</p><div class="stats"><span><b>128</b><small>访问</small></span><span><b>12</b><small>共建</small></span><span><b>8</b><small>物件</small></span></div><div class="actions"><button>进入建设</button><button>发布</button></div>')}
      ${card('共建者', '<p>林间书页 · 城市手帐 · 邀请更多</p>')}
    `
  ),
  sheet(
    '世界建设编辑页',
    'page = worldEditor',
    ['可拖动、旋转视角和编辑物件', '左侧/底部工具栏要避免遮挡 3D 画布', 'AI 创造物件、基础物件和属性编辑同页协作'],
    `
      <div class="editor">
        <div class="editor-head"><b>‹</b><span>建设：图书馆记忆墙</span><button>保存</button></div>
        <div class="world3d edit"><span>可拖动 3D 画布</span><b>城市记忆树</b><b class="obj2">灯光书签</b></div>
        <div class="tool-row"><button>选择</button><button>移动</button><button>旋转</button><button>缩放</button></div>
        ${card('AI 创造物件', '<div class="textarea">一棵由城市书签和柔和灯光组成的记忆树</div><div class="actions"><button>生成预览</button><button>放入世界</button></div>')}
      </div>
    `
  ),
  sheet(
    '聊天首页',
    'page = chat',
    ['当前只保留朋友和聊天对话，不做群聊', '每个会话展示真实关系来源', '公共聊天不在这里出现'],
    `
      <div class="app-head"><div><h1>聊天</h1><p>只显示真实见过或共同互动的人</p></div></div>
      <div class="segments"><span class="on">朋友</span><span>对话</span></div>
      ${card('', '<div class="person"><b>书</b><div><h4>林间书页</h4><p>刚刚那个书签任务挺有意思。</p><small>来源：State Library 共同任务</small></div></div>')}
      ${card('', '<div class="person"><b>镜</b><div><h4>慢半拍摄影</h4><p>待确认连接请求</p><small>来源：今晚摄影散步活动</small></div></div>')}
      ${card('朋友关系', '<p>活动搭子 · 兴趣同频 · 小世界共建者</p>')}
    `,
    '聊天'
  ),
  sheet(
    '聊天对话页',
    'page = chatDetail',
    ['顶部固定关系来源', '对话内容保持低压力', '输入区贴底，避免遮挡安全区'],
    `
      <div class="back">‹ 林间书页</div>
      ${card('你们的共同来源', '<p>地点：State Library</p><p>任务：共同完成隐藏书签任务</p><p>小世界：都访问过图书馆记忆墙</p>')}
      <div class="bubble">刚刚那个书签任务挺有意思。</div>
      <div class="bubble mine">对，而且不太尴尬。</div>
      <div class="bubble">下次读书会也可以一起参加。</div>
      <div class="composer"><span>输入消息...</span><button>发送</button></div>
    `
  ),
  sheet(
    '我的页面',
    'page = profile',
    ['个人身份、兴趣、足迹、隐私安全集中管理', '隐身状态必须清晰', '足迹数字强化真实线下经历'],
    `
      <div class="app-head"><h1>我</h1><b>设置</b></div>
      ${card('', '<div class="person big"><b>城</b><div><h3>城市书签</h3><p>读书 / 咖啡 / 城市探索</p><small>社交意图：遇见同频的人</small></div></div><div class="row">当前状态：可被同兴趣用户发现 <button>切换隐身</button></div>')}
      ${card('线下足迹', '<div class="stats"><span><b>18</b><small>去过地点</small></span><span><b>9</b><small>AR任务</small></span><span><b>2</b><small>小世界</small></span><span><b>14</b><small>真实见过</small></span></div>')}
      ${card('我的身份', '<p>兴趣标签 ›</p><p>编辑兴趣 ›</p><p>社交偏好 ›</p>')}
      ${card('隐私与安全', '<p>今天不想被发现 ›</p><p>黑名单与举报记录 ›</p><p>安全按钮 ›</p>')}
    `,
    '我'
  )
];

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>SmallWorld UI Pages</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #ebe7dc; color: #17211f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "STHeiti", sans-serif; }
    .sheet { width: 190mm; min-height: 277mm; page-break-after: always; display: grid; grid-template-columns: 92mm 1fr; gap: 10mm; align-items: center; padding: 4mm 0; }
    .sheet:last-child { page-break-after: auto; }
    .canvas { display: flex; justify-content: center; }
    .meta { align-self: start; padding-top: 16mm; }
    .eyebrow { margin: 0 0 8px; color: #7a6af7; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .meta h1 { margin: 0; font-size: 28px; line-height: 1.15; color: #183c36; }
    .route { display: inline-block; margin: 12px 0 24px; padding: 8px 12px; border-radius: 14px; background: #fffdf7; color: #6f7873; font-size: 12px; border: 1px solid #e6ded0; }
    .meta h2 { margin: 0 0 10px; font-size: 16px; }
    .meta ul { margin: 0; padding-left: 18px; color: #505b56; line-height: 1.75; font-size: 13px; }
    .phone { position: relative; width: 390px; height: 844px; background: #f7f4ec; border: 9px solid #17211f; border-radius: 44px; overflow: hidden; box-shadow: 0 22px 70px rgba(20, 28, 24, .22); }
    .phone.no-status .status { display:none; }
    .status { height: 32px; display: flex; justify-content: space-between; align-items: center; padding: 0 23px; font-size: 12px; font-weight: 700; color: #183c36; background: #fffdf7; }
    .screen { height: calc(100% - 32px); padding: 18px; overflow: hidden; }
    .screen.with-tab { height: calc(100% - 102px); padding-bottom: 10px; }
    .tabbar { position: absolute; left: 0; right: 0; bottom: 0; height: 70px; display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; background: rgba(255, 253, 247, .78); backdrop-filter: blur(24px); border-top: 1px solid rgba(230, 222, 208, .85); }
    .tab { text-align: center; color: #6f7873; font-size: 11px; }
    .tab b { display: block; font-size: 17px; margin-bottom: 3px; }
    .tab.active { color: #183c36; font-weight: 800; }
    h1, h2, h3, h4, p { margin: 0; }
    .hero { text-align: center; padding-top: 38px; }
    .brand-orbit { position: relative; width: 132px; height: 132px; margin: 0 auto 24px; border-radius: 50%; background: #e8f4ef; display: grid; place-items: center; }
    .brand-orbit:after { content: ""; position: absolute; width: 82px; height: 82px; border-radius: 50%; background: white; }
    .brand-orbit span { position: relative; z-index: 1; font-size: 52px; color: #183c36; }
    .brand-orbit small { position: absolute; z-index: 2; right: 18px; top: 38px; color: #f4a35d; font-weight: 800; }
    .hero h1 { font-size: 42px; margin-bottom: 12px; }
    .hero h2 { font-size: 22px; color: #183c36; margin-bottom: 16px; }
    .hero p { color: #6f7873; line-height: 1.65; font-size: 15px; }
    .formula { margin-top: 24px; display: flex; justify-content: center; gap: 10px; color: #183c36; font-size: 13px; }
    .formula b { color: #f4a35d; }
    button, .primary, .secondary, .link { border: 0; display: block; width: 100%; height: 48px; border-radius: 24px; font: inherit; text-align: center; line-height: 48px; margin-top: 13px; }
    .primary { background: #183c36; color: white; font-weight: 800; }
    .secondary { background: white; color: #183c36; border: 1px solid #e6ded0; }
    .link { color: #183c36; background: transparent; }
    .top-title { margin: 8px 0 22px; }
    .top-title p { color: #183c36; font-weight: 800; margin-bottom: 32px; }
    .top-title h1 { font-size: 30px; line-height: 1.2; }
    .top-title span, label { color: #6f7873; font-size: 13px; display: block; margin-top: 8px; }
    label { margin: 12px 0 7px; }
    .input, .textarea, .search { background: white; border-radius: 16px; min-height: 46px; padding: 14px 16px; color: #6f7873; font-size: 14px; border: 1px solid rgba(230, 222, 208, .7); }
    .textarea { height: 82px; line-height: 1.45; }
    .check { margin: 14px 0; color: #183c36; font-size: 13px; }
    .notice { background: #e8f4ef; color: #183c36; border-radius: 20px; padding: 16px; margin: 12px 0; line-height: 1.45; }
    .notice.slim { font-size: 12px; padding: 12px; }
    .app-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .app-head h1 { font-size: 30px; }
    .app-head p { color: #6f7873; font-size: 12px; margin-top: 4px; }
    .app-head b { min-width: 38px; height: 38px; border-radius: 19px; background: white; display: grid; place-items: center; padding: 0 9px; font-size: 11px; color: #183c36; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
    .chip { padding: 8px 13px; border-radius: 17px; background: white; color: #183c36; font-size: 12px; border: 1px solid #e6ded0; }
    .chip.on { background: #183c36; color: white; border-color: #183c36; }
    .section { font-size: 18px; margin: 18px 0 10px; }
    .card { background: white; border-radius: 20px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(230, 222, 208, .62); }
    .card h3 { font-size: 17px; margin-bottom: 10px; }
    .card h4 { font-size: 16px; margin-bottom: 5px; }
    .card h4 b { float: right; color: #f4a35d; }
    .card p, .card small, .row, li { color: #6f7873; font-size: 12px; line-height: 1.55; }
    .row { display: flex; justify-content: space-between; align-items: center; min-height: 30px; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .badges span { background: #e8f4ef; color: #183c36; border-radius: 12px; padding: 5px 8px; font-size: 11px; }
    .actions { display: flex; gap: 8px; margin-top: 9px; }
    .actions button, .row button { margin: 0; height: 34px; line-height: 34px; border-radius: 17px; background: #183c36; color: white; font-size: 11px; }
    .actions button + button { background: #e8f4ef; color: #183c36; }
    .map { position: relative; height: 220px; border-radius: 23px; background: linear-gradient(135deg, #dcece6, #f2ead9); margin: 12px 0 16px; overflow: hidden; border: 1px solid #d6dfd7; }
    .map.tall { height: 430px; }
    .map:before, .map:after { content: ""; position: absolute; inset: 30px -40px auto; height: 1px; background: rgba(24,60,54,.18); transform: rotate(-18deg); }
    .map:after { top: 140px; transform: rotate(28deg); }
    .map h3 { position: absolute; top: 16px; left: 16px; font-size: 15px; color: #183c36; }
    .pin { position: absolute; padding: 7px 10px; border-radius: 15px; background: #183c36; color: white; font-size: 11px; }
    .p1 { left: 34px; top: 90px; background: #36c5b4; }
    .p2 { left: 160px; top: 62px; background: #7a6af7; }
    .p3 { left: 120px; top: 150px; background: #f4a35d; }
    .route-line { position: absolute; left: 76px; top: 122px; width: 210px; height: 2px; background: #183c36; transform: rotate(-18deg); opacity: .55; }
    .dark-panel { position: relative; background: #183c36; border-radius: 20px; color: white; padding: 16px; margin-bottom: 8px; }
    .dark-panel p { color: #d8f3ef; margin-top: 5px; font-size: 12px; }
    .dark-panel b { position: absolute; right: 14px; top: 16px; background: white; color: #183c36; border-radius: 14px; padding: 7px 10px; font-size: 11px; }
    .topic, .person { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .topic b, .person b { width: 52px; height: 52px; border-radius: 18px; background: #38675f; color: white; display: grid; place-items: center; font-size: 22px; flex: 0 0 auto; }
    .topic.big b, .person.big b { width: 64px; height: 64px; border-radius: 24px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .stats span { text-align: center; }
    .stats b { display: block; color: #183c36; font-size: 15px; }
    .stats small { color: #6f7873; font-size: 10px; }
    .back { font-size: 18px; font-weight: 800; color: #183c36; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cover { height: 170px; border-radius: 24px; background: #183c36; color: white; padding: 118px 18px 18px; position: relative; margin-bottom: 12px; }
    .cover b { position: absolute; right: 22px; top: 22px; width: 48px; height: 48px; border-radius: 24px; background: #36c5b4; color: #183c36; display: grid; place-items: center; }
    .metric { margin: 10px 0; display: grid; grid-template-columns: 80px 38px 1fr; gap: 8px; align-items: center; font-size: 12px; color: #183c36; }
    .metric i { height: 8px; background: #eee8dc; border-radius: 4px; overflow: hidden; }
    .metric em { display: block; height: 100%; background: #36c5b4; border-radius: 4px; }
    .step { display: flex; gap: 12px; margin: 12px 0; }
    .step b { width: 30px; height: 30px; border-radius: 15px; background: #36c5b4; color: white; display: grid; place-items: center; flex: 0 0 auto; }
    .nfc-orbit { height: 210px; border-radius: 32px; background: radial-gradient(circle, #fff 0 26%, #e8f4ef 27% 58%, #f7f4ec 59%); display: grid; place-items: center; text-align: center; color: #183c36; }
    .nfc-orbit span { font-size: 34px; font-weight: 900; }
    .camera, .fullscreen-camera { position: relative; height: 345px; background: #163a35; border-radius: 26px; color: white; overflow: hidden; margin: 12px 0; }
    .camera span { position: absolute; top: 20px; left: 20px; color: #d8f3ef; }
    .ar { position: absolute; padding: 9px 12px; border-radius: 18px; background: #36c5b4; font-size: 12px; }
    .ar.a1 { left: 42px; top: 92px; }
    .ar.a2 { left: 135px; top: 170px; background: #7a6af7; }
    .ar.a3 { left: 50px; top: 252px; background: #f4a35d; }
    .fullscreen-camera { height: 812px; border-radius: 34px; margin: 0; }
    .camera-head { display: flex; gap: 12px; align-items: center; padding: 18px; }
    .camera-head b { width: 44px; height: 44px; border-radius: 22px; background: rgba(0,0,0,.45); display: grid; place-items: center; }
    .camera-head span { margin-left: auto; background: rgba(24,60,54,.72); border-radius: 14px; padding: 7px 10px; font-size: 11px; }
    .task-glass { position: absolute; left: 16px; right: 16px; bottom: 24px; background: rgba(13,31,28,.72); border-radius: 22px; padding: 16px; backdrop-filter: blur(20px); }
    .segments { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; background: #ece6d9; border-radius: 18px; padding: 4px; margin-bottom: 14px; }
    .segments.small { grid-template-columns: repeat(3, 1fr); }
    .segments span { height: 36px; display: grid; place-items: center; border-radius: 14px; font-size: 12px; color: #6f7873; }
    .segments span.on { background: white; color: #183c36; font-weight: 800; }
    .success { height: 100%; display: flex; flex-direction: column; justify-content: center; text-align: center; }
    .success h1 { font-size: 30px; margin-bottom: 16px; }
    .success p { color: #6f7873; line-height: 1.7; margin-bottom: 18px; }
    .world-cover, .world3d { height: 118px; border-radius: 18px; background: linear-gradient(135deg, #183c36, #36c5b4); color: white; display: grid; place-items: center; font-size: 34px; font-weight: 900; margin-bottom: 12px; }
    .world-cover.coffee { background: linear-gradient(135deg, #7a6af7, #f4a35d); }
    .world3d { position: relative; height: 300px; background: linear-gradient(160deg, #153c36, #28675f 55%, #e8f4ef); overflow: hidden; }
    .world3d b { position: absolute; left: 80px; top: 126px; background: #f4a35d; color: #17211f; padding: 10px 14px; border-radius: 16px; font-size: 12px; }
    .world3d .obj2 { left: 210px; top: 92px; background: #7a6af7; color: white; }
    .editor .screen { padding:0; }
    .editor-head { height: 48px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
    .editor-head button { width: 58px; height: 32px; line-height: 32px; margin: 0 0 0 auto; background: #183c36; color: white; font-size: 11px; }
    .world3d.edit { height: 318px; margin-bottom: 10px; }
    .tool-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 10px; }
    .tool-row button { height: 34px; line-height: 34px; margin: 0; border-radius: 17px; background: white; color: #183c36; font-size: 11px; }
    .bubble { max-width: 76%; background: white; border-radius: 18px; padding: 13px 14px; margin: 12px 0; color: #17211f; font-size: 14px; line-height: 1.45; }
    .bubble.mine { margin-left: auto; background: #183c36; color: white; }
    .composer { position: absolute; left: 18px; right: 18px; bottom: 18px; display: flex; gap: 8px; }
    .composer span { flex: 1; background: white; border-radius: 22px; padding: 13px 16px; color: #6f7873; font-size: 13px; }
    .composer button { width: 70px; height: 44px; line-height: 44px; margin: 0; background: #183c36; color: white; }
  </style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;

writeFileSync(htmlPath, html, 'utf8');

execFileSync(chromePath, [
  '--headless',
  '--disable-gpu',
  '--no-first-run',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  pathToFileURL(htmlPath).href
], { stdio: 'inherit' });

console.log(`HTML: ${htmlPath}`);
console.log(`PDF: ${pdfPath}`);
