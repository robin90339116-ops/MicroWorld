const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SMALLWORLD_SMOKE_PORT || 19000 + Math.floor(Math.random() * 1000));
const dataFile = path.join(os.tmpdir(), `smallworld-smoke-${Date.now()}.json`);
const registryFile = `${dataFile}.merchant-registry`;
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

async function waitForHealth() {
  let lastError = null;
  for (let index = 0; index < 40; index += 1) {
    try {
      const { response, body } = await request('/health');
      if (response.ok && body.ok === true) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }
  throw lastError || new Error('SmallWorld backend did not become healthy');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function main() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      SMALLWORLD_BACKEND_HOST: '127.0.0.1',
      SMALLWORLD_BACKEND_PORT: String(port),
      SMALLWORLD_DATA_FILE: dataFile,
      SMALLWORLD_MERCHANT_REGISTRY_FILE: registryFile
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));

  try {
    await waitForHealth();

    const modules = await request('/api/system/modules');
    assert(modules.response.ok, 'module status endpoint failed');
    assert(Array.isArray(modules.body.activeModules), 'module status missing activeModules');
    assert(modules.body.frontendContract && modules.body.frontendContract.bottomTabs.includes('兴趣'), 'module status is not aligned with current frontend tabs');

    const contract = await request('/api/system/frontend-contract');
    assert(contract.response.ok, 'frontend contract endpoint failed');
    assert(contract.body.bottomTabs.map(item => item.label).join('|') === '探索|兴趣|世界|聊天|我', 'frontend contract has wrong bottom tab order');

    const places = await request('/api/explore/places?latitude=-37.8136&longitude=144.9637');
    assert(places.response.ok, 'explore places endpoint failed');
    assert(Array.isArray(places.body.places) && places.body.places.length > 0, 'explore places returned no places');
    assert(Array.isArray(places.body.activities) && places.body.activities.length > 0, 'explore places returned no activities');
    assert(places.body.meta && places.body.meta.contract === 'SmallWorld Explore v1', 'explore meta contract missing');
    const firstPlace = places.body.places[0];
    assert(firstPlace.id && firstPlace.introduction && firstPlace.address, 'place card/detail fields are incomplete');
    assert(firstPlace.rating && Number.isFinite(firstPlace.rating.comfort), 'place rating fields are incomplete');
    assert(Number.isFinite(firstPlace.attendanceCount) && Number.isFinite(firstPlace.nfcTouches), 'place real attendance/touch metrics are incomplete');
    assert(firstPlace.mapMarker && Number.isFinite(firstPlace.mapMarker.latitude), 'place map marker missing');
    assert(firstPlace.socialMetrics && firstPlace.socialMetrics.trustLabel, 'place social metrics missing');
    assert(firstPlace.routeEntrypoints && firstPlace.routeEntrypoints.routePlan === true, 'place route entrypoints missing');

    const placesWithoutOrigin = await request('/api/explore/places');
    assert(placesWithoutOrigin.response.ok, 'explore places without origin failed');
    assert(
      placesWithoutOrigin.body.places.every(place => Number(place.distanceMeters || 0) < 1000000),
      'missing coordinates must not be interpreted as latitude/longitude zero'
    );

    const email = `smoke-${Date.now()}@smallworld.local`;
    const register = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        displayName: 'Smoke Tester',
        email,
        password: 'SmallWorld123',
        deviceId: 'smoke-device'
      })
    });
    assert(register.response.status === 201, `register failed: ${JSON.stringify(register.body)}`);
    assert(register.body.token, 'register did not return token');

    const me = await request('/api/auth/me', {
      headers: authHeaders(register.body.token)
    });
    assert(me.response.ok, 'auth me endpoint failed');
    assert(me.body.user && me.body.user.email === email, 'auth me returned wrong user');

    const profile = await request('/api/auth/profile', {
      method: 'POST',
      headers: authHeaders(register.body.token),
      body: JSON.stringify({
        displayName: 'Smoke Tester',
        interests: ['咖啡', '读书', '城市探索', '摄影'],
        socialIntent: '遇见同频的人'
      })
    });
    assert(profile.response.ok, `profile update failed: ${JSON.stringify(profile.body)}`);
    assert(profile.body.user.profileComplete === true, 'profile did not become complete');

    const logout = await request('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(register.body.token)
    });
    assert(logout.response.ok, 'logout failed');

    const meAfterLogout = await request('/api/auth/me', {
      headers: authHeaders(register.body.token)
    });
    assert(meAfterLogout.response.status === 401, 'logged out token should be rejected');

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'SmallWorld123',
        deviceId: 'smoke-device'
      })
    });
    assert(login.response.ok, `login failed: ${JSON.stringify(login.body)}`);
    assert(login.body.token && login.body.token !== register.body.token, 'login should return a fresh token');
    const token = login.body.token;

    const meProfile = await request('/api/me/profile', {
      headers: authHeaders(token)
    });
    assert(meProfile.response.ok, 'me profile endpoint failed');
    assert(meProfile.body.contract === 'SmallWorld Profile v1', 'me profile contract marker missing');
    assert(Array.isArray(meProfile.body.menu) && meProfile.body.menu.length === 7, 'me profile menu does not match current frontend');
    assert(Array.isArray(meProfile.body.settingsRows) && meProfile.body.settingsRows.length >= 5, 'me settings rows missing');
    assert(Array.isArray(meProfile.body.interestStats) && meProfile.body.interestStats.length > 0, 'me interest stats missing');
    assert(meProfile.body.privacyGuardrails && meProfile.body.privacyGuardrails.invisibleSupported === true, 'me profile privacy guardrails missing');
    assert(meProfile.body.capabilities && meProfile.body.capabilities.worldBackend === true, 'me profile should report the active world backend');

    const settingsSave = await request('/api/me/settings', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        invisible: true,
        todayHidden: true,
        messageNotificationsEnabled: false
      })
    });
    assert(settingsSave.response.ok, `me settings save failed: ${JSON.stringify(settingsSave.body)}`);
    assert(settingsSave.body.settings.invisible === true && settingsSave.body.settings.todayHidden === true, 'me settings did not persist privacy switches');
    assert(settingsSave.body.settings.messageNotificationsEnabled === false, 'me settings did not persist notification switch');

    const meFeaturePaths = [
      ['/api/me/trophies', 'trophies'],
      ['/api/me/moments', 'moments'],
      ['/api/me/clubs', 'clubs'],
      ['/api/me/schedule', 'schedule'],
      ['/api/me/interest-data', 'interests'],
      ['/api/me/nfc', 'exchanges'],
      ['/api/me/worlds', 'worlds'],
      ['/api/me/settings', 'settings'],
      ['/api/me/meTrophies', 'trophies']
    ];
    for (const [pathname, field] of meFeaturePaths) {
      const feature = await request(pathname, {
        headers: authHeaders(token)
      });
      assert(feature.response.ok, `${pathname} endpoint failed`);
      assert(feature.body.contract === 'SmallWorld Profile v1', `${pathname} contract marker missing`);
      assert(feature.body[field] !== undefined, `${pathname} missing ${field}`);
    }

    const social = await request('/api/social/home', {
      headers: authHeaders(token)
    });
    assert(social.response.ok, 'social home endpoint failed');
    assert(social.body.contract === 'SmallWorld Social Chat v1', 'social chat contract marker missing');
    assert(social.body.guardrails && social.body.guardrails.groupsEnabled === false, 'social chat should disable groups');
    assert(Array.isArray(social.body.friends) && social.body.friends.length === 0, 'new accounts must not inherit demo friends');
    assert(Array.isArray(social.body.chats) && social.body.chats.length === 0, 'new accounts must not inherit demo chats');
    assert(social.body.chatMessages.length === 0, 'new accounts must not read demo or other users messages');
    assert(social.body.friends.every(friend => friend.place && friend.momentText && Number.isFinite(friend.score)), 'friend display contract fields missing');
    assert(social.body.chats.every(chat => chat.isGroup === false && chat.type === 'direct'), 'social chats must be one-to-one only');

    const friendsList = await request('/api/friends', {
      headers: authHeaders(token)
    });
    assert(friendsList.response.ok, 'friends list endpoint failed');
    assert(friendsList.body.guardrails && friendsList.body.guardrails.relationshipRequired === true, 'friends guardrails missing');

    const friendDetail = await request('/api/friends/photo', {
      headers: authHeaders(token)
    });
    assert(friendDetail.response.status === 404, 'unowned friend must not be visible');

    const startChat = await request('/api/friends/photo/chat', {
      method: 'POST',
      headers: authHeaders(token)
    });
    assert(startChat.response.status === 404, 'unowned friend cannot start a conversation');

    const chatsList = await request('/api/chats', {
      headers: authHeaders(token)
    });
    assert(chatsList.response.ok, 'chat list endpoint failed');
    assert(chatsList.body.chats.every(chat => chat.isGroup === false), 'chat list should not contain groups');

    const chatId = 'chat-photo';
    const messages = await request(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
      headers: authHeaders(token)
    });
    assert(messages.response.status === 404, 'unowned chat history must be rejected');

    const sendMessage = await request(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ text: 'smoke test message' })
    });
    assert(sendMessage.response.status === 404, 'unowned chat send must be rejected');

    const moments = await request('/api/social/moments', {
      headers: authHeaders(token)
    });
    assert(moments.response.ok, 'moments endpoint failed');
    assert(Array.isArray(moments.body.moments), 'moments list missing');

    const myMoments = await request('/api/social/my-moments', {
      headers: authHeaders(token)
    });
    assert(myMoments.response.ok, 'my moments endpoint failed');
    assert(Array.isArray(myMoments.body.moments), 'my moments list missing');

    const newMoment = await request('/api/social/moments', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ text: 'smoke test moment', place: 'State Library' })
    });
    assert(newMoment.response.status === 201, `create moment failed: ${JSON.stringify(newMoment.body)}`);
    assert(newMoment.body.moment && newMoment.body.moment.visibility === 'seen-connections', 'moment visibility should be limited to seen connections');

    const connectionDecision = await request('/api/connections/request-nightphoto/decline', {
      method: 'POST',
      headers: authHeaders(token)
    });
    assert(connectionDecision.response.status === 404, 'unowned connection request cannot be changed');

    const safetyHome = await request('/api/safety/home', {
      headers: authHeaders(token)
    });
    assert(safetyHome.response.ok, 'safety home endpoint failed');
    assert(safetyHome.body.contract === 'SmallWorld Safety v1', 'safety home contract marker missing');
    assert(safetyHome.body.guardrails && safetyHome.body.guardrails.frontendCanRemainUnchanged === true, 'safety guardrails missing');

    const safetyPrivacy = await request('/api/safety/privacy', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        invisible: true,
        todayHidden: false,
        nfcEnabled: true
      })
    });
    assert(safetyPrivacy.response.ok, `safety privacy failed: ${JSON.stringify(safetyPrivacy.body)}`);
    assert(safetyPrivacy.body.settings.invisible === true && safetyPrivacy.body.settings.todayHidden === false, 'safety privacy did not persist');

    const safetyReport = await request('/api/safety/reports', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        targetType: 'user',
        targetId: 'photo',
        targetUserId: 'photo',
        reason: '骚扰',
        placeId: firstPlace.id,
        description: 'smoke safety report'
      })
    });
    assert(safetyReport.response.status === 201, `safety report failed: ${JSON.stringify(safetyReport.body)}`);
    assert(safetyReport.body.report && safetyReport.body.report.status === 'open', 'safety report body mismatch');

    const reportsList = await request('/api/safety/reports', {
      headers: authHeaders(token)
    });
    assert(reportsList.response.ok, 'safety report list failed');
    assert(reportsList.body.reports.some(reportItem => reportItem.id === safetyReport.body.report.id), 'safety report list missing created report');

    const safetyBlock = await request('/api/safety/blocks', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        targetUserId: 'photo',
        targetName: '慢半拍摄影',
        reason: 'smoke block'
      })
    });
    assert(safetyBlock.response.status === 201, `safety block failed: ${JSON.stringify(safetyBlock.body)}`);
    assert(safetyBlock.body.block && safetyBlock.body.block.status === 'active', 'safety block body mismatch');

    const friendsAfterBlock = await request('/api/friends', {
      headers: authHeaders(token)
    });
    assert(friendsAfterBlock.response.ok, 'friends after block failed');
    assert(!friendsAfterBlock.body.friends.some(friend => friend.id === 'photo'), 'blocked user should be filtered from friends');

    const chatsAfterBlock = await request('/api/chats', {
      headers: authHeaders(token)
    });
    assert(chatsAfterBlock.response.ok, 'chats after block failed');
    assert(!chatsAfterBlock.body.chats.some(chat => chat.friendId === 'photo'), 'blocked user should be filtered from chats');

    const unblock = await request(`/api/safety/blocks/${encodeURIComponent(safetyBlock.body.block.id)}/remove`, {
      method: 'POST',
      headers: authHeaders(token)
    });
    assert(unblock.response.ok, 'safety unblock failed');
    assert(unblock.body.block && unblock.body.block.status === 'removed', 'safety unblock body mismatch');

    const panic = await request('/api/safety/panic', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        placeId: firstPlace.id,
        latitude: -37.8136,
        longitude: 144.9637,
        deviceId: 'smoke-device',
        message: 'smoke panic event'
      })
    });
    assert(panic.response.status === 201, `safety panic failed: ${JSON.stringify(panic.body)}`);
    assert(panic.body.event && panic.body.event.severity === 'high' && panic.body.event.status === 'open', 'safety panic body mismatch');

    const panicResolve = await request(`/api/safety/events/${encodeURIComponent(panic.body.event.id)}/resolve`, {
      method: 'POST',
      headers: authHeaders(token)
    });
    assert(panicResolve.response.ok, 'safety panic resolve failed');
    assert(panicResolve.body.event && panicResolve.body.event.status === 'resolved', 'safety panic resolve body mismatch');

    const safetyAudit = await request('/api/safety/audit', {
      headers: authHeaders(token)
    });
    assert(safetyAudit.response.ok, 'safety audit failed');
    assert(Array.isArray(safetyAudit.body.reports) && Array.isArray(safetyAudit.body.blocks) && Array.isArray(safetyAudit.body.events), 'safety audit lists missing');

    const placeDetail = await request(`/api/places/${encodeURIComponent(firstPlace.id)}`);
    assert(placeDetail.response.ok, 'place detail endpoint failed');
    assert(placeDetail.body.place.introduction && Array.isArray(placeDetail.body.place.activities), 'place detail missing introduction or activities');
    assert(placeDetail.body.recognitionPreview && Array.isArray(placeDetail.body.recognitionPreview.leaderboards), 'place detail recognition preview missing');
    assert(Number.isFinite(placeDetail.body.recognitionPreview.medalCount), 'place detail medal preview missing');

    const activity = placeDetail.body.place.activities[0];
    const activityDetail = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/activities/${encodeURIComponent(activity.id)}`);
    assert(activityDetail.response.ok, 'place activity detail endpoint failed');
    assert(activityDetail.body.activity.description && Array.isArray(activityDetail.body.activity.rules), 'activity detail missing description or rules');
    assert(activityDetail.body.activity.recognition && activityDetail.body.activity.recognition.leaderboardMode, 'activity recognition contract missing');

    const blockedFeed = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/feed`, {
      headers: authHeaders(token)
    });
    assert(blockedFeed.response.status === 403, 'place room feed should require an opened place page token');

    const room = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/open`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ deviceId: 'smoke-device' })
    });
    assert(room.response.status === 201, `place room open failed: ${JSON.stringify(room.body)}`);
    assert(room.body.roomToken, 'place room open did not return room token');
    assert(room.body.guardrails && room.body.guardrails.placeOnly === true, 'place room guardrails missing');

    const feed = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/feed`, {
      headers: {
        ...authHeaders(token),
        'X-Place-Room-Token': room.body.roomToken
      }
    });
    assert(feed.response.ok, 'place room feed endpoint failed');
    assert(Array.isArray(feed.body.posts), 'place room feed missing posts');

    const placeMessage = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/messages`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'X-Place-Room-Token': room.body.roomToken
      },
      body: JSON.stringify({ text: '地点页公共聊天 smoke' })
    });
    assert(placeMessage.response.status === 201, `place room message failed: ${JSON.stringify(placeMessage.body)}`);
    assert(placeMessage.body.post && placeMessage.body.post.placeId === firstPlace.id, 'place room message returned wrong post');
    assert(placeMessage.body.guardrails && placeMessage.body.guardrails.publicChatScope === 'current-place', 'place room message guardrails missing');

    const placeShare = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/shares`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'X-Place-Room-Token': room.body.roomToken
      },
      body: JSON.stringify({
        text: '分享今晚活动入口',
        activityId: activity.id,
        shareLabel: '活动分享'
      })
    });
    assert(placeShare.response.status === 201, `place room share failed: ${JSON.stringify(placeShare.body)}`);
    assert(placeShare.body.post && placeShare.body.post.type === 'share', 'place room share returned wrong post type');

    const closeRoom = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/close`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'X-Place-Room-Token': room.body.roomToken
      }
    });
    assert(closeRoom.response.ok, 'place room close failed');

    const feedAfterClose = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/room/feed`, {
      headers: {
        ...authHeaders(token),
        'X-Place-Room-Token': room.body.roomToken
      }
    });
    assert(feedAfterClose.response.status === 403, 'closed place room token should be rejected');

    const routePlan = await request('/api/explore/route-plan', {
      method: 'POST',
      body: JSON.stringify({ placeId: firstPlace.id, latitude: -37.8136, longitude: 144.9637 })
    });
    assert(routePlan.response.ok, 'route plan endpoint failed');
    assert(Number.isFinite(routePlan.body.distanceMeters) && Number.isFinite(routePlan.body.durationMinutes), 'route plan metrics missing');
    assert(routePlan.body.systemNavigation && routePlan.body.systemNavigation.enabled === true, 'route plan system navigation missing');
    assert(routePlan.body.aiRoute && routePlan.body.aiRoute.deferred === true, 'route plan AI deferred flag missing');

    const interests = await request('/api/interests?q=读书');
    assert(interests.response.ok, 'interest search endpoint failed');
    assert(interests.body.contract === 'SmallWorld Interest/Club v1', 'interest contract marker missing');
    assert(Array.isArray(interests.body.categories) && interests.body.categories.includes('艺术'), 'interest categories missing');
    assert(Array.isArray(interests.body.topics) && interests.body.topics.length > 0, 'interest search returned no topics');
    const firstTopic = interests.body.topics[0];
    assert(firstTopic.summary && Array.isArray(firstTopic.learningSteps) && Array.isArray(firstTopic.places), 'interest topic learning/place fields missing');
    assert(Array.isArray(firstTopic.clubs) && firstTopic.clubs.length > 0, 'interest topic clubs missing');

    const interestDetail = await request(`/api/interests/${encodeURIComponent(firstTopic.id)}`);
    assert(interestDetail.response.ok, 'interest detail endpoint failed');
    assert(interestDetail.body.topic && interestDetail.body.topic.id === firstTopic.id, 'interest detail returned wrong topic');

    const interestClubs = await request(`/api/interests/${encodeURIComponent(firstTopic.id)}/clubs`);
    assert(interestClubs.response.ok, 'interest clubs endpoint failed');
    assert(Array.isArray(interestClubs.body.clubs) && interestClubs.body.clubs.length > 0, 'interest clubs missing');

    const club = await request(`/api/clubs/${encodeURIComponent(firstTopic.clubs[0].id)}`);
    assert(club.response.ok, 'club detail endpoint failed');
    assert(club.body.club && club.body.club.place, 'club detail missing bound place');

    const clubRank = await request(`/api/clubs/${encodeURIComponent(firstTopic.clubs[0].id)}/leaderboard`);
    assert(clubRank.response.ok, 'club leaderboard endpoint failed');
    assert(Array.isArray(clubRank.body.entries) && clubRank.body.entries.length > 0, 'club leaderboard entries missing');

    const recognition = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/recognition`, {
      headers: authHeaders(token)
    });
    assert(recognition.response.ok, 'place recognition endpoint failed');
    assert(Array.isArray(recognition.body.leaderboards) && Array.isArray(recognition.body.medals), 'place leaderboard/medal fields missing');
    assert(recognition.body.rating && recognition.body.rating.trustLabel, 'place recognition rating summary missing');
    assert(recognition.body.medals.every(medal => medal.tokenStandard && medal.chainStatus), 'place medal collectible fields missing');

    const readerEmail = `smoke-reader-${Date.now()}@smallworld.local`;
    const reader = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        displayName: 'Smoke Reader',
        email: readerEmail,
        password: 'SmallWorld123',
        deviceId: 'reader-device'
      })
    });
    assert(reader.response.status === 201, `reader register failed: ${JSON.stringify(reader.body)}`);

    const nfcSession = await request('/api/nfc/sessions', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ placeId: firstPlace.id, hostDeviceId: 'host-device' })
    });
    assert(nfcSession.response.status === 201, `nfc session failed: ${JSON.stringify(nfcSession.body)}`);
    assert(nfcSession.body.contract === 'SmallWorld NFC Proof v1', 'nfc session contract marker missing');
    assert(nfcSession.body.sessionId && nfcSession.body.touchToken, 'nfc session missing token');
    assert(nfcSession.body.guardrails && nfcSession.body.guardrails.phoneToPhoneOnly === true, 'nfc session guardrails missing');

    const sameDeviceNfc = await request('/api/nfc/sessions/confirm', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        sessionId: nfcSession.body.sessionId,
        touchToken: nfcSession.body.touchToken,
        readerDeviceId: 'host-device',
        transport: 'iso_dep_apdu',
        challenge: 'abcdef1234567890',
        gpsVerified: true
      })
    });
    assert(sameDeviceNfc.response.status === 409, 'nfc should reject same user or same device touch');

    const preparedNfc = await request('/api/nfc/sessions/confirm', {
      method: 'POST',
      headers: authHeaders(reader.body.token),
      body: JSON.stringify({
        sessionId: nfcSession.body.sessionId,
        touchToken: nfcSession.body.touchToken,
        readerDeviceId: 'reader-device',
        transport: 'iso_dep_apdu',
        challenge: 'abcdef1234567890',
        gpsVerified: true
      })
    });
    assert(preparedNfc.response.status === 202, 'reader confirmation must wait for host');
    assert(!preparedNfc.body.proofId && !preparedNfc.body.reward, 'one-sided confirmation must not award proof or points');
    const confirmNfc = await request(`/api/nfc/sessions/${nfcSession.body.sessionId}/decision`, {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ action: 'accept', challenge: 'abcdef1234567890' })
    });
    assert(confirmNfc.response.status === 201, `nfc confirm failed: ${JSON.stringify(confirmNfc.body)}`);
    assert(confirmNfc.body.contract === 'SmallWorld NFC Proof v1', 'nfc confirm contract marker missing');
    assert(confirmNfc.body.proofId, 'nfc confirm missing proofId');
    assert(confirmNfc.body.reward && confirmNfc.body.reward.affinity && confirmNfc.body.reward.affinity.added === 6, 'nfc confirm should award affinity (好感度)');
    assert(confirmNfc.body.reward.points && confirmNfc.body.reward.points.awarded === 6, 'nfc confirm should award points (积分)');
    assert(Number.isFinite(confirmNfc.body.timesMet) && confirmNfc.body.timesMet >= 1, 'nfc confirm should report timesMet (第N次碰面)');
    assert(typeof confirmNfc.body.reward.badgeDropped === 'boolean', 'nfc confirm should report 3D badge lucky-drop flag');
    if (confirmNfc.body.reward.badgeDropped) {
      assert(confirmNfc.body.reward.badge && confirmNfc.body.reward.badge.tokenId, 'dropped 3D badge should carry a tokenId');
    }
    assert(confirmNfc.body.guardrails && confirmNfc.body.guardrails.transport === 'iso_dep_apdu', 'nfc confirm transport guardrail missing');

    const nfcStatus = await request(`/api/nfc/sessions/${encodeURIComponent(nfcSession.body.sessionId)}`, {
      headers: authHeaders(token)
    });
    assert(nfcStatus.response.ok, 'nfc session status endpoint failed');
    assert(nfcStatus.body.contract === 'SmallWorld NFC Proof v1', 'nfc status contract marker missing');
    assert(nfcStatus.body.proofId === confirmNfc.body.proofId, 'nfc status proof mismatch');
    const duplicateDecisions = await Promise.all([1, 2, 3].map(() => request(`/api/nfc/sessions/${nfcSession.body.sessionId}/decision`, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify({ action: 'accept', challenge: 'abcdef1234567890' })
    })));
    assert(duplicateDecisions.every(result => result.response.ok && result.body.proofId === confirmNfc.body.proofId &&
      result.body.reward.points.total === confirmNfc.body.reward.points.total), 'parallel retries must return the same proof and reward snapshot');
    const readerStatus = await request(`/api/nfc/sessions/${nfcSession.body.sessionId}`, { headers: authHeaders(reader.body.token) });
    assert(readerStatus.body.reward.points.awarded === 6 && readerStatus.body.chatId === confirmNfc.body.chatId, 'reader must receive reward and shared chat');
    const directMessage = await request(`/api/chats/${confirmNfc.body.chatId}/messages`, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify({ text: '双方确认后的第一条消息' })
    });
    assert(directMessage.response.status === 201, 'NFC must create a usable real conversation');
    const peerMessages = await request(`/api/chats/${confirmNfc.body.chatId}/messages`, { headers: authHeaders(reader.body.token) });
    assert(peerMessages.body.messages.some(item => item.text === '双方确认后的第一条消息' && !item.mine), 'peer must read real message with correct sender');

    const nfcProofs = await request('/api/nfc/proofs', {
      headers: authHeaders(token)
    });
    assert(nfcProofs.response.ok, 'nfc proofs endpoint failed');
    assert(nfcProofs.body.contract === 'SmallWorld NFC Proof v1', 'nfc proofs contract marker missing');
    assert(nfcProofs.body.proofs.some(proof => proof.id === confirmNfc.body.proofId), 'nfc proofs list missing generated proof');

    const review = await request('/api/reviews/nfc', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        placeId: firstPlace.id,
        proofId: confirmNfc.body.proofId,
        scores: { comfort: 92, match: 88, safety: 95, activity: 86, world: 76 },
        comment: 'smoke review',
        repeatVisit: true
      })
    });
    assert(review.response.status === 403, 'client-reported NFC alone must not unlock hardware-verified place reviews');

    const duplicateReview = await request('/api/reviews/nfc', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        placeId: firstPlace.id,
        proofId: confirmNfc.body.proofId,
        scores: { comfort: 92, match: 88, safety: 95, activity: 86, world: 76 },
        comment: 'duplicate smoke review',
        repeatVisit: true
      })
    });
    assert(duplicateReview.response.status === 403, 'retries must not bypass the verified-proof requirement');

    const placeRating = await request(`/api/places/${encodeURIComponent(firstPlace.id)}/rating`);
    assert(placeRating.response.ok, 'place rating endpoint failed');
    assert(placeRating.body.contract === 'SmallWorld Review Rating v1', 'place rating contract marker missing');
    assert(placeRating.body.summary && Number.isFinite(placeRating.body.summary.trustScore), 'place rating summary missing');
    assert(Array.isArray(placeRating.body.dimensions) && placeRating.body.dimensions.length === 5, 'place rating dimensions missing');

    const forgedTap = await request('/api/merchant/taps', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ placeId: 'coffee', merchantId: 'forged', hardwareVerified: true })
    });
    assert(forgedTap.response.status === 400, 'old demo requests must not create merchant evidence');
    const deniedTerminal = await request('/api/merchant/terminals/sessions', {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify({ merchantId: 'shop' })
    });
    assert(deniedTerminal.response.status === 403, 'unregistered terminal must be denied');
    // Operator-only fixture in a temporary file; no HTTP endpoint grants merchant status.
    fs.writeFileSync(registryFile, JSON.stringify([{ merchantId: 'shop', placeId: 'coffee', accountId: reader.body.user.id, deviceId: 'reader-device', active: true }]));
    async function merchantProof() {
      const issued = await request('/api/merchant/terminals/sessions', {
        method: 'POST', headers: authHeaders(reader.body.token), body: JSON.stringify({ merchantId: 'shop' })
      });
      assert(issued.response.status === 201, `terminal issue failed: ${JSON.stringify(issued.body)}`);
      const payload = { ...issued.body.payload, challenge: 'abcdef123456abcdef123456', transport: 'nfc-isodep' };
      const observed = await request(`/api/merchant/terminals/sessions/${payload.sessionId}/observe`, {
        method: 'POST', headers: authHeaders(reader.body.token), body: JSON.stringify({ challenge: payload.challenge })
      });
      assert(observed.response.ok, 'terminal observation failed');
      return payload;
    }
    const proof = await merchantProof();
    const merchantTap = await request('/api/merchant/taps', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(proof)
    });
    assert(merchantTap.response.status === 201, `merchant tap failed: ${JSON.stringify(merchantTap.body)}`);
    assert(merchantTap.body.contract === 'SmallWorld Merchant Tap v1', 'merchant tap contract marker missing');
    assert(merchantTap.body.guardrails && merchantTap.body.guardrails.separatedFromPhoneToPhoneProof === true, 'merchant tap guardrails missing');
    const tapId = merchantTap.body.tap.id;
    const tapRetries = await Promise.all(Array.from({ length: 6 }, () => request('/api/merchant/taps', {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify(proof)
    })));
    assert(tapRetries.every(result => result.response.status === 200 && result.body.tap.id === tapId), 'merchant claim retries must return the same tap');
    assert(merchantTap.body.tap.hardwareVerified === false && merchantTap.body.tap.gpsVerified === false, 'client reports are not hardware/GPS attestations');

    const merchantConflict = await request('/api/merchant/taps', {
      method: 'POST',
      headers: authHeaders(reader.body.token),
      body: JSON.stringify(proof)
    });
    assert(merchantConflict.response.status === 409, 'merchant tap should reject same consumer and merchant device');

    const merchantCheckin = await request(`/api/merchant/taps/${encodeURIComponent(tapId)}/checkin`, {
      method: 'POST',
      headers: authHeaders(token)
    });
    assert(merchantCheckin.response.ok, `merchant checkin failed: ${JSON.stringify(merchantCheckin.body)}`);
    assert(merchantCheckin.body.tap.status === 'checked-in', 'merchant checkin status mismatch');

    const merchantPayment = await request(`/api/merchant/taps/${encodeURIComponent(tapId)}/payments`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        itemName: 'Flat White',
        amount: 6.5,
        currency: 'AUD'
      })
    });
    assert(merchantPayment.response.status === 503, 'unconfigured payment must fail closed');
    assert(merchantPayment.body.error === 'PAYMENT_NOT_CONFIGURED', 'payment availability error missing');
    assert(!merchantPayment.body.order, 'unconfigured payment must not create a paid order');

    const merchantItemReview = await request(`/api/merchant/taps/${encodeURIComponent(tapId)}/item-reviews`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        itemName: 'Flat White',
        stars: 5,
        tags: ['顺滑', '适合聊天'],
        comment: '适合低压力碰面前喝一杯。'
      })
    });
    assert(merchantItemReview.response.status === 403, 'unverified payment must not unlock item review');
    assert(merchantItemReview.body.error === 'VERIFIED_PAYMENT_REQUIRED', 'verified payment gate missing');

    // 评价地点(设计 p2b-rate):打卡后可评价,完成即发放商家纪念徽章 + 积分。
    const merchantPlaceReview = await request(`/api/merchant/taps/${encodeURIComponent(tapId)}/place-reviews`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ stars: 5, tags: ['环境好', '咖啡赞', '适合独处'], comment: 'smoke 到店评价' })
    });
    assert(merchantPlaceReview.response.status === 201, `merchant place review failed: ${JSON.stringify(merchantPlaceReview.body)}`);
    assert(merchantPlaceReview.body.reward && merchantPlaceReview.body.reward.medal && merchantPlaceReview.body.reward.medal.tokenId, 'merchant place review should grant a commemorative medal');
    assert(merchantPlaceReview.body.reward.medal.chainStatus, 'merchant medal should carry a chain status');
    assert(merchantPlaceReview.body.reward.points && merchantPlaceReview.body.reward.points.awarded === 5, 'merchant place review should award points');

    const reviewRetries = await Promise.all(Array.from({ length: 6 }, () => request(`/api/merchant/taps/${encodeURIComponent(tapId)}/place-reviews`, {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ stars: 5, tags: ['咖啡赞', '环境好', '适合独处'], comment: 'smoke 到店评价' })
    })));
    assert(reviewRetries.every(result => result.response.status === 200 && result.body.review.id === merchantPlaceReview.body.review.id), 'concurrent retries must reuse the original review');
    assert(reviewRetries.every(result => JSON.stringify(result.body.reward) === JSON.stringify(merchantPlaceReview.body.reward)), 'retry must return original reward snapshot');

    const duplicatePlaceReview = await request(`/api/merchant/taps/${encodeURIComponent(tapId)}/place-reviews`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ stars: 4 })
    });
    assert(duplicatePlaceReview.response.status === 409, 'duplicate merchant place review should be rejected');

    // 门槛校验:未打卡不能评价地点、未支付不能评价物品。
    const gateTap = await request('/api/merchant/taps', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(await merchantProof())
    });
    assert(gateTap.response.status === 201, `gate tap failed: ${JSON.stringify(gateTap.body)}`);
    const earlyPlaceReview = await request(`/api/merchant/taps/${encodeURIComponent(gateTap.body.tap.id)}/place-reviews`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ stars: 5 })
    });
    assert(earlyPlaceReview.response.status === 403, 'place review before checkin should be rejected');
    const earlyItemReview = await request(`/api/merchant/taps/${encodeURIComponent(gateTap.body.tap.id)}/item-reviews`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ itemName: 'x', stars: 5 })
    });
    assert(earlyItemReview.response.status === 403, 'item review before payment should be rejected');

    const merchantTapList = await request('/api/merchant/taps', {
      headers: authHeaders(token)
    });
    assert(merchantTapList.response.ok, 'merchant tap list failed');
    assert(merchantTapList.body.contract === 'SmallWorld Merchant Tap v1', 'merchant tap list contract marker missing');
    assert(merchantTapList.body.taps.some(tap => tap.id === tapId && tap.orderCount === 0 && tap.itemReviewCount === 0 && tap.placeReviewCount === 1), 'failed payment must leave no order or item review');

    const aiRoute = await request('/api/explore/ai-route', { method: 'POST', body: JSON.stringify({}) });
    assert(aiRoute.response.status === 501, 'deferred AI route should return 501');

    const interestAi = await request('/api/interests/ai-assistant', { method: 'POST', body: JSON.stringify({}) });
    assert(interestAi.response.status === 501, 'deferred interest AI should return 501');

    const worlds = await request('/api/worlds', {
      headers: authHeaders(token)
    });
    assert(worlds.response.ok, `worlds endpoint failed: ${JSON.stringify(worlds.body)}`);
    assert(Array.isArray(worlds.body.worlds), 'worlds endpoint should return a list');
    assert(Array.isArray(worlds.body.assetLibrary) && worlds.body.assetLibrary.length > 0, 'worlds asset library missing');

    console.log('SmallWorld backend smoke test passed.');
  } finally {
    child.kill('SIGTERM');
    if (fs.existsSync(dataFile)) {
      fs.rmSync(dataFile, { force: true });
    }
    if (fs.existsSync(registryFile)) fs.rmSync(registryFile, { force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
