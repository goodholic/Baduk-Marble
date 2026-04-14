// ============================================
// 시즌 랭킹 + 시즌 보상 시스템
// ============================================

const SEASON_DURATION = 30; // 30일

// 시즌 점수 획득 방법
const SEASON_POINTS = {
  io_kill: 10,
  io_top1: 500,
  io_top3: 200,
  io_top10: 100,
  io_survive_min: 2, // 분당
  pvp_win: 30,
  pvp_streak3: 100,
  fortress_attack_win: 50,
  card_evolve: 20,
  card_promote: 15,
  guild_raid_win: 80,
  daily_quest_complete: 25,
  attendance: 10,
};

// 시즌 등급 (점수 기준)
const SEASON_RANKS = [
  { rank: 'iron', name: '아이언', icon: '⬜', minPoints: 0, reward: { gold: 1000 } },
  { rank: 'bronze', name: '브론즈', icon: '🥉', minPoints: 500, reward: { gold: 3000, diamonds: 10 } },
  { rank: 'silver', name: '실버', icon: '🥈', minPoints: 1500, reward: { gold: 8000, diamonds: 30 } },
  { rank: 'gold', name: '골드', icon: '🏅', minPoints: 3000, reward: { gold: 15000, diamonds: 60, card: 'rare' } },
  { rank: 'platinum', name: '플래티넘', icon: '💎', minPoints: 6000, reward: { gold: 30000, diamonds: 100, card: 'epic' } },
  { rank: 'diamond', name: '다이아', icon: '💠', minPoints: 10000, reward: { gold: 50000, diamonds: 200, card: 'epic' } },
  { rank: 'master', name: '마스터', icon: '🌟', minPoints: 20000, reward: { gold: 80000, diamonds: 300, card: 'legend' } },
  { rank: 'grandmaster', name: '그랜드마스터', icon: '👑', minPoints: 40000, reward: { gold: 150000, diamonds: 500, card: 'legend', title: '시즌 그랜드마스터' } },
  { rank: 'legend', name: '전설', icon: '👑🌟', minPoints: 80000, reward: { gold: 300000, diamonds: 1000, card: 'myth', title: '시즌 전설', frame: 'season_legend' } },
];

// 시즌 패스 (무료 + 프리미엄)
const SEASON_PASS = {
  free: [
    { level: 1, reward: { gold: 500 } },
    { level: 5, reward: { gold: 2000, diamonds: 5 } },
    { level: 10, reward: { gold: 5000, card: 'normal' } },
    { level: 20, reward: { gold: 10000, card: 'rare' } },
    { level: 30, reward: { gold: 20000, diamonds: 30, card: 'rare' } },
    { level: 40, reward: { gold: 30000, card: 'epic' } },
    { level: 50, reward: { gold: 50000, diamonds: 50, card: 'epic', title: '시즌 완주자' } },
  ],
  premium: [
    { level: 1, reward: { gold: 1000, diamonds: 5 } },
    { level: 5, reward: { gold: 5000, diamonds: 15, card: 'rare' } },
    { level: 10, reward: { gold: 10000, diamonds: 20, card: 'epic' } },
    { level: 20, reward: { gold: 20000, diamonds: 50, card: 'epic' } },
    { level: 30, reward: { gold: 40000, diamonds: 80, card: 'legend' } },
    { level: 40, reward: { gold: 60000, diamonds: 120, card: 'legend' } },
    { level: 50, reward: { gold: 100000, diamonds: 200, card: 'myth', title: '시즌 엘리트', frame: 'season_premium' } },
  ],
  premiumCost: 500, // 다이아
};

function addSeasonPoints(player, action) {
  const pts = SEASON_POINTS[action] || 0;
  if (pts === 0) return null;
  player.seasonPoints = (player.seasonPoints || 0) + pts;
  player.seasonLevel = Math.floor(player.seasonPoints / 200) + 1; // 200점당 1레벨
  const rank = [...SEASON_RANKS].reverse().find(r => player.seasonPoints >= r.minPoints);
  return { points: pts, total: player.seasonPoints, level: player.seasonLevel, rank };
}

function getSeasonStatus(player) {
  const rank = [...SEASON_RANKS].reverse().find(r => (player.seasonPoints || 0) >= r.minPoints) || SEASON_RANKS[0];
  return {
    points: player.seasonPoints || 0,
    level: player.seasonLevel || 1,
    rank,
    hasPremium: player.seasonPremium || false,
    daysLeft: SEASON_DURATION - Math.floor((Date.now() - (player._seasonStart || Date.now())) / 86400000),
  };
}

function buyPremiumPass(player) {
  if (player.seasonPremium) return { ok: false, reason: '이미 구매함' };
  if ((player.diamonds || 0) < SEASON_PASS.premiumCost) return { ok: false, reason: `다이아 ${SEASON_PASS.premiumCost} 필요` };
  player.diamonds -= SEASON_PASS.premiumCost;
  player.seasonPremium = true;
  return { ok: true, msg: `시즌 프리미엄 패스 구매! 보상 2배!` };
}

function register(io, socket, player) {
  socket.on('season_status', () => {
    socket.emit('season_status', {
      ...getSeasonStatus(player),
      pass: SEASON_PASS,
      pointsTable: SEASON_POINTS,
      ranks: SEASON_RANKS,
    });
  });

  socket.on('season_buy_premium', () => {
    const result = buyPremiumPass(player);
    socket.emit('season_buy_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });
}

module.exports = { SEASON_POINTS, SEASON_RANKS, SEASON_PASS, addSeasonPoints, getSeasonStatus, buyPremiumPass, register };
