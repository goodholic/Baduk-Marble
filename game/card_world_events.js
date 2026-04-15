// ============================================
// 월드 이벤트 — 서버 전체 실시간 이벤트
// 시간대별 월드 버프, 돌발 이벤트, 서버 도전 과제
// ============================================

// ── 시간대별 월드 버프 (매 6시간 로테이션) ──
const WORLD_BUFFS = [
  { id: 'wb_gold', name: '🏆 골드 러시', effect: { goldMul: 2.0 }, duration: 21600, desc: '모든 골드 획득 2배!' },
  { id: 'wb_exp', name: '📚 지식의 시간', effect: { expMul: 2.0 }, duration: 21600, desc: '모든 EXP 2배!' },
  { id: 'wb_summon', name: '📜 소환 축제', effect: { summonRateUp: 1.5 }, duration: 21600, desc: '전설+ 확률 1.5배!' },
  { id: 'wb_pvp', name: '⚔️ 전투의 날', effect: { pvpReward: 2.0 }, duration: 21600, desc: 'PvP 보상 2배!' },
];

// ── 돌발 이벤트 (랜덤, 30분~2시간) ──
const SURPRISE_EVENTS = [
  { id: 'se_meteor', name: '☄️ 유성우!', effect: { goldRain: true, goldPerClick: 100 }, duration: 1800, chance: 0.05, desc: '30분간 유성 클릭 시 100G!' },
  { id: 'se_boss', name: '🐲 월드 보스 출현!', effect: { worldBoss: true }, duration: 3600, chance: 0.03, desc: '전원 합력 보스전!' },
  { id: 'se_merchant', name: '🧑‍💼 전설의 상인!', effect: { legendShop: true }, duration: 1800, chance: 0.04, desc: '전설 장비 할인 판매!' },
  { id: 'se_double', name: '💰💰 더블 타임!', effect: { allMul: 2.0 }, duration: 3600, chance: 0.03, desc: '모든 보상 2배!' },
  { id: 'se_invasion', name: '👹 몬스터 침공!', effect: { monsterInvasion: true }, duration: 7200, chance: 0.02, desc: '서버 전원 방어전!' },
  { id: 'se_treasure', name: '💎 보물섬 발견!', effect: { treasureIsland: true }, duration: 3600, chance: 0.03, desc: '특별 보물 원정 개방!' },
  { id: 'se_festival', name: '🎉 축제!', effect: { allMul: 1.5, socialMul: 3.0 }, duration: 7200, chance: 0.02, desc: '모든 보상+50%, 소셜 보상 3배!' },
  { id: 'se_eclipse', name: '🌑 일식!', effect: { darkMul: 2.0, lightMul: 0.5 }, duration: 3600, chance: 0.03, desc: '어둠 속성 2배, 빛 속성 0.5배!' },
];

// ── 서버 도전 과제 (매주 갱신) ──
const WORLD_CHALLENGES = [
  { id: 'wc_kills', name: '서버 처치 목표', goal: 10000, track: 'serverKills', reward: { allGold: 3000 }, desc: '서버 전체 몬스터 1만 처치!' },
  { id: 'wc_trades', name: '서버 무역 목표', goal: 1000, track: 'serverTrades', reward: { allDiamonds: 10 }, desc: '서버 전체 무역 1000회!' },
  { id: 'wc_pvp', name: '서버 대전 목표', goal: 500, track: 'serverPvpBattles', reward: { allGold: 5000 }, desc: '서버 전체 PvP 500회!' },
  { id: 'wc_tower', name: '서버 탑 목표', goal: 200, track: 'serverTowerClears', reward: { allDiamonds: 15 }, desc: '서버 전체 탑 200층 클리어!' },
];

// ── 이벤트 참여 보상 테이블 ──
const EVENT_PARTICIPATION_REWARDS = {
  se_meteor:   { gold: 100 },
  se_boss:     { gold: 2000, exp: 500, diamonds: 5 },
  se_merchant: { gold: 0 },  // 상인은 상점 접근 권한만
  se_double:   { gold: 500, exp: 200 },
  se_invasion: { gold: 1500, exp: 400, diamonds: 3 },
  se_treasure: { gold: 3000, diamonds: 10 },
  se_festival: { gold: 800, exp: 300 },
  se_eclipse:  { gold: 1000, exp: 250 },
};

// ============================================
// 서버 전역 상태 (모듈 레벨)
// ============================================

