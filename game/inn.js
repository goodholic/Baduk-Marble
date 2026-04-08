// 여관(Inn) 시스템 — v1.74
// 마을에서 휴식 → HP/MP 회복 + Rested Bonus (다음 사냥 시 EXP 보너스)
// 5등급 여관 (마을별 차이)

const INN_TIERS = {
  shabby: {
    name: '낡은 여관',
    icon: '🛖',
    desc: '비싸지 않지만 최소한의 휴식',
    costPerHour: 100,
    restedXpRate: 1.0,    // 시간당 1.0 시간치 rested 적립
    maxRested: 4,          // 최대 4시간치
    locations: ['frontier', 'training'],
  },
  standard: {
    name: '일반 여관',
    icon: '🏠',
    desc: '평범한 여관',
    costPerHour: 250,
    restedXpRate: 1.2,
    maxRested: 8,
    locations: ['aden', 'oasis'],
  },
  cozy: {
    name: '아늑한 여관',
    icon: '🏡',
    desc: '편안한 침대와 따뜻한 식사',
    costPerHour: 500,
    restedXpRate: 1.5,
    maxRested: 12,
    locations: ['harbor', 'mountain', 'shrine'],
  },
  luxury: {
    name: '고급 여관',
    icon: '🏛️',
    desc: '최고급 시설과 서비스',
    costPerHour: 1200,
    restedXpRate: 2.0,
    maxRested: 16,
    locations: ['port_east', 'bazaar'],
  },
  royal: {
    name: '왕실 호텔',
    icon: '👑',
    desc: '왕족도 묵을 수 있는 최상급 시설',
    costPerHour: 3000,
    restedXpRate: 3.0,
    maxRested: 24,
    locations: ['castle'],
  },
};

const INN_CONFIG = {
  restedBonusMultiplier: 1.5, // 휴식 시간 동안 EXP 1.5배
  hpRegenPerSecond: 5,
  mpRegenPerSecond: 3,
};

function _findInnAtLocation(zoneId) {
  for (const [tierId, tier] of Object.entries(INN_TIERS)) {
    if (tier.locations.includes(zoneId)) {
      return { tierId, ...tier };
    }
  }
  return null;
}

function _ensure(player) {
  if (!player.inn) player.inn = { restedHours: 0, lastCheckin: 0, currentInn: null };
  return player.inn;
}

function checkIn(player, zoneId, hours = 1) {
  const inn = _findInnAtLocation(zoneId);
  if (!inn) return { success: false, msg: '이 지역에는 여관이 없습니다' };

  const cost = inn.costPerHour * hours;
  if ((player.gold || 0) < cost) {
    return { success: false, msg: `골드 ${cost} 필요` };
  }

  const data = _ensure(player);
  player.gold -= cost;

  // Rested 적립 (시간당 restedXpRate)
  const earnedRested = hours * inn.restedXpRate;
  data.restedHours = Math.min(inn.maxRested, data.restedHours + earnedRested);
  data.lastCheckin = Date.now();
  data.currentInn = inn.tierId;

  // HP/MP 즉시 회복
  if (player.maxHp) player.hp = player.maxHp;
  if (player.maxMp) player.mp = player.maxMp;

  return {
    success: true,
    inn: inn.name,
    cost,
    hours,
    earnedRested,
    totalRested: data.restedHours,
    fullyHealed: true,
  };
}

function consumeRested(player, sessionMinutes) {
  const data = _ensure(player);
  if (data.restedHours <= 0) return 0;

  const sessionHours = sessionMinutes / 60;
  const consumed = Math.min(data.restedHours, sessionHours);
  data.restedHours -= consumed;

  // 휴식 시간 동안 EXP 보너스 적용 (외부에서)
  return consumed;
}

function getRestedBonus(player) {
  const data = _ensure(player);
  if (data.restedHours <= 0) return 0;
  return INN_CONFIG.restedBonusMultiplier - 1; // +50% EXP
}

function getStatus(player, zoneId = null) {
  const data = _ensure(player);
  const localInn = zoneId ? _findInnAtLocation(zoneId) : null;
  return {
    restedHours: data.restedHours,
    currentInn: data.currentInn,
    lastCheckin: data.lastCheckin,
    localInn,
    allInns: INN_TIERS,
    bonusMultiplier: INN_CONFIG.restedBonusMultiplier,
  };
}

module.exports = {
  INN_TIERS,
  INN_CONFIG,
  checkIn,
  consumeRested,
  getRestedBonus,
  getStatus,
};
