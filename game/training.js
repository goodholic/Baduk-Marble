// 일일 훈련 시스템 — v1.45
// 매일 5 스태미나 → 5종 훈련 드릴
// 1회 훈련 = 영구 보너스 +1 (최대 30) + 1시간 임시 버프
// 매일 자정 스태미나 리필

const TRAINING_DRILLS = {
  combat: {
    name: '전투 훈련',
    icon: '⚔️',
    desc: 'ATK 영구 +1, 1시간 ATK +10%',
    permStat: 'atk',
    permValue: 1,
    tempBuff: { stat: 'atk', multi: 1.10, duration: 3600 },
    maxRank: 30,
  },
  defense: {
    name: '방어 훈련',
    icon: '🛡️',
    desc: 'DEF 영구 +1, 1시간 DEF +10%',
    permStat: 'def',
    permValue: 1,
    tempBuff: { stat: 'def', multi: 1.10, duration: 3600 },
    maxRank: 30,
  },
  agility: {
    name: '민첩 훈련',
    icon: '💨',
    desc: 'SPD 영구 +1 (10랭크당), 1시간 SPD +15%',
    permStat: 'speed',
    permValue: 0.1, // 10랭크당 +1
    tempBuff: { stat: 'speed', multi: 1.15, duration: 3600 },
    maxRank: 30,
  },
  wisdom: {
    name: '지혜 훈련',
    icon: '📚',
    desc: '경험치 보너스 영구 +0.5%, 1시간 EXP +30%',
    permStat: 'expBonus',
    permValue: 0.005,
    tempBuff: { stat: 'expMulti', multi: 1.30, duration: 3600 },
    maxRank: 30,
  },
  lucky: {
    name: '행운 훈련',
    icon: '🍀',
    desc: '드롭률 영구 +0.5%, 1시간 드롭 +30%',
    permStat: 'dropRate',
    permValue: 0.005,
    tempBuff: { stat: 'dropRate', multi: 1.30, duration: 3600 },
    maxRank: 30,
  },
};

const TRAINING_CONFIG = {
  dailyStamina: 5,
  refillCostDiamond: 30, // 30💎로 5 스태미나 추가 충전
  goldRewardPerDrill: 100,
  expRewardPerDrill: 50,
};

function _ensure(player) {
  if (!player.training) player.training = { stamina: TRAINING_CONFIG.dailyStamina, ranks: {}, lastRefillDate: null };
  return player.training;
}

function refillIfNewDay(player) {
  const t = _ensure(player);
  const today = new Date().toISOString().slice(0, 10);
  if (t.lastRefillDate !== today) {
    t.stamina = TRAINING_CONFIG.dailyStamina;
    t.lastRefillDate = today;
    return true;
  }
  return false;
}

function getStatus(player) {
  const t = _ensure(player);
  refillIfNewDay(player);
  const drills = {};
  for (const [drillId, drill] of Object.entries(TRAINING_DRILLS)) {
    drills[drillId] = {
      ...drill,
      currentRank: t.ranks[drillId] || 0,
      maxedOut: (t.ranks[drillId] || 0) >= drill.maxRank,
    };
  }
  return {
    stamina: t.stamina,
    maxStamina: TRAINING_CONFIG.dailyStamina,
    refillCost: TRAINING_CONFIG.refillCostDiamond,
    drills,
  };
}

function performTraining(player, drillId) {
  const t = _ensure(player);
  refillIfNewDay(player);
  const drill = TRAINING_DRILLS[drillId];
  if (!drill) return { success: false, msg: '존재하지 않는 훈련' };
  if (t.stamina < 1) return { success: false, msg: '스태미나 부족 (자정 충전)' };
  const currentRank = t.ranks[drillId] || 0;
  if (currentRank >= drill.maxRank) return { success: false, msg: '최대 랭크 도달' };

  t.stamina--;
  t.ranks[drillId] = currentRank + 1;

  // 영구 보너스 적용 (trainingBonuses 객체에 누적)
  if (!player.trainingBonuses) player.trainingBonuses = {};
  player.trainingBonuses[drill.permStat] = (player.trainingBonuses[drill.permStat] || 0) + drill.permValue;

  // 골드/EXP 보상
  player.gold = (player.gold || 0) + TRAINING_CONFIG.goldRewardPerDrill;
  player.exp = (player.exp || 0) + TRAINING_CONFIG.expRewardPerDrill;

  return {
    success: true,
    drillId,
    newRank: currentRank + 1,
    permGain: { stat: drill.permStat, value: drill.permValue },
    tempBuff: drill.tempBuff,
    staminaLeft: t.stamina,
    reward: {
      gold: TRAINING_CONFIG.goldRewardPerDrill,
      exp: TRAINING_CONFIG.expRewardPerDrill,
    },
  };
}

function refillStamina(player) {
  const t = _ensure(player);
  if ((player.diamonds || 0) < TRAINING_CONFIG.refillCostDiamond) {
    return { success: false, msg: '다이아 부족' };
  }
  player.diamonds -= TRAINING_CONFIG.refillCostDiamond;
  t.stamina = Math.min(t.stamina + TRAINING_CONFIG.dailyStamina, TRAINING_CONFIG.maxStamina || 5);
  return { success: true, newStamina: t.stamina };
}

function getTrainingBonus(player, stat) {
  return (player.trainingBonuses && player.trainingBonuses[stat]) || 0;
}

module.exports = {
  TRAINING_DRILLS,
  TRAINING_CONFIG,
  getStatus,
  performTraining,
  refillStamina,
  getTrainingBonus,
};