const worldState = {
  // 현재 월드 버프
  currentBuff: null,
  buffStartedAt: 0,

  // 활성 돌발 이벤트 목록
  activeEvents: [],          // [{ ...eventDef, startedAt, endsAt, participants: Set }]

  // 서버 도전 과제 진행도
  challengeProgress: {
    serverKills: 0,
    serverTrades: 0,
    serverPvpBattles: 0,
    serverTowerClears: 0,
  },
  challengeWeekStart: 0,    // 현재 주 시작 시각 (ms)
  challengeCompleted: {},    // { [challengeId]: true } — 이번 주 완료 여부

  // 이벤트 히스토리 (최근 20개)
  eventHistory: [],

  // 마지막 돌발 이벤트 체크 시각
  lastSurpriseCheck: 0,
};

// ============================================
// 월드 버프 로테이션
// ============================================

/**
 * 현재 시간 기준으로 6시간 단위 월드 버프를 결정한다.
 * UTC 기준 0시부터 6시간 블록으로 나눠 WORLD_BUFFS를 순환.
 */
function getCurrentWorldBuff() {
  const now = Date.now();
  const sixHoursMs = 6 * 60 * 60 * 1000;
  // epoch부터 6시간 블록 인덱스
  const blockIndex = Math.floor(now / sixHoursMs);
  const buffIndex = blockIndex % WORLD_BUFFS.length;
  const buff = WORLD_BUFFS[buffIndex];

  const blockStart = blockIndex * sixHoursMs;
  const blockEnd = blockStart + sixHoursMs;
  const remainingSec = Math.max(0, Math.floor((blockEnd - now) / 1000));

  return {
    ...buff,
    startedAt: blockStart,
    endsAt: blockEnd,
    remainingSec,
  };
}

// ============================================
// 돌발 이벤트
// ============================================

/**
 * 돌발 이벤트 롤. 30분마다 호출.
 * 각 이벤트의 chance로 독립 판정, 동시에 최대 2개까지 활성.
 * @returns {Array} 새로 발생한 이벤트 목록
 */
function checkSurpriseEvent() {
  const now = Date.now();

  // 만료된 이벤트 정리
  _cleanExpiredEvents(now);

  // 동시 활성 최대 2개 제한
  if (worldState.activeEvents.length >= 2) return [];

  const triggered = [];

  for (const evt of SURPRISE_EVENTS) {
    // 이미 같은 종류가 활성 중이면 스킵
    if (worldState.activeEvents.some(ae => ae.id === evt.id)) continue;

    if (Math.random() < evt.chance) {
      const activeEvent = {
        id: evt.id,
        name: evt.name,
        effect: { ...evt.effect },
        desc: evt.desc,
        duration: evt.duration,
        startedAt: now,
        endsAt: now + evt.duration * 1000,
        participants: new Set(),
      };
      worldState.activeEvents.push(activeEvent);
      triggered.push(activeEvent);

      // 히스토리 기록
      worldState.eventHistory.push({
        id: evt.id,
        name: evt.name,
        startedAt: now,
        endsAt: activeEvent.endsAt,
      });
      if (worldState.eventHistory.length > 20) worldState.eventHistory.shift();

      // 최대 2개 도달 시 중단
      if (worldState.activeEvents.length >= 2) break;
    }
  }

  worldState.lastSurpriseCheck = now;
  return triggered;
}

/**
 * 만료된 돌발 이벤트 제거
 */
function _cleanExpiredEvents(now) {
  now = now || Date.now();
  worldState.activeEvents = worldState.activeEvents.filter(e => e.endsAt > now);
}

/**
 * 플레이어가 활성 돌발 이벤트에 참여한다.
 * @param {Object} player — 플레이어 객체 (gold, exp, diamonds 등)
 * @param {string} eventId — 참여할 이벤트 ID
 * @returns {Object} { ok, msg, rewards }
 */
function participateSurpriseEvent(player, eventId) {
  const now = Date.now();
  _cleanExpiredEvents(now);

  const evt = worldState.activeEvents.find(e => e.id === eventId);
  if (!evt) return { ok: false, reason: '해당 이벤트가 활성 상태가 아닙니다.' };

  // 이미 참여 중인지 확인
  const pid = player.odId || player.odid || player.id || 'unknown';
  if (evt.participants.has(pid)) {
    return { ok: false, reason: '이미 이 이벤트에 참여했습니다.' };
  }

  evt.participants.add(pid);

  // 보상 지급
  const rewardTemplate = EVENT_PARTICIPATION_REWARDS[eventId] || { gold: 200 };
  const rewards = { ...rewardTemplate };

  if (rewards.gold) {
    player.gold = (player.gold || 0) + rewards.gold;
  }
  if (rewards.exp) {
    player.exp = (player.exp || 0) + rewards.exp;
  }
  if (rewards.diamonds) {
    player.diamonds = (player.diamonds || 0) + rewards.diamonds;
  }

  // 참여 기록
  if (!player.worldEventParticipation) player.worldEventParticipation = [];
  player.worldEventParticipation.push({ eventId, at: now });
  // 최근 50건만 유지
  if (player.worldEventParticipation.length > 50) {
    player.worldEventParticipation = player.worldEventParticipation.slice(-50);
  }

  return {
    ok: true,
    msg: `${evt.name} 참여 완료! 보상 지급됨`,
    rewards,
    event: _serializeEvent(evt),
  };
}

