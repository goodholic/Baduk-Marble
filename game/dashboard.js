// 통합 대시보드 — v1.75 (50 모듈 마일스톤)
// 50개 모듈의 플레이어 진행도를 한 곳에 모음
// 단일 API로 전체 게임 상태 조회

// 카테고리별 모듈 매핑
const DASHBOARD_CATEGORIES = {
  character: {
    name: '캐릭터',
    icon: '👤',
    modules: ['level', 'class', 'stats', 'titles'],
  },
  combat: {
    name: '전투',
    icon: '⚔️',
    modules: ['skill_tree', 'training', 'pvp_tournament', 'guild_war'],
  },
  collection: {
    name: '컬렉션',
    icon: '📚',
    modules: ['codex', 'library', 'title_collection', 'transmog'],
  },
  progression: {
    name: '진행',
    icon: '⬆️',
    modules: ['season_pass', 'quests', 'expeditions', 'jobs', 'wisdom'],
  },
  social: {
    name: '사회',
    icon: '🤝',
    modules: ['companion', 'mail', 'guild', 'territory', 'blessing'],
  },
  economy: {
    name: '경제',
    icon: '💰',
    modules: ['gold', 'diamonds', 'inventory', 'jackpot', 'auction'],
  },
  pets: {
    name: '펫/탈것',
    icon: '🐾',
    modules: ['pets', 'mounts', 'pet_battle', 'breeding'],
  },
  activities: {
    name: '활동',
    icon: '🎯',
    modules: ['fishing', 'farm', 'treasure_map', 'contracts', 'inn'],
  },
};

