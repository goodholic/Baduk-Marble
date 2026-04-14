// ============================================
// 서버 랭킹 보드 — 경쟁의 재미
// ============================================

const RANKING_CATEGORIES = [
  { id: 'power', name: '전투력', icon: '⚔️', calc: (p) => (p.cards||[]).reduce((s,c)=>(s+(c.atk||0)+(c.def||0)+(c.hp||0)*0.1),0) },
  { id: 'pvp', name: 'PvP 점수', icon: '🏆', calc: (p) => p.pvpPoints || 0 },
  { id: 'tower', name: '탑 층수', icon: '🗼', calc: (p) => p.towerFloor || 0 },
  { id: 'season', name: '시즌 점수', icon: '🌟', calc: (p) => p.seasonPoints || 0 },
  { id: 'cards', name: '카드 수', icon: '🃏', calc: (p) => (p.cards||[]).length },
  { id: 'gold', name: '보유 골드', icon: '💰', calc: (p) => p.gold || 0 },
  { id: 'fortress', name: '기지 레벨', icon: '🏰', calc: (p) => p.fortress?.level || 0 },
  { id: 'io_wins', name: 'IO 우승', icon: '🏆⚔️', calc: (p) => p.totalIoWins || 0 },
  { id: 'io_kills', name: 'IO 킬', icon: '💀', calc: (p) => p.totalIoKills || 0 },
  { id: 'awakened', name: '각성 수', icon: '🌟⚔️', calc: (p) => (p.cards||[]).filter(c=>c.awakened).length },
];

// TOP 보상 (매일 자동 지급)
const TOP_REWARDS = {
  1: { gold: 10000, diamonds: 30, desc: '1위' },
  2: { gold: 7000, diamonds: 20, desc: '2위' },
  3: { gold: 5000, diamonds: 15, desc: '3위' },
  10: { gold: 2000, diamonds: 5, desc: 'TOP 10' },
};

function getRankings(players, categoryId, limit) {
  const cat = RANKING_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return [];
  const list = Object.values(players)
    .filter(p => p && !p.isBot && p.displayName)
    .map(p => ({ name: p.displayName, score: Math.floor(cat.calc(p)), title: p.equippedTitle }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || 20);
  return list.map((e, i) => ({ rank: i + 1, ...e }));
}

function register(io, socket, player, players) {
  socket.on('ranking_request', (data) => {
    const rankings = getRankings(players || {}, data.category || 'power', data.limit || 20);
    const myRank = rankings.findIndex(r => r.name === (player.displayName || '')) + 1;
    socket.emit('ranking_result', {
      category: data.category || 'power',
      rankings,
      myRank: myRank || '순위 밖',
      categories: RANKING_CATEGORIES.map(c => ({ id: c.id, name: c.name, icon: c.icon })),
    });
  });
}

module.exports = { RANKING_CATEGORIES, TOP_REWARDS, getRankings, register };
