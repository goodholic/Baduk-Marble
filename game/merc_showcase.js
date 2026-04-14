// 용병 쇼케이스 & 평판 시스템 — v4.5
// 자랑할 수 있는 진열장 + 주간 투표 + 방문자 평판

const MAX_SHOWCASE = 5; // 최대 5명 진열
const VISIT_REP_DAILY = 1; // 방문 시 평판 +1/일
const REP_REWARDS = [
  { rep: 10, title: '신참 전시자', reward: { gold: 1000 } },
  { rep: 50, title: '인기 전시자', reward: { gold: 5000, diamonds: 20 } },
  { rep: 100, title: '명성의 전시자', reward: { gold: 10000, diamonds: 50 } },
  { rep: 500, title: '전설의 컬렉터', reward: { gold: 50000, diamonds: 200 } },
  { rep: 1000, title: '만인의 우상', reward: { gold: 100000, diamonds: 500 } },
];

// ═══ 날짜 유틸 ═══
function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function weekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

// ═══ 초기화 ═══
function initShowcase(player) {
  if (!player._showcase) {
    player._showcase = {
      mercs: [],        // uid 배열 (최대 5)
      visitors: {},     // { visitorId: 'YYYY-MM-DD' }
      reputation: 0,
      votes: 0,
      weeklyVotes: 0,
      weekKey: weekKey(),
      message: '',
      claimedRewards: [], // 수령한 평판 보상 인덱스
    };
  }
  return player._showcase;
}

// ═══ 쇼케이스 설정 ═══
function setShowcase(player, mercUids) {
  const sc = initShowcase(player);
  if (!Array.isArray(mercUids) || mercUids.length === 0) {
    return { ok: false, msg: '⚠️ 진열할 용병을 선택해주세요.' };
  }
  if (mercUids.length > MAX_SHOWCASE) {
    return { ok: false, msg: `⚠️ 최대 ${MAX_SHOWCASE}명까지 진열할 수 있습니다.` };
  }
  // 중복 제거
  const unique = [...new Set(mercUids)];
  // 소유권 검증
  const owned = (player.mercenaries || []);
  const invalid = unique.filter(uid => !owned.find(m => m.uid === uid));
  if (invalid.length > 0) {
    return { ok: false, msg: `⚠️ 소유하지 않은 용병이 포함되어 있습니다. (${invalid.length}명)` };
  }
  sc.mercs = unique;
  return { ok: true, msg: `✅ 쇼케이스에 ${unique.length}명의 용병을 진열했습니다!` };
}

// ═══ 메시지 설정 ═══
function setShowcaseMessage(player, message) {
  const sc = initShowcase(player);
  if (typeof message !== 'string') {
    return { ok: false, msg: '⚠️ 메시지는 문자열이어야 합니다.' };
  }
  const trimmed = message.trim().slice(0, 50);
  sc.message = trimmed;
  return { ok: true, msg: `✅ 쇼케이스 메시지 설정: "${trimmed}"` };
}

// ═══ 쇼케이스 조회 ═══
function getShowcase(player) {
  const sc = initShowcase(player);
  const owned = (player.mercenaries || []);
  const mercDetails = sc.mercs.map(uid => {
    const m = owned.find(x => x.uid === uid);
    if (!m) return null;
    return {
      uid: m.uid,
      name: m.name || '이름 없음',
      icon: m.icon || '⚔️',
      element: m.element || '무속성',
      level: m.level || 1,
      stars: m.stars || 1,
      combatPower: m.combatPower || m.power || 0,
      personality: m.personality || '보통',
      equipment: m.equipment || {},
    };
  }).filter(Boolean);

  return {
    mercs: mercDetails,
    message: sc.message,
    reputation: sc.reputation,
    votes: sc.votes,
    weeklyVotes: sc.weeklyVotes,
    playerName: player.nickname || player.name || '???',
  };
}

// ═══ 쇼케이스 방문 (평판 부여) ═══
function visitShowcase(visitor, targetPlayerId, players) {
  const target = players[targetPlayerId];
  if (!target) return { ok: false, msg: '⚠️ 해당 플레이어를 찾을 수 없습니다.' };
  if (targetPlayerId === visitor.odId) {
    return { ok: false, msg: '⚠️ 자신의 쇼케이스에는 방문 평판을 줄 수 없습니다.' };
  }
  const sc = initShowcase(target);
  const visitorId = visitor.odId || visitor.odid || 'unknown';
  const today = todayKey();

  // 하루 1회 평판 제한
  let repGiven = false;
  if (sc.visitors[visitorId] !== today) {
    sc.visitors[visitorId] = today;
    sc.reputation += VISIT_REP_DAILY;
    repGiven = true;
  }

  const showcaseData = getShowcase(target);
  return {
    ok: true,
    repGiven,
    msg: repGiven
      ? `🏛️ 쇼케이스를 방문하여 평판 +${VISIT_REP_DAILY}을 선물했습니다!`
      : '🏛️ 쇼케이스를 구경합니다. (오늘 이미 평판을 드렸습니다)',
    showcase: showcaseData,
  };
}

