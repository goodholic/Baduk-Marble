// 던전 열쇠 시스템 — v1.67
// 프리미엄 던전 입장에 필요한 열쇠
// 일반 던전(무료)과 별개 — 보스 전용/한정 던전
// 주간 키 + 시즌 키 + 이벤트 키

const KEY_TYPES = {
  bronze_key: {
    name: '청동 열쇠',
    icon: '🔑',
    rarity: 'common',
    desc: '일반 프리미엄 던전 입장',
    sources: ['daily_quest_complete', 'attendance_3day'],
    weeklyMax: 7,
    dungeons: ['ruins_dungeon', 'cave_dungeon'],
  },
  silver_key: {
    name: '은 열쇠',
    icon: '🗝️',
    rarity: 'rare',
    desc: '중급 프리미엄 던전 입장',
    sources: ['weekly_quest', 'world_boss_kill'],
    weeklyMax: 4,
    dungeons: ['frozen_temple', 'holy_sanctuary'],
  },
  gold_key: {
    name: '황금 열쇠',
    icon: '🔐',
    rarity: 'epic',
    desc: '고급 프리미엄 던전 입장',
    sources: ['arena_top10', 'monthly_event'],
    weeklyMax: 2,
    dungeons: ['dragon_raid', 'shadow_labyrinth'],
  },
  void_key: {
    name: '공허의 열쇠',
    icon: '🌀',
    rarity: 'legendary',
    desc: '엔드게임 던전 입장',
    sources: ['raid_mvp', 'season_pass_tier_15'],
    weeklyMax: 1,
    dungeons: ['void_abyss'],
  },
};

const KEY_REWARDS_MULTIPLIER = {
  bronze: 1.5,    // 일반 던전 보상의 1.5배
  silver: 2.0,    // 2배
  gold: 3.0,      // 3배
  void: 5.0,      // 5배
};

function _ensure(player) {
  if (!player.dungeonKeys) player.dungeonKeys = { keys: {}, weeklyEarned: {}, lastReset: null };
  return player.dungeonKeys;
}

function _checkWeeklyReset(player) {
  const data = _ensure(player);
  const now = new Date();
  const weekKey = now.getFullYear() + '-W' + Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
  if (data.lastReset !== weekKey) {
    data.lastReset = weekKey;
    data.weeklyEarned = {};
  }
}

function grantKey(player, keyType, source = 'manual') {
  const def = KEY_TYPES[keyType];
  if (!def) return { success: false, msg: '존재하지 않는 열쇠' };

  _checkWeeklyReset(player);
  const data = _ensure(player);
  const earned = data.weeklyEarned[keyType] || 0;
  if (earned >= def.weeklyMax) {
    return { success: false, msg: `이번 주 ${def.name} 한도 (${def.weeklyMax}) 초과` };
  }

  data.keys[keyType] = (data.keys[keyType] || 0) + 1;
  data.weeklyEarned[keyType] = earned + 1;

  return { success: true, keyType, totalKeys: data.keys[keyType], source };
}

function consumeKey(player, keyType, dungeonId) {
  const def = KEY_TYPES[keyType];
  if (!def) return { success: false, msg: '존재하지 않는 열쇠' };
  if (!def.dungeons.includes(dungeonId)) {
    return { success: false, msg: '이 열쇠는 해당 던전에 사용할 수 없음' };
  }

  const data = _ensure(player);
  if ((data.keys[keyType] || 0) < 1) {
    return { success: false, msg: `${def.name} 부족` };
  }
  data.keys[keyType]--;

  return {
    success: true,
    keyType,
    rewardMultiplier: KEY_REWARDS_MULTIPLIER[keyType.replace('_key', '')] || 1.0,
    remainingKeys: data.keys[keyType],
  };
}

function getStatus(player) {
  _checkWeeklyReset(player);
  const data = _ensure(player);
  const keys = {};
  for (const [keyType, def] of Object.entries(KEY_TYPES)) {
    keys[keyType] = {
      ...def,
      owned: data.keys[keyType] || 0,
      weeklyEarned: data.weeklyEarned[keyType] || 0,
    };
  }
  return {
    keys,
    rewardMultipliers: KEY_REWARDS_MULTIPLIER,
    lastReset: data.lastReset,
  };
}

function getKeysForDungeon(dungeonId) {
  return Object.entries(KEY_TYPES)
    .filter(([_, def]) => def.dungeons.includes(dungeonId))
    .map(([keyType, def]) => ({ keyType, ...def }));
}

module.exports = {
  KEY_TYPES,
  KEY_REWARDS_MULTIPLIER,
  grantKey,
  consumeKey,
  getStatus,
  getKeysForDungeon,
};
