// 신의 축복 시스템 — v1.69
// 6대 신 중 하나를 후원신으로 선택 → 영구 패시브 + 매일 기도로 랜덤 일시 축복
// 신앙 포인트 누적으로 더 강력한 축복 해금

const DEITIES = {
  ares: {
    name: '아레스',
    title: '전쟁의 신',
    icon: '⚔️',
    color: '#ff4444',
    domain: 'war',
    passive: { atk: 15, critRate: 0.03 },
    description: '용맹한 전사들의 수호신',
  },
  athena: {
    name: '아테나',
    title: '지혜의 여신',
    icon: '🦉',
    color: '#88ddff',
    domain: 'wisdom',
    passive: { expBonus: 0.10, def: 8 },
    description: '지혜와 전략의 여신',
  },
  hermes: {
    name: '헤르메스',
    title: '여행의 신',
    icon: '👟',
    color: '#88ff88',
    domain: 'travel',
    passive: { speed: 2, goldBonus: 0.10 },
    description: '여행자와 상인의 수호신',
  },
  artemis: {
    name: '아르테미스',
    title: '사냥의 여신',
    icon: '🏹',
    color: '#aa88ff',
    domain: 'hunt',
    passive: { dropRate: 0.10, dodgeRate: 0.04 },
    description: '사냥꾼과 야생의 여신',
  },
  hephaestus: {
    name: '헤파이스토스',
    title: '대장장이의 신',
    icon: '🔨',
    color: '#ff8800',
    domain: 'craft',
    passive: { craftSuccess: 0.10, defMulti: 0.05 },
    description: '장인과 대장장이의 수호신',
  },
  apollo: {
    name: '아폴로',
    title: '빛의 신',
    icon: '☀️',
    color: '#ffd700',
    domain: 'light',
    passive: { hp: 100, hpRegen: 0.20 },
    description: '치유와 빛의 신',
  },
};

// 일일 기도로 받는 랜덤 축복
const DAILY_BLESSINGS = [
  { id:'minor_atk', name:'전투의 가호', stat:'atk', value:20, duration:3600 },
  { id:'minor_def', name:'수호의 가호', stat:'def', value:20, duration:3600 },
  { id:'minor_speed', name:'바람의 가호', stat:'speed', value:3, duration:3600 },
  { id:'minor_gold', name:'풍요의 가호', stat:'goldBonus', value:0.20, duration:3600 },
  { id:'minor_exp', name:'지혜의 가호', stat:'expBonus', value:0.20, duration:3600 },
  { id:'major_blessing', name:'위대한 축복', stat:'all', value:0.05, duration:1800 }, // 희귀
];

const BLESSING_CONFIG = {
  faithPerPrayer: 10,
  faithPerOffering: 50,
  changeDeityCostDiamond: 200,
  prayerCooldownHours: 24,
};

function _ensure(player) {
  if (!player.blessing) player.blessing = { deity: null, faith: 0, lastPrayer: 0, dailyBlessing: null };
  return player.blessing;
}

function chooseDeity(player, deityId) {
  const deity = DEITIES[deityId];
  if (!deity) return { success: false, msg: '존재하지 않는 신' };
  const b = _ensure(player);

  if (b.deity && b.deity !== deityId) {
    // 변경 비용
    const cost = BLESSING_CONFIG.changeDeityCostDiamond;
    if ((player.diamonds || 0) < cost) {
      return { success: false, msg: `신앙 변경 비용 ${cost}💎 필요` };
    }
    player.diamonds -= cost;
  }

  b.deity = deityId;
  return { success: true, deity, faith: b.faith };
}

function pray(player) {
  const b = _ensure(player);
  if (!b.deity) return { success: false, msg: '먼저 후원신을 선택하세요' };

  const now = Date.now();
  const cooldown = BLESSING_CONFIG.prayerCooldownHours * 3600 * 1000;
  if ((now - b.lastPrayer) < cooldown) {
    const remain = Math.ceil((cooldown - (now - b.lastPrayer)) / 3600000);
    return { success: false, msg: `다음 기도까지 ${remain}시간` };
  }

  // 신앙 포인트 +
  b.faith += BLESSING_CONFIG.faithPerPrayer;
  b.lastPrayer = now;

  // 랜덤 축복 (희귀 축복은 신앙 100+ 일 때만)
  let pool = DAILY_BLESSINGS.filter(bl => bl.id !== 'major_blessing');
  if (b.faith >= 100) pool = DAILY_BLESSINGS;

  const blessing = pool[Math.floor(Math.random() * pool.length)];
  b.dailyBlessing = {
    ...blessing,
    appliedAt: now,
    expiresAt: now + blessing.duration * 1000,
  };

  return {
    success: true,
    blessing,
    faith: b.faith,
    deity: DEITIES[b.deity],
  };
}

function makeOffering(player, itemId) {
  const b = _ensure(player);
  if (!b.deity) return { success: false, msg: '먼저 후원신을 선택하세요' };
  if (!player.inventory || !player.inventory[itemId]) {
    return { success: false, msg: '보유하지 않은 아이템' };
  }
  player.inventory[itemId]--;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  b.faith += BLESSING_CONFIG.faithPerOffering;
  return { success: true, faith: b.faith };
}

function getDeityBonus(player, stat) {
  const b = _ensure(player);
  if (!b.deity) return 0;
  const deity = DEITIES[b.deity];
  if (!deity) return 0;
  return deity.passive[stat] || 0;
}

function getBlessingBonus(player, stat) {
  const b = _ensure(player);
  if (!b.dailyBlessing) return 0;
  if (Date.now() > b.dailyBlessing.expiresAt) return 0;
  if (b.dailyBlessing.stat === stat) return b.dailyBlessing.value;
  if (b.dailyBlessing.stat === 'all') return b.dailyBlessing.value;
  return 0;
}

function getStatus(player) {
  const b = _ensure(player);
  return {
    deity: b.deity ? { id: b.deity, ...DEITIES[b.deity] } : null,
    faith: b.faith,
    dailyBlessing: b.dailyBlessing && Date.now() < b.dailyBlessing.expiresAt ? b.dailyBlessing : null,
    canPray: !b.lastPrayer || (Date.now() - b.lastPrayer) >= BLESSING_CONFIG.prayerCooldownHours * 3600 * 1000,
    nextPrayerIn: Math.max(0, BLESSING_CONFIG.prayerCooldownHours * 3600 * 1000 - (Date.now() - b.lastPrayer)),
    deities: DEITIES,
    config: BLESSING_CONFIG,
  };
}

module.exports = {
  DEITIES,
  DAILY_BLESSINGS,
  BLESSING_CONFIG,
  chooseDeity,
  pray,
  makeOffering,
  getDeityBonus,
  getBlessingBonus,
  getStatus,
};
