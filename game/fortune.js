// 일일 운세 시스템 — v1.57
// 점쟁이 NPC에서 매일 1회 무료 운세 → 24시간 버프
// 연속 출석 보너스 (스트릭) + 다이아로 즉시 재추첨

const FORTUNE_TYPES = {
  excellent: {
    name: '대길', icon: '🌟', weight: 5, color: '#ffd700',
    desc: '하루 종일 모든 것이 잘 풀린다',
    buffs: { goldBonus: 0.30, expBonus: 0.30, dropRate: 0.20, critRate: 0.05 },
    msg: '오늘은 별의 가호가 함께합니다!',
  },
  great: {
    name: '길', icon: '✨', weight: 15, color: '#ff8800',
    desc: '대체로 좋은 하루',
    buffs: { goldBonus: 0.20, expBonus: 0.15 },
    msg: '운세가 좋습니다. 좋은 일이 있을 거예요.',
  },
  fortune: {
    name: '재물운', icon: '💰', weight: 15, color: '#ffaa00',
    desc: '돈 벌기 좋은 날',
    buffs: { goldBonus: 0.40 },
    msg: '오늘은 재물운이 가득합니다.',
  },
  battle: {
    name: '전투운', icon: '⚔️', weight: 15, color: '#ff4444',
    desc: '전투에서 빛나는 날',
    buffs: { atk: 20, critRate: 0.08 },
    msg: '오늘은 전사의 별이 빛납니다.',
  },
  growth: {
    name: '성장운', icon: '📚', weight: 15, color: '#44aaff',
    desc: '경험치가 가속되는 날',
    buffs: { expBonus: 0.40 },
    msg: '깨달음의 기운이 흐릅니다.',
  },
  defense: {
    name: '안전운', icon: '🛡️', weight: 15, color: '#88dddd',
    desc: '위험을 피해가는 날',
    buffs: { def: 25, dodgeRate: 0.05 },
    msg: '오늘은 신중한 발걸음이 필요합니다.',
  },
  social: {
    name: '인연운', icon: '💝', weight: 10, color: '#ff88dd',
    desc: '좋은 만남이 기다린다',
    buffs: { tradeBonus: 0.15, marketFee: -0.02 },
    msg: '좋은 인연이 다가오고 있습니다.',
  },
  caution: {
    name: '주의', icon: '⚠️', weight: 10, color: '#888888',
    desc: '오늘은 조심하세요',
    buffs: { dmgReduce: 0.10 }, // 대신 피해 감소
    msg: '어두운 그림자가 보입니다. 신중히 행동하세요.',
  },
};

const STREAK_BONUSES = {
  3:  { gold: 500, multi: 1.05 }, // 3일 연속 → +5% 효과
  7:  { gold: 2000, multi: 1.10 },
  14: { gold: 5000, multi: 1.20 },
  30: { gold: 15000, multi: 1.30, diamonds: 100 },
};

const FORTUNE_CONFIG = {
  rerollPriceDiamond: 20,
  duration: 24 * 3600 * 1000, // 24시간
};

const TOTAL_WEIGHT = Object.values(FORTUNE_TYPES).reduce((s, f) => s + f.weight, 0);

function _rollFortune() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const [id, fortune] of Object.entries(FORTUNE_TYPES)) {
    roll -= fortune.weight;
    if (roll <= 0) return { id, ...fortune };
  }
  return { id: 'great', ...FORTUNE_TYPES.great };
}

function _ensure(player) {
  if (!player.fortune) player.fortune = { lastDate: null, currentId: null, streak: 0, totalReadings: 0 };
  return player.fortune;
}

function canRead(player) {
  const f = _ensure(player);
  const today = new Date().toISOString().slice(0, 10);
  return f.lastDate !== today;
}

function getStreakMultiplier(streak) {
  let multi = 1.0;
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (streak >= Number(days)) multi = bonus.multi;
  }
  return multi;
}

function readFortune(player) {
  const f = _ensure(player);
  const today = new Date().toISOString().slice(0, 10);
  if (f.lastDate === today) {
    return { success: false, msg: '오늘은 이미 운세를 봤어요' };
  }

  // 어제 봤다면 스트릭 +1, 아니면 리셋
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (f.lastDate === yesterdayStr) {
    f.streak++;
  } else {
    f.streak = 1;
  }

  f.lastDate = today;
  f.totalReadings++;
  const fortune = _rollFortune();
  f.currentId = fortune.id;

  // 스트릭 보상
  const streakReward = STREAK_BONUSES[f.streak] || null;
  if (streakReward) {
    if (streakReward.gold) player.gold = Math.min(999999999, (player.gold || 0) + streakReward.gold);
    if (streakReward.diamonds) player.diamonds = Math.min(999999999, (player.diamonds || 0) + streakReward.diamonds);
  }

  // 스트릭 효과 배수 적용
  const multi = getStreakMultiplier(f.streak);
  const scaledBuffs = {};
  for (const [stat, value] of Object.entries(fortune.buffs)) {
    scaledBuffs[stat] = +(value * multi).toFixed(3);
  }

  return {
    success: true,
    fortune: { ...fortune, scaledBuffs },
    streak: f.streak,
    streakReward,
    multi,
  };
}

function rerollFortune(player) {
  const f = _ensure(player);
  if (!f.currentId) return { success: false, msg: '아직 운세를 안 봤어요' };
  const cost = FORTUNE_CONFIG.rerollPriceDiamond;
  if ((player.diamonds || 0) < cost) return { success: false, msg: '다이아 부족' };
  player.diamonds -= cost;
  const fortune = _rollFortune();
  f.currentId = fortune.id;
  const multi = getStreakMultiplier(f.streak);
  const scaledBuffs = {};
  for (const [stat, value] of Object.entries(fortune.buffs)) {
    scaledBuffs[stat] = +(value * multi).toFixed(3);
  }
  return { success: true, fortune: { ...fortune, scaledBuffs } };
}

function getCurrentFortuneBonus(player, stat) {
  const f = _ensure(player);
  if (!f.currentId) return 0;
  // 24시간 만료 체크
  const today = new Date().toISOString().slice(0, 10);
  if (f.lastDate !== today) return 0;
  const fortune = FORTUNE_TYPES[f.currentId];
  if (!fortune) return 0;
  const value = fortune.buffs[stat];
  if (typeof value !== 'number') return 0;
  return value * getStreakMultiplier(f.streak);
}

function getStatus(player) {
  const f = _ensure(player);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = f.lastDate === today;
  const fortune = isToday && f.currentId ? FORTUNE_TYPES[f.currentId] : null;
  return {
    canRead: canRead(player),
    currentFortune: fortune ? { id: f.currentId, ...fortune } : null,
    streak: f.streak,
    streakMulti: getStreakMultiplier(f.streak),
    totalReadings: f.totalReadings,
    rerollPrice: FORTUNE_CONFIG.rerollPriceDiamond,
    fortuneTypes: FORTUNE_TYPES,
    streakBonuses: STREAK_BONUSES,
  };
}

module.exports = {
  FORTUNE_TYPES,
  STREAK_BONUSES,
  FORTUNE_CONFIG,
  canRead,
  readFortune,
  rerollFortune,
  getCurrentFortuneBonus,
  getStatus,
};
