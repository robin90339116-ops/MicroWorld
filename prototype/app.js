const tabs = [
  { label: "探索", icon: "⌖", screen: "explore" },
  { label: "实景", icon: "◌", screen: "scene" },
  { label: "世界", icon: "◎", screen: "world" },
  { label: "聊天", icon: "◇", screen: "chat" },
  { label: "我", icon: "◉", screen: "profile" },
];

const places = [
  {
    name: "State Library Reading Club",
    cover: "城市图书馆 · 夜间读书会",
    tags: "读书 / 咖啡 / 安静社交 / 城市探索",
    score: "4.8",
    distance: "1.2km",
    today: "今晚 19:00 有活动",
    ar: true,
    world: true,
    rating: [92, 88, 95, 86, 76],
    worlds: ["图书馆记忆墙", "隐藏书签花园"],
    reviews: ["这里适合轻松聊天，不尴尬。", "读书会的人比较同频，任务也很自然。"],
  },
  {
    name: "Market Lane Coffee Corner",
    cover: "巷口咖啡 · 慢社交角落",
    tags: "咖啡 / 摄影 / 轻聊天",
    score: "4.6",
    distance: "800m",
    today: "今天 16:30 咖啡地图任务",
    ar: true,
    world: true,
    rating: [89, 82, 91, 78, 80],
    worlds: ["巷口咖啡时间", "城市杯垫收藏"],
    reviews: ["店里的人不会很吵，适合第一次见面。", "AR 杯垫任务很好破冰。"],
  },
  {
    name: "Carlton Board Game Night",
    cover: "桌游夜 · 小局活动",
    tags: "桌游 / 活动 / 新人友好",
    score: "4.7",
    distance: "2.4km",
    today: "今晚 20:00 新手桌游局",
    ar: false,
    world: true,
    rating: [86, 90, 88, 94, 72],
    worlds: ["周三桌游档案馆"],
    reviews: ["主理人会带新人，不用担心融不进去。", "比普通群聊舒服很多。"],
  },
];

const members = [
  {
    name: "林间书页",
    avatar: "书",
    tags: "读书 / 咖啡 / 城市探索",
    source: "你们都在 State Library",
    common: "共同兴趣：读书、安静社交",
    status: "可接受轻互动",
    action: "邀请完成任务",
  },
  {
    name: "慢半拍摄影",
    avatar: "镜",
    tags: "摄影 / 展览 / 音乐",
    source: "正在参与：隐藏书签 AR 任务",
    common: "共同地点：State Library",
    status: "任务中",
    action: "共同解锁",
  },
  {
    name: "城市手帐",
    avatar: "册",
    tags: "手作 / 读书 / 展览",
    source: "来自：图书馆记忆墙小世界",
    common: "共同兴趣：展览、城市故事",
    status: "今天不想被打扰",
    action: "收藏小世界",
  },
];

let state = {
  screen: "welcome",
  tab: 0,
  place: 0,
  member: 0,
  invisible: false,
};

const screen = document.querySelector("#screen");
const tabbar = document.querySelector("#tabbar");

function go(next) {
  state.screen = next;
  const tabIndex = tabs.findIndex((item) => item.screen === next);
  if (tabIndex >= 0) state.tab = tabIndex;
  render();
}

function selectPlace(index) {
  state.place = index;
  go("place");
}

function selectMember(index) {
  state.member = index;
  go("relation");
}

function renderTabs() {
  const hide = ["welcome", "identity", "place", "relation", "success", "createWorld", "chatDetail"].includes(state.screen);
  tabbar.classList.toggle("hidden", hide);
  tabbar.innerHTML = tabs
    .map(
      (item, index) => `
        <button class="tab ${state.tab === index ? "active" : ""}" data-go="${item.screen}">
          <strong>${item.icon}</strong>
          <span>${item.label}</span>
        </button>
      `
    )
    .join("");
}

function render() {
  screen.classList.toggle("no-pad", state.screen === "welcome");
  const pages = {
    welcome,
    identity,
    explore,
    place,
    scene,
    members: memberPage,
    relation,
    success,
    world,
    createWorld,
    chat,
    chatDetail,
    profile,
  };
  screen.innerHTML = pages[state.screen]();
  renderTabs();
}

