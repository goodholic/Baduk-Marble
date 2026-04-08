// 지혜(Wisdom) 시스템 — v1.62
// 전투 외 활동으로 얻는 별도 진행 — NPC 대화, 탐험, 도감, 낚시, 제작 등
// 5개 지혜 브랜치 × 각 1~30 레벨
// 비전투 플레이 스타일 보상 시스템

const WISDOM_BRANCHES = {
  scholar: {
    name: '학자의 지혜',
    icon: '📚',
    desc: 'NPC 대화, 책 읽기',
    sources: ['npc_chat', 'book_read'],
    levelBonus: { stat: 'expBonus', value: 0.005 }, // 레벨당
    maxLevel: 30,
  },
  explorer: {
    name: '탐험가의 지혜',
    icon: '🗺️',
    desc: '새 지역 발견, 보물 찾기',
    sources: ['zone_discover', 'treasure_found'],
    levelBonus: { stat: 'speed', value: 0.1 },
    maxLevel: 30,
  },
  naturalist: {
    name: '박물학자의 지혜',
    icon: '🐟',
    desc: '몬스터 도감, 어종 도감, 펫 수집',
    sources: ['codex_entry', 'fish_catch', 'pet_unlock'],
    levelBonus: { stat: 'dropRate', value: 0.005 },
    maxLevel: 30,
  },
  craftsman: {
    name: '장인의 지혜',
    icon: '🔨',
    desc: '제작, 강화, 변환',
    sources: ['craft_success', 'enchant_success', 'transmute'],
    levelBonus: { stat: 'craftSuccess', value: 0.005 },
    maxLevel: 30,
  },
  diplomat: {
    name: '외교관의 지혜',
    icon: '🤝',
    desc: '교역, 동료 호감도, 길드 활동',
    sources: ['trade_count', 'companion_affection', 'guild_action'],
    levelBonus: { stat: 'tradeBonus', value: 0.005 },
    maxLevel: 30,
  },
};

const WISDOM_CONFIG = {
  xpPerSource: {
    npc_chat:           5,
    book_read:          20,
    zone_discover:      30,
    treasure_found:     50,
    codex_entry:        15,
    fish_catch:         10,
    pet_unlock:         100,
    craft_success:      10,
    enchant_success:    20,
    transmute:          15,
    trade_count:        15,
    companion_affection: 5,
    guild_action:       20,
  },
  xpPerLevelBase: 100,
  xpScaleFactor: 1.20,
};

function getXpRequired(level) {
  return Math.floor(WISDOM_CONFIG.xpPerLevelBase * Math.pow(WISDOM_CONFIG.xpScaleFactor, level - 1));
}

function _ensure(player) {
  if (!player.wisdom) {
    player.wisdom = {};
    for (const branchId of Object.keys(WISDOM_BRANCHES)) {
      player.wisdom[branchId] = { level: 1, xp: 0 };
    }
  }
  return player.wisdom;
}

function gainWisdom(player, source, amount = null) {
  const wisdom = _ensure(player);
  // source에 매칭되는 브랜치 찾기
  const matched = [];
  for (const [branchId, branch] of Object.entries(WISDOM_BRANCHES)) {
    if (branch.sources.includes(source)) {
      matched.push(branchId);
    }
  }
  if (matched.length === 0) return null;

  const xp = amount || WISDOM_CONFIG.xpPerSource[source] || 1;
  const results = [];

  for (const branchId of matched) {
    const branch = wisdom[branchId];
    branch.xp += xp;
    let leveledUp = false;
    while (branch.level < WISDOM_BRANCHES[branchId].maxLevel && branch.xp >= getXpRequired(branch.level)) {
      branch.xp -= getXpRequired(branch.level);
      branch.level++;
      leveledUp = true;
    }
    results.push({ branchId, gained: xp, currentLevel: branch.level, leveledUp });
  }
  return results;
}

function getWisdomBonus(player, stat) {
  const wisdom = _ensure(player);
  let total = 0;
  for (const [branchId, branch] of Object.entries(WISDOM_BRANCHES)) {
    if (branch.levelBonus.stat === stat) {
      total += branch.levelBonus.value * (wisdom[branchId].level - 1);
    }
  }
  return total;
}

function getStatus(player) {
  const wisdom = _ensure(player);
  const result = {};
  let totalLevel = 0;
  for (const [branchId, branch] of Object.entries(WISDOM_BRANCHES)) {
    const playerBranch = wisdom[branchId];
    result[branchId] = {
      ...branch,
      level: playerBranch.level,
      xp: playerBranch.xp,
      xpRequired: getXpRequired(playerBranch.level),
      currentBonus: branch.levelBonus.value * (playerBranch.level - 1),
    };
    totalLevel += playerBranch.level;
  }
  return {
    branches: result,
    totalLevel,
    xpSources: WISDOM_CONFIG.xpPerSource,
  };
}

module.exports = {
  WISDOM_BRANCHES,
  WISDOM_CONFIG,
  getXpRequired,
  gainWisdom,
  getWisdomBonus,
  getStatus,
};
