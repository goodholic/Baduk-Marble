// 배틀패스 시스템 — v3.0
// 50레벨, 무료+유료 트랙, 주간 미션, 시즌 3개월

const BP_COST = 500; // 💎
const MAX_LEVEL = 50;
const SEASON_DAYS = 90;

// 레벨별 보상 (무료/유료)
const REWARDS = [];
for (let lv = 1; lv <= MAX_LEVEL; lv++) {
  const expNeeded = 100 + (lv - 1) * 200;
  let free = {}, paid = {};

  if (lv % 10 === 0) {
    // 10단위: 대형 보상
    free = { gold: lv * 200, material: lv / 2 };
    paid = { diamonds: lv * 2, mercCard: lv >= 40 ? 'legendary' : 'hero' };
  } else if (lv % 5 === 0) {
    // 5단위: 중형 보상
    free = { gold: lv * 100, material: Math.floor(lv / 5) };
    paid = { diamonds: lv, awakenStone: lv >= 30 ? 1 : 0 };
  } else if (lv % 2 === 0) {
    // 짝수: 골드
    free = { gold: 500 + lv * 50 };
    paid = { gold: 1000 + lv * 100 };
  } else {
    // 홀수: 재료/소비
    free = { material: 1 + Math.floor(lv / 10) };
    paid = { material: 2 + Math.floor(lv / 5) };
  }

  // 최종 레벨 특별 보상
  if (lv === MAX_LEVEL) {
    free = { gold: 20000, mythicMaterial: 1 };
    paid = { diamonds: 200, mythicMercExchange: true, title: '시즌의 전사' };
  }

  REWARDS.push({ lv, expNeeded, free, paid });
}

function getBattlePass(player) {
  if (!player._battlePass) {
    player._battlePass = {
      level: 0, exp: 0, isPremium: false,
      claimed: [], // 수령한 레벨 목록
      seasonStart: Date.now(),
      weeklyMissions: generateWeeklyMissions(),
      weeklyReset: getNextMonday(),
    };
  }
  return player._battlePass;
}

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
}

function generateWeeklyMissions() {
  return [
    { id: 'io_10', name: 'IO 10판 완료', target: 10, progress: 0, exp: 1500 },
    { id: 'siege_3', name: '공성전 3회 참여', target: 3, progress: 0, exp: 2000 },
    { id: 'trade_10', name: '무역 10회 완료', target: 10, progress: 0, exp: 1000 },
    { id: 'merc_awaken', name: '용병 각성 1회', target: 1, progress: 0, exp: 1500 },
    { id: 'arena_5', name: '아레나 5회', target: 5, progress: 0, exp: 1200 },
  ];
}

// EXP 획득 (IO 매치, 일일퀘, 무역, 공성 등에서 호출)
function addBattlePassExp(player, amount, source) {
  const bp = getBattlePass(player);
  bp.exp += amount;

  let leveled = false;
  while (bp.level < MAX_LEVEL) {
    const needed = REWARDS[bp.level]?.expNeeded || 99999;
    if (bp.exp >= needed) {
      bp.exp -= needed;
      bp.level++;
      leveled = true;
    } else break;
  }

  return { leveled, level: bp.level, exp: bp.exp, expToNext: REWARDS[bp.level]?.expNeeded || 0 };
}

// 보상 수령
function claimReward(player, level) {
  const bp = getBattlePass(player);
  if (level > bp.level) return { success: false, msg: '아직 도달하지 않은 레벨' };
  if (bp.claimed.includes(level)) return { success: false, msg: '이미 수령' };

  const reward = REWARDS[level - 1];
  if (!reward) return { success: false, msg: '보상 없음' };

  bp.claimed.push(level);

  // 무료 보상 지급
  const given = { ...reward.free };
  if (given.gold) player.gold = (player.gold || 0) + given.gold;
  if (given.material) player.inventory = player.inventory || {};

  // 유료 보상 (프리미엄만)
  if (bp.isPremium) {
    const paidReward = reward.paid;
    if (paidReward.gold) player.gold = (player.gold || 0) + paidReward.gold;
    if (paidReward.diamonds) player.diamonds = (player.diamonds || 0) + paidReward.diamonds;
    given.paid = paidReward;
  }

  return { success: true, msg: `Lv.${level} 보상 수령!`, reward: given };
}

// 프리미엄 구매
function buyPremium(player) {
  const bp = getBattlePass(player);
  if (bp.isPremium) return { success: false, msg: '이미 프리미엄' };
  if ((player.diamonds || 0) < BP_COST) return { success: false, msg: `다이아 부족 (${BP_COST}💎)` };

  player.diamonds -= BP_COST;
  bp.isPremium = true;

  return { success: true, msg: `✨ 배틀패스 프리미엄 활성화! (${BP_COST}💎)` };
}

// 주간 미션 진행
function progressWeeklyMission(player, missionId, amount) {
  const bp = getBattlePass(player);

  // 주간 리셋 체크
  if (Date.now() > bp.weeklyReset) {
    bp.weeklyMissions = generateWeeklyMissions();
    bp.weeklyReset = getNextMonday();
  }

  const mission = bp.weeklyMissions.find(m => m.id === missionId);
  if (!mission || mission.progress >= mission.target) return null;

  mission.progress = Math.min(mission.target, mission.progress + (amount || 1));

  if (mission.progress >= mission.target) {
    // 미션 완료 → EXP 지급
    const result = addBattlePassExp(player, mission.exp, 'weekly_' + missionId);
    return { completed: true, mission: mission.name, exp: mission.exp, ...result };
  }
  return { completed: false, progress: mission.progress, target: mission.target };
}

// 상태 조회
function getBattlePassStatus(player) {
  const bp = getBattlePass(player);
  const currentReward = REWARDS[bp.level] || REWARDS[MAX_LEVEL - 1];

  return {
    level: bp.level, exp: bp.exp,
    expToNext: currentReward?.expNeeded || 0,
    maxLevel: MAX_LEVEL,
    isPremium: bp.isPremium,
    premiumCost: BP_COST,
    claimed: bp.claimed,
    rewards: REWARDS.slice(Math.max(0, bp.level - 2), bp.level + 5).map(r => ({
      lv: r.lv, free: r.free, paid: r.paid,
      claimed: bp.claimed.includes(r.lv),
      available: r.lv <= bp.level,
    })),
    weeklyMissions: bp.weeklyMissions,
    seasonDaysLeft: Math.max(0, Math.floor((bp.seasonStart + SEASON_DAYS * 86400000 - Date.now()) / 86400000)),
  };
}

function registerBattlePassHandlers(socket, playerId, players, io) {
  socket.on('bp_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('bp_status', getBattlePassStatus(p));
  });

  socket.on('bp_claim', (level) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('bp_result', claimReward(p, level));
  });

  socket.on('bp_buy_premium', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('bp_result', buyPremium(p));
  });
}

module.exports = { registerBattlePassHandlers, addBattlePassExp, progressWeeklyMission, getBattlePassStatus, REWARDS };