function welcome() {
  return `
    <section class="hero">
      <div class="logo" aria-hidden="true"></div>
      <h1>SmallWorld</h1>
      <h2>在真实地点，遇见同频的人</h2>
      <p>探索附近兴趣空间，参与线下活动，用实景 AR 发现隐藏互动，和真实见过的人建立连接。</p>
      <p><strong>线下相遇 × 实景互动 × 虚拟世界</strong></p>
      <button class="primary" data-go="identity">开始探索</button>
      <button class="ghost" data-go="explore">已有账号登录</button>
    </section>
  `;
}

function identity() {
  const interests = ["咖啡", "读书", "摄影", "运动", "桌游", "音乐", "艺术", "电影", "城市探索", "展览", "手作", "宠物"];
  const intents = ["参加线下活动", "遇见同频的人", "探索城市地点", "创造虚拟世界"];
  return `
    <div class="top">
      <div>
        <p class="sub">SmallWorld</p>
        <h2>创建你的线下社交身份</h2>
        <p>选择兴趣，让城市推荐更适合你</p>
      </div>
    </div>
    <div class="chips wrap">
      ${interests.map((item, index) => `<button class="chip ${index < 3 ? "active" : ""}">${item}</button>`).join("")}
    </div>
    <div class="section-title"><h3>你来到 SmallWorld，是为了：</h3></div>
    <div class="card">
      ${intents.map((item, index) => `<div class="list-row"><span>${index === 1 ? "●" : "○"} ${item}</span></div>`).join("")}
    </div>
    <button class="primary" data-go="explore">进入 SmallWorld</button>
  `;
}

function explore() {
  return `
    <div class="top">
      <div>
        <h2>SmallWorld</h2>
        <p class="sub">墨尔本 · 真实地点上的兴趣社交</p>
      </div>
      <button class="ghost" style="width:42px;min-height:42px">铃</button>
    </div>
    <input class="search" placeholder="搜索地点 / 兴趣 / 活动" />
    <div class="filters">
      ${["全部", "咖啡", "读书", "摄影", "运动", "桌游", "音乐", "艺术"].map((item, index) => `<button class="chip ${index === 0 ? "active" : ""}">${item}</button>`).join("")}
    </div>
    <section class="map">
      <div class="map-title">城市地图</div>
      <span class="pin cafe">📍 咖啡馆</span>
      <span class="pin event">🎯 活动</span>
      <span class="pin world">🌍 小世界</span>
      <span class="pin ar">✨ AR任务</span>
    </section>
    <div class="section-title">
      <h3>附近适合线下见面的地方</h3>
      <small>按社交质量排序</small>
    </div>
    ${places.map(placeCard).join("")}
  `;
}

