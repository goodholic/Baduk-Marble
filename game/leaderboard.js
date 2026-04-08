// 종합 랭킹 시스템 — v1.50 (50번째 패치 마일스톤)
// v1.9~v1.49의 모든 시스템에서 추출한 10개 카테고리
// 주간 리셋 + 보상 분배
// TOP 100 유지

const LEADERBOARD_CATEGORIES = {
  level: {
    name: '레벨', icon: '⭐', extractor: 'level',
    desc: '캐릭터 레벨',
  },
  gold: {
    name: '부자', icon: '💰', extractor: 'gold',
    desc: '보유 골드',
  },
  pvp_wins: {
    name: 'PvP', icon: '⚔️', extractor: 'pvpWins',
    desc: 'PvP 승리 횟수',
  },
  monster_kills: {
    name: '사냥꾼', icon: '🐲', extractor: 'totalKills',
    desc: '몬스터 처치 수',
  },
  worldboss_kills: {
    name: '월드 보스', icon: '👑', extractor: 'worldBossKills',
    desc: '월드 보스 처치',
  },
  // v1.20+ 신규 모듈에서 추출
  season_xp: {
    name: '시즌 패스', icon: '🎫', extractor: 'seasonXp',
    desc: '시즌 패스 XP',
  },
  boss_rush: {
    name: '보스 러시', icon: '💀', extractor: 'bossRushBestWave',
    desc: '보스 러시 최고 웨이브',
  },
  treasures: {
    name: '보물 사냥꾼', icon: '📜', extractor: 'treasureFound',
    desc: '발견한 보물 수',
  },
  fish_count: {
    name: '낚시왕', icon: '🐟', extractor: 'fishCount',
    desc: '낚은 어종 수',
  },
  pet_battles: {
    name: '펫 챔피언', icon: '🐾', extractor: 'petBattleWins',
    desc: '펫 배틀 승리',
  },
};

// 주간 보상 (TOP 3)
const WEEKLY_REWARDS = {
  1: { gold: 10000, diamonds: 200, title: 'rank_champion' },
  2: { gold: 5000,  diamonds: 100 },
  3: { gold: 3000,  diamonds: 50 },
};

const LEADERBOARD_CONFIG = {
  topN: 100,
  rewardTopN: 3,
  resetIntervalMs: 7 * 24 * 3600 * 1000, // 7일
};

// 메모리 스냅샷 (실시간 계산이 비싸지 않도록 캐시)
let snapshot = null;
let snapshotAt = 0;
const SNAPSHOT_TTL_MS = 60 * 1000; // 1분 캐시

function _extract(player, key) {
  // 중첩 키 지원 (예: 'pvp.wins')
  if (key.includes('.')) {
    return key.split('.').reduce((obj, k) => obj && obj[k], player) || 0;
  }
  return player[key] || 0;
}

// players 객체 (서버에서 주입) → 카테고리별 TOP N 계산
function buildSnapshot(players) {
  const result = {};
  const realPlayers = Object.values(players).filter(p => p && !p.isBot && p.displayName);

  for (const [catId, cat] of Object.entries(LEADERBOARD_CATEGORIES)) {
    const ranked = realPlayers
      .map(p => ({
        id: p.id,
        name: p.displayName,
        value: _extract(p, cat.extractor),
        level: p.level || 1,
      }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, LEADERBOARD_CONFIG.topN);
    result[catId] = ranked;
  }
  snapshot = result;
  snapshotAt = Date.now();
  return result;
}

function getLeaderboard(players, categoryId = null) {
  // 캐시 만료 시 재빌드
  if (!snapshot || (Date.now() - snapshotAt) > SNAPSHOT_TTL_MS) {
    buildSnapshot(players);
  }
  if (categoryId) {
    return {
      category: LEADERBOARD_CATEGORIES[categoryId],
      rankings: snapshot[categoryId] || [],
    };
  }
  // 모든 카테고리 (각 TOP 10만)
  const compact = {};
  for (const [catId, list] of Object.entries(snapshot)) {
    compact[catId] = {
      ...LEADERBOARD_CATEGORIES[catId],
      top10: list.slice(0, 10),
    };
  }
  return compact;
}

function getMyRank(players, playerId, categoryId) {
  if (!snapshot || (Date.now() - snapshotAt) > SNAPSHOT_TTL_MS) {
    buildSnapshot(players);
  }
  const list = snapshot[categoryId] || [];
  const idx = list.findIndex(e => e.id === playerId);
  return idx >= 0 ? { rank: idx + 1, value: list[idx].value, total: list.length } : null;
}

// 주간 리셋 → TOP 3에게 보상 지급 (server.js에서 호출)
function distributeWeeklyRewards(players) {
  const rewards = [];
  buildSnapshot(players);
  for (const [catId, list] of Object.entries(snapshot)) {
    for (let i = 0; i < Math.min(LEADERBOARD_CONFIG.rewardTopN, list.length); i++) {
      const rank = i + 1;
      const reward = WEEKLY_REWARDS[rank];
      if (!reward) continue;
      rewards.push({
        playerId: list[i].id,
        playerName: list[i].name,
        category: LEADERBOARD_CATEGORIES[catId].name,
        rank,
        reward,
      });
    }
  }
  // 스냅샷 무효화 → 다음 호출 시 재계산
  snapshot = null;
  return rewards;
}

function invalidateSnapshot() {
  snapshot = null;
}

module.exports = {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_CONFIG,
  WEEKLY_REWARDS,
  buildSnapshot,
  getLeaderboard,
  getMyRank,
  distributeWeeklyRewards,
  invalidateSnapshot,
};