// ============================================
// 서버 도전 과제
// ============================================

/**
 * 서버 도전 과제에 진행도를 추가한다.
 * @param {string} trackKey — 'serverKills', 'serverTrades', 등
 * @param {number} amount — 추가량 (기본 1)
 */
function addWorldChallengeProgress(trackKey, amount) {
  amount = amount || 1;
  _ensureCurrentWeek();

  if (worldState.challengeProgress.hasOwnProperty(trackKey)) {
    worldState.challengeProgress[trackKey] += amount;
  }
}

/**
 * 모든 서버 도전 과제의 현재 상태를 반환한다.
 */
function getWorldChallengeStatus() {
  _ensureCurrentWeek();

  return WORLD_CHALLENGES.map(ch => {
    const current = worldState.challengeProgress[ch.track] || 0;
    const completed = current >= ch.goal;
    return {
      id: ch.id,
      name: ch.name,
      desc: ch.desc,
      goal: ch.goal,
      current: Math.min(current, ch.goal),
      completed,
      reward: ch.reward,
      percent: Math.min(100, Math.round((current / ch.goal) * 100)),
    };
  });
}

/**
 * 완료된 서버 도전 과제 보상을 청구한다.
 * @param {Object} player — 플레이어 객체
 * @returns {Object} { ok, msg, claimed }
 */
function claimWorldChallengeReward(player) {
  _ensureCurrentWeek();

  const pid = player.odId || player.odid || player.id || 'unknown';
  if (!player.worldChallengeClaimed) player.worldChallengeClaimed = {};

  const claimed = [];

  for (const ch of WORLD_CHALLENGES) {
    const current = worldState.challengeProgress[ch.track] || 0;
    const completed = current >= ch.goal;
    const alreadyClaimed = player.worldChallengeClaimed[ch.id] === worldState.challengeWeekStart;

    if (completed && !alreadyClaimed) {
      // 보상 지급
      if (ch.reward.allGold) {
        player.gold = (player.gold || 0) + ch.reward.allGold;
      }
      if (ch.reward.allDiamonds) {
        player.diamonds = (player.diamonds || 0) + ch.reward.allDiamonds;
      }
      player.worldChallengeClaimed[ch.id] = worldState.challengeWeekStart;
      claimed.push({
        id: ch.id,
        name: ch.name,
        reward: ch.reward,
      });
    }
  }

  if (claimed.length === 0) {
    return { ok: false, reason: '청구 가능한 도전 과제 보상이 없습니다.' };
  }

  return {
    ok: true,
    msg: `${claimed.length}개 서버 도전 과제 보상 청구 완료!`,
    claimed,
    gold: player.gold,
    diamonds: player.diamonds,
  };
}

/**
 * 주 단위 리셋 체크. 월요일 00:00 UTC 기준.
 */
function _ensureCurrentWeek() {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  // epoch 기준 주 시작 (1970-01-05 = 첫 월요일)
  const epochMonday = 4 * 24 * 60 * 60 * 1000; // Thu Jan 1 -> Mon Jan 5
  const currentWeekStart = Math.floor((now - epochMonday) / weekMs) * weekMs + epochMonday;

  if (worldState.challengeWeekStart !== currentWeekStart) {
    // 새 주 시작 — 리셋
    worldState.challengeWeekStart = currentWeekStart;
    worldState.challengeProgress = {
      serverKills: 0,
      serverTrades: 0,
      serverPvpBattles: 0,
      serverTowerClears: 0,
    };
    worldState.challengeCompleted = {};
  }
}

// ============================================
// 월드 상태 조회
// ============================================

/**
 * 전체 월드 상태를 반환한다.
 */
function getWorldState() {
  _cleanExpiredEvents();

  return {
    buff: getCurrentWorldBuff(),
    activeEvents: worldState.activeEvents.map(_serializeEvent),
    challenges: getWorldChallengeStatus(),
    eventHistory: worldState.eventHistory.slice(-10),
  };
}

/**
 * 이벤트 객체를 직렬화 (Set 제거)
 */