// 플레이어 상태에서 카테고리별 요약 데이터 추출
function buildDashboard(player) {
  const dashboard = {
    timestamp: Date.now(),
    player: {
      name: player.displayName,
      level: player.level || 1,
      class: player.className || 'Unknown',
      hp: `${player.hp || 0}/${player.maxHp || 0}`,
      gold: player.gold || 0,
      diamonds: player.diamonds || 0,
    },
    categories: {},
    summary: {},
  };

  // 캐릭터
  dashboard.categories.character = {
    name: '캐릭터',
    icon: '👤',
    data: {
      level: player.level || 1,
      exp: player.exp || 0,
      class: player.className || '미선택',
      titles: player.titles?.length || 0,
      activeTitle: player.activeTitle || null,
    },
  };

  // 전투
  dashboard.categories.combat = {
    name: '전투',
    icon: '⚔️',
    data: {
      pvpWins: player.pvpWins || 0,
      pvpLosses: player.pvpLosses || 0,
      monsterKills: player.totalKills || 0,
      bossKills: player.bossKills || 0,
      worldBossKills: player.worldBossKills || 0,
      bossRushBest: player.bossRushBestWave || 0,
      petBattleWins: player.petBattleWins || 0,
      arenaWins: player.arenaWins || 0,
      talentPoints: player.talents?.points || 0,
      talentSpent: player.talents?.totalSpent || 0,
    },
  };

  // 컬렉션
  dashboard.categories.collection = {
    name: '컬렉션',
    icon: '📚',
    data: {
      codexMonsters: player.codex?.monster?.entries?.length || 0,
      codexZones: player.codex?.zone?.entries?.length || 0,
      codexFish: player.codex?.fish?.entries?.length || 0,
      booksRead: player.library?.read?.length || 0,
      titlesOwned: player.titles?.length || 0,
      transmogUnlocked: player.transmog?.unlocked?.length || 0,
      relicsOwned: player.relics ? Object.keys(player.relics.owned || {}).length : 0,
    },
  };

  // 진행
  dashboard.categories.progression = {
    name: '진행',
    icon: '⬆️',
    data: {
      seasonXp: player.seasonXp || 0,
      seasonTier: player.seasonTierAchieved || 0,
      hasSeasonPass: !!player.hasSeasonPass,
      questsCompleted: player.questCompleted ? Object.keys(player.questCompleted).length : 0,
      jobLevels: player.jobs ? Object.fromEntries(Object.entries(player.jobs).map(([k, v]) => [k, v.level])) : {},
      wisdomLevels: player.wisdom ? Object.fromEntries(Object.entries(player.wisdom).map(([k, v]) => [k, v.level])) : {},
    },
  };

  // 사회
  dashboard.categories.social = {
    name: '사회',
    icon: '🤝',
    data: {
      activeCompanion: player.companions?.active || null,
      companionAffection: player.companions?.affection || {},
      unreadMail: player.mailUnread || 0,
      guildName: player.clanName || null,
      blessingDeity: player.blessing?.deity || null,
      blessingFaith: player.blessing?.faith || 0,
    },
  };

  // 경제
  dashboard.categories.economy = {
    name: '경제',
    icon: '💰',
    data: {
      gold: player.gold || 0,
      diamonds: player.diamonds || 0,
      inventoryItems: player.inventory ? Object.keys(player.inventory).length : 0,
      tradeProfit: player.totalTradeProfit || 0,
      jackpotTickets: player.jackpotTickets || 0,
    },
  };

  // 펫
  dashboard.categories.pets = {
    name: '펫',
    icon: '🐾',
    data: {
      petsOwned: player.pets?.length || 0,
      activePet: player.activePet || null,
      mountsOwned: player.mounts?.length || 0,
      activeMount: player.activeMount || null,
      petBattleWins: player.petBattleWins || 0,
      bredOffspring: player.bredOffspring?.length || 0,
    },
  };

  // 활동
  dashboard.categories.activities = {
    name: '활동',
    icon: '🎯',
    data: {
      fishCaught: player.fishCount || 0,
      treasureFound: player.treasureFound || 0,
      farmSlots: player.farm?.slotCount || 0,
      activeContracts: player.contracts?.active?.length || 0,
      contractsCompleted: player.contracts?.completed || 0,
      restedHours: player.inn?.restedHours || 0,
    },
  };

  // 요약
  dashboard.summary = {
    totalLevel: dashboard.categories.character.data.level,
    totalCollections: dashboard.categories.collection.data.titlesOwned +
                      dashboard.categories.collection.data.codexMonsters +
                      dashboard.categories.collection.data.booksRead,
    totalKills: dashboard.categories.combat.data.monsterKills +
                dashboard.categories.combat.data.pvpWins,
    netWorth: dashboard.categories.economy.data.gold +
              dashboard.categories.economy.data.diamonds * 100,
    completionScore: _calculateCompletionScore(dashboard),
  };

  return dashboard;
}

function _calculateCompletionScore(dashboard) {
  // 전체 진행도 점수 (0~100%)
  let score = 0;
  let maxScore = 0;

  // 레벨 (max 99)
  score += Math.min(dashboard.categories.character.data.level, 99);
  maxScore += 99;

  // 칭호 (max 17)
  score += Math.min(dashboard.categories.collection.data.titlesOwned, 17);
  maxScore += 17;

  // 도감 (max 100 + 51 + 11 = 162)
  score += Math.min(
    dashboard.categories.collection.data.codexMonsters +
    dashboard.categories.collection.data.codexZones +
    dashboard.categories.collection.data.codexFish,
    162
  );
  maxScore += 162;

  // 시즌 패스 (max 15)
  score += Math.min(dashboard.categories.progression.data.seasonTier, 15);
  maxScore += 15;

  // 보스 러시 (max 20)
  score += Math.min(dashboard.categories.combat.data.bossRushBest, 20);
  maxScore += 20;

  return Math.floor((score / maxScore) * 100);
}

function getCompactSummary(player) {
  const d = buildDashboard(player);
  return {
    level: d.categories.character.data.level,
    completion: d.summary.completionScore + '%',
    kills: d.summary.totalKills,
    gold: d.categories.economy.data.gold,
    titles: d.categories.collection.data.titlesOwned,
  };
}

module.exports = {
  DASHBOARD_CATEGORIES,
  buildDashboard,
  getCompactSummary,
};
