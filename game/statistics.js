// 서버 통계 — v1.81
// 모든 플레이어 활동의 누적/실시간 통계
// 공개 통계 페이지 (마케팅/모니터링)

const { TITLES } = require('./buff');

const STAT_CATEGORIES = {
  combat: ['totalKills', 'pvpWins', 'bossKills', 'worldBossKills'],
  economy: ['gold', 'totalTradeProfit', 'totalCrafts'],
  collection: ['titles', 'fishCount', 'treasureFound'],
  progression: ['level', 'prestigeCount'],
  pets: ['pets', 'mounts'],
};

let snapshot = null;
let snapshotTime = 0;
const SNAPSHOT_TTL = 30 * 1000; // 30초 캐시

function _calculateSum(players, fieldOrFn) {
  let total = 0;
  let count = 0;
  for (const p of Object.values(players)) {
    if (!p || p.isBot) continue;
    let val;
    if (typeof fieldOrFn === 'function') {
      val = fieldOrFn(p);
    } else if (Array.isArray(p[fieldOrFn])) {
      val = p[fieldOrFn].length;
    } else {
      val = p[fieldOrFn] || 0;
    }
    total += val;
    count++;
  }
  return { total, count, average: count > 0 ? Math.floor(total / count) : 0 };
}

function _calculateMax(players, fieldOrFn) {
  let max = 0;
  let topPlayer = null;
  for (const p of Object.values(players)) {
    if (!p || p.isBot) continue;
    let val;
    if (typeof fieldOrFn === 'function') val = fieldOrFn(p);
    else val = p[fieldOrFn] || 0;
    if (val > max) {
      max = val;
      topPlayer = { id: p.id, name: p.displayName, value: val };
    }
  }
  return { max, topPlayer };
}

function buildStatistics(players) {
  const realPlayers = Object.values(players).filter(p => p && !p.isBot && p.displayName);
  const stats = {
    timestamp: Date.now(),
    serverInfo: {
      totalPlayers: realPlayers.length,
      onlinePlayers: realPlayers.filter(p => p.isAlive).length,
    },
    combat: {
      totalKills: _calculateSum(players, 'totalKills'),
      totalPvP: _calculateSum(players, 'pvpWins'),
      totalBossKills: _calculateSum(players, 'bossKills'),
      totalWorldBossKills: _calculateSum(players, 'worldBossKills'),
      maxKills: _calculateMax(players, 'totalKills'),
      maxPvP: _calculateMax(players, 'pvpWins'),
    },
    economy: {
      totalGold: _calculateSum(players, 'gold'),
      totalDiamonds: _calculateSum(players, 'diamonds'),
      avgGold: _calculateSum(players, 'gold').average,
      richestPlayer: _calculateMax(players, 'gold'),
    },
    collection: {
      totalTitles: _calculateSum(players, 'titles'),
      totalFishCaught: _calculateSum(players, 'fishCount'),
      totalTreasures: _calculateSum(players, 'treasureFound'),
      mostTitled: _calculateMax(players, p => (p.titles || []).length),
    },
    progression: {
      avgLevel: _calculateSum(players, 'level').average,
      maxLevel: _calculateMax(players, 'level'),
      totalPrestige: _calculateSum(players, 'prestigeCount'),
    },
    pets: {
      totalPets: _calculateSum(players, 'pets'),
      totalMounts: _calculateSum(players, 'mounts'),
      mostPets: _calculateMax(players, p => (p.pets || []).length),
    },
  };
  return stats;
}

function getStats(players) {
  if (snapshot && (Date.now() - snapshotTime) < SNAPSHOT_TTL) {
    return snapshot;
  }
  snapshot = buildStatistics(players);
  snapshotTime = Date.now();
  return snapshot;
}

function getCompactStats(players) {
  const full = getStats(players);
  return {
    online: full.serverInfo.onlinePlayers,
    total: full.serverInfo.totalPlayers,
    avgLevel: full.progression.avgLevel,
    maxLevel: full.progression.maxLevel.max,
    totalKills: full.combat.totalKills.total,
    totalGold: full.economy.totalGold.total,
    richestPlayer: full.economy.richestPlayer.topPlayer?.name,
  };
}

function invalidate() {
  snapshot = null;
}

module.exports = {
  STAT_CATEGORIES,
  buildStatistics,
  getStats,
  getCompactStats,
  invalidate,
};