function _serializeEvent(evt) {
  return {
    id: evt.id,
    name: evt.name,
    effect: evt.effect,
    desc: evt.desc,
    duration: evt.duration,
    startedAt: evt.startedAt,
    endsAt: evt.endsAt,
    remainingSec: Math.max(0, Math.floor((evt.endsAt - Date.now()) / 1000)),
    participantCount: evt.participants ? evt.participants.size : 0,
  };
}

// ============================================
// 월드 틱 (30초마다 호출)
// ============================================

/**
 * worldTick — 30초마다 호출. 버프 로테이션, 돌발 이벤트 체크, 상태 브로드캐스트.
 * @param {Object} io — Socket.io 서버 인스턴스
 */
function worldTick(io) {
  const now = Date.now();

  // 1) 현재 월드 버프 갱신
  const buff = getCurrentWorldBuff();
  const prevBuffId = worldState.currentBuff ? worldState.currentBuff.id : null;
  worldState.currentBuff = buff;

  // 버프 변경 시 알림
  if (prevBuffId && prevBuffId !== buff.id) {
    if (io) {
      io.emit('server_msg', `🌍 월드 버프 변경! → ${buff.name}: ${buff.desc}`);
    }
  }

  // 2) 돌발 이벤트 체크 (30분 간격)
  const thirtyMinMs = 30 * 60 * 1000;
  if (now - worldState.lastSurpriseCheck >= thirtyMinMs) {
    const triggered = checkSurpriseEvent();
    if (io && triggered.length > 0) {
      for (const evt of triggered) {
        io.emit('server_msg', `🚨 돌발 이벤트! ${evt.name} — ${evt.desc}`);
        io.emit('world_surprise_event', _serializeEvent(evt));
      }
    }
  }

  // 3) 만료된 이벤트 정리
  const beforeCount = worldState.activeEvents.length;
  _cleanExpiredEvents(now);
  if (beforeCount > worldState.activeEvents.length && io) {
    io.emit('server_msg', '🌍 돌발 이벤트가 종료되었습니다.');
  }

  // 4) 도전 과제 완료 체크
  _ensureCurrentWeek();
  for (const ch of WORLD_CHALLENGES) {
    const current = worldState.challengeProgress[ch.track] || 0;
    if (current >= ch.goal && !worldState.challengeCompleted[ch.id]) {
      worldState.challengeCompleted[ch.id] = true;
      if (io) {
        io.emit('server_msg', `🎯 서버 도전 과제 달성! "${ch.name}" — 보상을 청구하세요!`);
        io.emit('world_challenge_completed', { id: ch.id, name: ch.name, reward: ch.reward });
      }
    }
  }

  // 5) 전체 상태 브로드캐스트
  if (io) {
    io.emit('world_state_update', getWorldState());
  }
}

// ============================================
// 소켓 이벤트 등록
// ============================================

function register(io, socket, player) {
  // 월드 상태 요청
  socket.on('world_state', () => {
    socket.emit('world_state', getWorldState());
  });

  // 돌발 이벤트 참여
  socket.on('world_participate', (data) => {
    const eventId = data && data.eventId;
    if (!eventId) return socket.emit('world_participate', { ok: false, reason: '이벤트 ID가 필요합니다.' });
    const result = participateSurpriseEvent(player, eventId);
    socket.emit('world_participate', result);
    if (result.ok) {
      const displayName = player.displayName || player.name || '???';
      io.emit('server_msg', `🌍 ${displayName}님이 ${result.event.name}에 참여! (참여자: ${result.event.participantCount}명)`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 서버 도전 과제 현황 조회
  socket.on('world_challenge_status', () => {
    socket.emit('world_challenge_status', {
      ok: true,
      challenges: getWorldChallengeStatus(),
      weekStart: worldState.challengeWeekStart,
    });
  });

  // 서버 도전 과제 보상 청구
  socket.on('world_challenge_claim', () => {
    const result = claimWorldChallengeReward(player);
    socket.emit('world_challenge_claim', result);
    if (result.ok) {
      const displayName = player.displayName || player.name || '???';
      io.emit('server_msg', `🎯 ${displayName}님이 서버 도전 과제 보상을 청구했습니다!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });
}

// ============================================
// 모듈 내보내기
// ============================================

module.exports = {
  WORLD_BUFFS,
  SURPRISE_EVENTS,
  WORLD_CHALLENGES,
  getWorldState,
  getCurrentWorldBuff,
  checkSurpriseEvent,
  participateSurpriseEvent,
  addWorldChallengeProgress,
  getWorldChallengeStatus,
  claimWorldChallengeReward,
  worldTick,
  register,
};
