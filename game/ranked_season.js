// 랭크 시즌 시스템 — v2.59
// 30일 시즌, 랭크 포인트, 시즌 보상, 명예의 전당

const SEASON_CONFIG = {
  durationDays: 30,
  ranks: [
    { id: 'bronze',   name: '브론즈',   icon: '🥉', minPts: 0,    color: '#cd7f32' },
    { id: 'silver',   name: '실버',     icon: '🥈', minPts: 500,  color: '#c0c0c0' },
    { id: 'gold',     name: '골드',     icon: '🥇', minPts: 1200, color: '#ffd700' },
    { id: 'platinum', name: '플래티넘', icon: '💎', minPts: 2000, color: '#88ddff' },
    { id: 'diamond',  name: '다이아몬드',icon: '💠', minPts: 3000, color: '#44aaff' },
    { id: 'master',   name: '마스터',   icon: '👑', minPts: 4500, color: '#ff8800' },
    { id: 'grandmaster',name:'그랜드마스터',icon:'⚡',minPts: 6000,color: '#ff00ff' },
    { id: 'legend',   name: '전설',     icon: '🌟', minPts: 8000, color: '#ffffff' },
  ],
  pointsPerWin: 30,
  pointsPerLoss: -15,
  pointsPerKill: 5,
  pointsPerDungeonClear: 20,
  pointsPerBossKill: 50,
  seasonEndRewards: {
    legend:      { gold: 200000, diamonds: 2000, title: 'season_legend' },
    grandmaster: { gold: 100000, diamonds: 1000, title: 'season_grandmaster' },
    master:      { gold: 50000,  diamonds: 500 },
    diamond:     { gold: 30000,  diamonds: 300 },
    platinum:    { gold: 20000,  diamonds: 200 },
    gold:        { gold: 10000,  diamonds: 100 },
    silver:      { gold: 5000,   diamonds: 50 },
    bronze:      { gold: 1000,   diamonds: 10 },
  },
};

function getSeasonData(player) {
  if (!player._rankedSeason) {
    player._rankedSeason = { points: 0, wins: 0, losses: 0, kills: 0, peakRank: 'bronze' };
  }
  return player._rankedSeason;
}

function getCurrentRank(points) {
  let rank = SEASON_CONFIG.ranks[0];
  for (const r of SEASON_CONFIG.ranks) {
    if (points >= r.minPts) rank = r;
  }
  return rank;
}

function addSeasonPoints(player, action, amount) {
  const data = getSeasonData(player);
  let pts = 0;

  switch (action) {
    case 'pvp_win': pts = SEASON_CONFIG.pointsPerWin; data.wins++; break;
    case 'pvp_loss': pts = SEASON_CONFIG.pointsPerLoss; data.losses++; break;
    case 'kill': pts = SEASON_CONFIG.pointsPerKill; data.kills++; break;
    case 'dungeon': pts = SEASON_CONFIG.pointsPerDungeonClear; break;
    case 'boss_kill': pts = SEASON_CONFIG.pointsPerBossKill; break;
    default: pts = amount || 0;
  }

  data.points = Math.max(0, data.points + pts);

  const newRank = getCurrentRank(data.points);
  const oldPeak = getCurrentRank(SEASON_CONFIG.ranks.find(r => r.id === data.peakRank)?.minPts || 0);
  if (newRank.minPts > oldPeak.minPts) data.peakRank = newRank.id;

  return { points: data.points, rank: newRank, gained: pts, isPromotion: newRank.minPts > oldPeak.minPts };
}

function getSeasonStatus(player) {
  const data = getSeasonData(player);
  const rank = getCurrentRank(data.points);
  const nextRank = SEASON_CONFIG.ranks.find(r => r.minPts > data.points);
  return {
    points: data.points,
    rank,
    nextRank: nextRank || null,
    pointsToNext: nextRank ? nextRank.minPts - data.points : 0,
    wins: data.wins,
    losses: data.losses,
    kills: data.kills,
    winRate: data.wins + data.losses > 0 ? Math.floor(data.wins / (data.wins + data.losses) * 100) : 0,
    peakRank: SEASON_CONFIG.ranks.find(r => r.id === data.peakRank) || SEASON_CONFIG.ranks[0],
    rewards: SEASON_CONFIG.seasonEndRewards,
  };
}

function registerRankedHandlers(socket, playerId, players, io) {
  socket.on('ranked_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('ranked_status', getSeasonStatus(p));
  });

  socket.on('ranked_leaderboard', () => {
    const board = Object.entries(players)
      .filter(([, p]) => p && !p.isBot && p._rankedSeason)
      .map(([pid, p]) => ({
        name: p.displayName || p.className,
        level: p.level,
        points: p._rankedSeason.points,
        rank: getCurrentRank(p._rankedSeason.points),
        wins: p._rankedSeason.wins,
        kills: p._rankedSeason.kills,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
    socket.emit('ranked_leaderboard', { leaderboard: board });
  });
}

module.exports = { SEASON_CONFIG, getSeasonData, getCurrentRank, addSeasonPoints, getSeasonStatus, registerRankedHandlers };