function placeCard(place, index) {
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>${place.name}</h3>
          <p class="meta">${place.tags}</p>
        </div>
        <strong class="score">${place.score}</strong>
      </div>
      <div class="quality">
        <span>综合评分 ${place.score}</span>
        <span>社交舒适度 ${place.rating[0]}%</span>
        <span>兴趣匹配度 ${place.rating[1]}%</span>
      </div>
      <p class="meta">${place.distance}｜${place.today}</p>
      <p class="meta">${place.ar ? "有 AR 任务" : "暂无 AR 任务"}｜${place.world ? "有用户小世界" : "暂无小世界"}</p>
      <div class="actions">
        <button class="primary" data-place="${index}">查看详情</button>
        <button class="secondary">导航</button>
      </div>
    </article>
  `;
}

function place() {
  const item = places[state.place];
  const labels = ["社交舒适度", "兴趣匹配度", "安全感", "活动质量", "小世界丰富度"];
  return `
    <button class="back" data-go="explore">‹</button>
    <section class="cover">
      <div>
        <h3>${item.cover}</h3>
        <p style="color:#d8f3ef">到场后解锁完整实景互动</p>
      </div>
    </section>
    <article class="card">
      <h2>${item.name}</h2>
      <p>${item.tags}</p>
      <p class="meta">综合评分 ${item.score}｜${item.distance}｜今晚有活动</p>
    </article>
    <article class="card">
      <h3>适合线下社交指数</h3>
      ${labels.map((label, index) => ratingRow(label, item.rating[index])).join("")}
    </article>
    <article class="card">
      <h3>今天这里有什么？</h3>
      <div class="list-row"><strong>19:00</strong><span>读书交流会</span></div>
      <div class="list-row"><strong>20:30</strong><span>城市书签 AR 任务</span></div>
    </article>
    <article class="card">
      <h3>这里的小世界</h3>
      ${item.worlds.map((world) => `<div class="list-row"><span>◎ ${world}</span></div>`).join("")}
    </article>
    <article class="card">
      <h3>用户评价</h3>
      ${item.reviews.map((review) => `<p>“${review}”</p>`).join("")}
    </article>
    <div class="actions">
      <button class="ghost">导航前往</button>
      <button class="primary" data-go="scene">到达后进入实景</button>
    </div>
  `;
}

function ratingRow(label, value) {
  return `
    <div class="rating-row">
      <span>${label}</span>
      <span class="bar"><i style="width:${value}%"></i></span>
      <strong>${value}%</strong>
    </div>
  `;
}

function scene() {
  return `
    <button class="back" data-go="explore">‹</button>
    <div class="top">
      <div>
        <h2>实景模式</h2>
        <p class="sub">State Library｜已到达现场｜GPS + QR 已验证</p>
      </div>
    </div>
    <section class="camera">
      <span class="camera-label">AR 相机画面</span>
      <span class="ar-pin one">✨ 隐藏书签</span>
      <span class="ar-pin two">🌍 图书馆记忆墙</span>
      <span class="ar-pin three">🎯 破冰任务</span>
      <span class="ar-pin member-count">附近 3 位同兴趣用户</span>
    </section>
    <article class="card">
      <h3>今日任务：找到隐藏书签</h3>
      <p>邀请一位现场用户共同解锁。完成后可以选择是否建立低打扰联系。</p>
      <div class="actions">
        <button class="secondary">扫描</button>
        <button class="primary" data-go="members">附近的人</button>
      </div>
    </article>
  `;
}

function memberPage() {
  return `
    <button class="back" data-go="scene">‹</button>
    <div class="top"><h2>现场成员</h2></div>
    <div class="notice">
      <strong>仅展示愿意被发现的现场用户</strong>
      <p>你可以先通过任务或兴趣自然破冰。默认不能直接私聊。</p>
    </div>
    <div class="filters">
      ${["同兴趣", "同任务", "同小世界", "安静社交"].map((item) => `<button class="chip">${item}</button>`).join("")}
    </div>
    <div class="section-title"><h3>现场有 12 位同频用户</h3><small>已到场可见</small></div>
    ${members.map(memberCard).join("")}
  `;
}

function memberCard(member, index) {
  return `
    <article class="card">
      <div class="row">
        <div class="avatar">${member.avatar}</div>
        <div>
          <h3>${member.name}</h3>
          <p class="meta">${member.tags}</p>
        </div>
      </div>
      <p class="meta">${member.source}</p>
      <p class="meta">${member.common}</p>
      <p class="meta">状态：${member.status}</p>
      <div class="actions">
        <button class="primary" ${member.status.includes("不想") ? "" : `data-member="${index}"`}>${member.action}</button>
        <button class="secondary">${member.status.includes("不想") ? "稍后再说" : "轻打招呼"}</button>
      </div>
    </article>
  `;
}

function relation() {
  const member = members[state.member];
  return `
    <button class="back" data-go="members">‹</button>
    <div class="top"><h2>建立连接</h2></div>
    <div class="notice">
      <strong>你们不是陌生网友</strong>
      <p>你们刚刚在真实地点产生过交集，确认后才会开放聊天。</p>
    </div>
    <article class="card">
      <h3>关系来源</h3>
      <div class="list-row"><span>地点</span><strong>State Library</strong></div>
      <div class="list-row"><span>共同完成</span><strong>隐藏书签 AR 任务</strong></div>
      <div class="list-row"><span>时间</span><strong>今天 20:36</strong></div>
    </article>
    <article class="card">
      <div class="row">
        <div class="avatar">${member.avatar}</div>
        <div><h3>${member.name}</h3><p>${member.tags}</p></div>
      </div>
      <p class="meta">${member.common}</p>
      <p class="meta">共同小世界：图书馆记忆墙</p>
    </article>
    <article class="card">
      <h3>你想如何建立关系？</h3>
      ${["活动搭子", "兴趣同频", "小世界共建者", "仅保持轻联系"].map((item, index) => `<div class="list-row"><span>${index === 1 ? "●" : "○"} ${item}</span></div>`).join("")}
    </article>
    <article class="card">
      <h3>隐私设置</h3>
      <div class="list-row"><span>☑ 仅开放聊天</span></div>
      <div class="list-row"><span>☐ 开放我的小世界动态</span></div>
      <div class="list-row"><span>☑ 不显示私人资料</span></div>
    </article>
    <button class="primary" data-go="success">发送连接请求</button>
  `;
}

function success() {
  return `
    <section class="hero">
      <h2>连接已建立</h2>
      <p>你们现在可以聊天了，因为你们在 State Library 共同完成了隐藏书签任务。</p>
      <button class="primary" data-go="chatDetail">进入聊天</button>
      <button class="secondary" data-go="scene">回到实景</button>
    </section>
  `;
}

function world() {
  const worlds = [
    ["图书馆记忆墙", "State Library", "留言墙 / 地标故事 / AR", "128 人访问｜12 人共建", "新增 3 条书签故事"],
    ["巷口咖啡时间", "Market Lane Coffee", "AR 宝藏 / 咖啡地图", "42 人访问｜可邀请共建", "今晚有人放置新杯垫"],
    ["隐藏书签花园", "State Library", "附近世界 / 到场解锁", "距你 1.2km｜今晚有 AR 任务", "需要现场共同解锁"],
  ];
  return `
    <div class="top">
      <div><h2>世界</h2><p class="sub">把真实地点，变成你的虚拟空间</p></div>
      <button class="primary" style="width:42px;min-height:42px" data-go="createWorld">+</button>
    </div>
    <div class="segments">
      <div class="segment active">我的世界</div>
      <div class="segment">附近世界</div>
      <div class="segment">共建中</div>
    </div>
    ${worlds.map((item) => `
      <article class="card">
        <div class="row"><div class="avatar">◎</div><div><h3>${item[0]}</h3><p>绑定地点：${item[1]}</p></div></div>
        <p class="meta">类型：${item[2]}</p>
        <p class="meta">${item[3]}｜${item[4]}</p>
        <div class="actions"><button class="primary">${item[0].includes("隐藏") ? "到现场解锁" : "管理"}</button><button class="secondary">进入世界</button></div>
      </article>
    `).join("")}
    <button class="primary" data-go="createWorld">创建小世界</button>
  `;
}

function createWorld() {
  return `
    <button class="back" data-go="world">‹</button>
    <div class="top"><h2>创建小世界</h2></div>
    <article class="card">
      <h3>这个小世界属于哪里？</h3>
      <div class="list-row"><strong>State Library</strong><button class="secondary" style="width:auto;min-height:34px;padding:0 14px">更换地点</button></div>
    </article>
    <input class="search" value="图书馆记忆墙" />
    <div class="section-title"><h3>选择世界类型</h3></div>
    <div class="chips wrap">
      ${["留言墙", "AR 宝藏", "地标故事", "任务空间", "共同建设空间"].map((item, index) => `<button class="chip ${index === 0 ? "active" : ""}">${item}</button>`).join("")}
    </div>
    <article class="card">
      <h3>添加第一个内容</h3>
      <div class="list-row"><span>+ 写一段地点故事</span></div>
      <div class="list-row"><span>+ 放置一个 AR 宝藏</span></div>
      <div class="list-row"><span>+ 创建一个破冰任务</span></div>
    </article>
    <article class="card">
      <h3>可见范围</h3>
      <div class="list-row"><span>● 到场后可见</span></div>
      <div class="list-row"><span>○ 公开可见</span></div>
      <div class="list-row"><span>○ 仅邀请可见</span></div>
    </article>
    <button class="primary" data-go="world">生成小世界</button>
  `;
}

function chat() {
  const chats = [
    ["林间书页", "刚刚那个书签任务挺有意思。", "来源：State Library 共同任务", "共同兴趣：读书 / 咖啡", "已建立"],
    ["图书馆记忆墙 共建组", "有人新增了一条城市书签故事。", "来源：共同小世界", "12 位共建者", "共建"],
    ["慢半拍摄影", "待确认连接请求", "来源：今晚摄影散步活动", "共同地点：Carlton", "待确认"],
  ];
  return `
    <div class="top"><div><h2>聊天</h2><p class="sub">只显示真实见过或共同互动的人</p></div></div>
    <div class="filters">
      ${["全部", "见过的人", "活动", "共建", "待确认"].map((item) => `<button class="chip">${item}</button>`).join("")}
    </div>
    ${chats.map((item, index) => `
      <article class="card" data-go="${index === 2 ? "relation" : "chatDetail"}">
        <div class="row">
          <div class="avatar">${item[0].slice(0, 1)}</div>
          <div>
            <h3>${item[0]}</h3>
            <p>“${item[1]}”</p>
            <p class="meta">${item[2]}</p>
            <p class="meta">${item[3]}</p>
          </div>
        </div>
      </article>
    `).join("")}
  `;
}

function chatDetail() {
  return `
    <button class="back" data-go="chat">‹</button>
    <div class="top"><div><h2>林间书页</h2><p class="sub">见于 State Library｜隐藏书签任务</p></div></div>
    <article class="card">
      <h3>你们的共同来源</h3>
      <div class="list-row"><span>地点</span><strong>State Library</strong></div>
      <div class="list-row"><span>任务</span><strong>共同完成隐藏书签任务</strong></div>
      <div class="list-row"><span>小世界</span><strong>都访问过图书馆记忆墙</strong></div>
    </article>
    <div class="message">刚刚那个书签任务挺有意思。</div>
    <div class="message mine">对，而且不太尴尬。</div>
    <div class="composer">
      <input placeholder="输入消息..." />
      <button class="primary">发送</button>
    </div>
  `;
}

function profile() {
  return `
    <div class="top"><h2>我</h2><button class="ghost" style="width:64px;min-height:38px">设置</button></div>
    <article class="card">
      <div class="row">
        <div class="avatar">城</div>
        <div><h3>城市书签</h3><p>读书 / 咖啡 / 城市探索</p><p class="meta">社交意图：遇见同频的人</p></div>
      </div>
      <div class="list-row">
        <span>${state.invisible ? "当前状态：隐身中" : "当前状态：可被同兴趣用户发现"}</span>
        <button class="secondary" style="width:auto;min-height:34px;padding:0 14px" data-toggle="invisible">${state.invisible ? "取消隐身" : "切换隐身"}</button>
      </div>
    </article>
    <article class="card">
      <h3>线下足迹</h3>
      <div class="stats">
        <span><strong>18</strong>去过地点</span>
        <span><strong>9</strong>AR 任务</span>
        <span><strong>2</strong>小世界</span>
        <span><strong>14</strong>真实见过</span>
      </div>
    </article>
    ${profileSection("我的身份", ["兴趣标签", "编辑兴趣", "社交偏好"])}
    ${profileSection("我的内容", ["我的足迹", "我的徽章", "收藏地点", "我的小世界"])}
    ${profileSection("隐私与安全", ["今天不想被发现", "黑名单与举报记录", "到场验证记录", "安全按钮"])}
  `;
}

function profileSection(title, items) {
  return `
    <article class="card">
      <h3>${title}</h3>
      ${items.map((item) => `<div class="list-row"><span>${item}</span><strong>›</strong></div>`).join("")}
    </article>
  `;
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  const placeButton = event.target.closest("[data-place]");
  const memberButton = event.target.closest("[data-member]");
  const toggleButton = event.target.closest("[data-toggle]");

  if (placeButton) {
    selectPlace(Number(placeButton.dataset.place));
    return;
  }

  if (memberButton) {
    selectMember(Number(memberButton.dataset.member));
    return;
  }

  if (toggleButton) {
    state.invisible = !state.invisible;
    render();
    return;
  }

  if (goButton) {
    go(goButton.dataset.go);
  }
});

render();