// ═══ 주간 투표 ═══
function voteShowcase(voter, targetPlayerId, players) {
  const target = players[targetPlayerId];
  if (!target) return { ok: false, msg: '⚠️ 해당 플레이어를 찾을 수 없습니다.' };
  if (targetPlayerId === (voter.odId || voter.odid)) {
    return { ok: false, msg: '⚠️ 자신에게 투표할 수 없습니다.' };
  }
  const sc = initShowcase(target);
  const wk = weekKey();

  // 주 갱신
  if (sc.weekKey !== wk) {
    sc.weeklyVotes = 0;
    sc.weekKey = wk;
  }

  // 투표자 주간 제한
  if (!voter._showcaseVotes) voter._showcaseVotes = {};
  const voteKey = `${targetPlayerId}_${wk}`;
  if (voter._showcaseVotes[voteKey]) {
    return { ok: false, msg: '⚠️ 이번 주에 이미 이 플레이어에게 투표했습니다.' };
  }

  voter._showcaseVotes[voteKey] = true;
  sc.votes += 1;
  sc.weeklyVotes += 1;
  sc.reputation += 2; // 투표는 평판 +2

  return { ok: true, msg: `🗳️ 투표 완료! ${target.nickname || '???'}님의 쇼케이스에 투표했습니다. (주간 ${sc.weeklyVotes}표)` };
}

// ═══ 리더보드 ═══
function getShowcaseLeaderboard(players) {
  const wk = weekKey();
  const entries = [];
  for (const pid of Object.keys(players)) {
    const p = players[pid];
    if (!p._showcase) continue;
    if (p._showcase.weekKey !== wk) continue;
    entries.push({
      playerId: pid,
      name: p.nickname || p.name || '???',
      weeklyVotes: p._showcase.weeklyVotes || 0,
      reputation: p._showcase.reputation || 0,
      mercCount: (p._showcase.mercs || []).length,
    });
  }
  entries.sort((a, b) => b.weeklyVotes - a.weeklyVotes);
  return entries.slice(0, 10);
}

// ═══ 평판 보상 확인 ═══
function checkRepRewards(player) {
  const sc = initShowcase(player);
  const rewards = [];
  for (let i = 0; i < REP_REWARDS.length; i++) {
    const r = REP_REWARDS[i];
    if (sc.reputation >= r.rep && !sc.claimedRewards.includes(i)) {
      sc.claimedRewards.push(i);
      // 보상 지급
      if (r.reward.gold) player.gold = (player.gold || 0) + r.reward.gold;
      if (r.reward.diamonds) player.diamonds = (player.diamonds || 0) + r.reward.diamonds;
      rewards.push({
        title: r.title,
        reward: r.reward,
        msg: `🎖️ 평판 ${r.rep} 달성! "${r.title}" 칭호 획득! (골드 +${r.reward.gold || 0}${r.reward.diamonds ? `, 다이아 +${r.reward.diamonds}` : ''})`,
      });
    }
  }
  return rewards;
}

// ═══ 소켓 핸들러 등록 ═══
function registerShowcaseHandlers(io, socket, player, players) {
  initShowcase(player);

  // 쇼케이스 용병 설정
  socket.on('showcase_set', (data) => {
    const result = setShowcase(player, data.mercUids || []);
    socket.emit('showcase_result', result);
  });

  // 메시지 설정
  socket.on('showcase_message', (data) => {
    const result = setShowcaseMessage(player, data.message || '');
    socket.emit('showcase_result', result);
  });

  // 다른 플레이어 쇼케이스 보기
  socket.on('showcase_view', (data) => {
    const target = players[data.targetId];
    if (!target) {
      socket.emit('showcase_view_result', { ok: false, msg: '⚠️ 플레이어를 찾을 수 없습니다.' });
      return;
    }
    const showcase = getShowcase(target);
    socket.emit('showcase_view_result', { ok: true, showcase });
  });

  // 방문 (평판 부여)
  socket.on('showcase_visit', (data) => {
    const result = visitShowcase(player, data.targetId, players);
    socket.emit('showcase_visit_result', result);
    const repRewards = checkRepRewards(players[data.targetId]);
    if (repRewards.length > 0) {
      const targetSocket = io.sockets.sockets.get(data.targetId);
      if (targetSocket) {
        targetSocket.emit('showcase_rep_rewards', { rewards: repRewards });
      }
    }
  });

  // 주간 투표
  socket.on('showcase_vote', (data) => {
    const result = voteShowcase(player, data.targetId, players);
    socket.emit('showcase_vote_result', result);
  });

  // 리더보드
  socket.on('showcase_leaderboard', () => {
    const board = getShowcaseLeaderboard(players);
    socket.emit('showcase_leaderboard_result', { ok: true, leaderboard: board });
  });

  // 내 쇼케이스 조회
  socket.on('showcase_my', () => {
    const showcase = getShowcase(player);
    const repRewards = checkRepRewards(player);
    socket.emit('showcase_my_result', {
      ok: true,
      showcase,
      repRewards: repRewards.length > 0 ? repRewards : null,
    });
  });
}

module.exports = {
  MAX_SHOWCASE,
  VISIT_REP_DAILY,
  REP_REWARDS,
  initShowcase,
  setShowcase,
  setShowcaseMessage,
  getShowcase,
  visitShowcase,
  voteShowcase,
  getShowcaseLeaderboard,
  checkRepRewards,
  registerShowcaseHandlers,
};
