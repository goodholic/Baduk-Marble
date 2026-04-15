// ============================================
// 서버 랭킹 보드 — 경쟁의 재미
// ============================================

const cardMail = require('./card_mail');

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
  // --- 추가 카테고리 ---
  { id: 'pk_kills', name: 'PK 킬', icon: '⚔️🔴', calc: (p) => p.totalPkKills || 0 },
  { id: 'karma', name: '카르마', icon: '👑', calc: (p) => p.karma || 0, desc: '높을수록 선인' },
  { id: 'expedition', name: '원정 완료', icon: '🗺️', calc: (p) => p.totalExpeditions || 0 },
  { id: 'trade', name: '무역 횟수', icon: '💰', calc: (p) => p.totalTrades || 0 },
  { id: 'collection', name: '도감 수', icon: '📖', calc: (p) => { const s = new Set((p.cards||[]).map(c=>(c.name||'').replace(/[★+\d]+$/,'').trim())); return s.size; } },
];

// TOP 보상 (매일 자동 지급)
const TOP_REWARDS = {
  1: { gold: 10000, diamonds: 30, desc: '1위' },
  2: { gold: 7000, diamonds: 20, desc: '2위' },
  3: { gold: 5000, diamonds: 15, desc: '3위' },
  10: { gold: 2000, diamonds: 5, desc: 'TOP 10' },
};

// ============================================
// Hall of Fame — 영구 기록
// ============================================

const hallOfFame = []; // server-wide permanent records

function addHallOfFame(entry) {
  // entry: { playerName, achievement, value, date }
  if (!entry || !entry.playerName || !entry.achievement) return;
  hallOfFame.push({
    playerName: entry.playerName,
    achievement: entry.achievement,
    value: entry.value || 0,
    date: entry.date || Date.now(),
  });
  hallOfFame.sort((a, b) => b.date - a.date);
  if (hallOfFame.length > 100) hallOfFame.length = 100;
}

function getHallOfFame(limit) {
  return hallOfFame.slice(0, limit || 50);
}

// ============================================
// Daily / Weekly Ranking Snapshots
// ============================================

let dailyRankingSnapshot = {};
let weeklyRankingSnapshot = {};

function takeDailySnapshot(players) {
  const previousSnapshot = { ...dailyRankingSnapshot };
  const today = new Date().toISOString().slice(0, 10);
  dailyRankingSnapshot = { date: today, categories: {} };

  for (const cat of RANKING_CATEGORIES) {
    const top = getRankings(players, cat.id, 10);
    dailyRankingSnapshot.categories[cat.id] = top;
  }
  dailyRankingSnapshot.previous = previousSnapshot.categories || null;
  return dailyRankingSnapshot;
}

function takeWeeklySnapshot(players) {
  const previousSnapshot = { ...weeklyRankingSnapshot };
  const now = new Date();
  const weekKey = `${now.getFullYear()}-W${String(Math.ceil(((now - new Date(now.getFullYear(),0,1))/86400000 + new Date(now.getFullYear(),0,1).getDay()+1)/7)).padStart(2,'0')}`;
  weeklyRankingSnapshot = { week: weekKey, categories: {} };

  for (const cat of RANKING_CATEGORIES) {
    const top = getRankings(players, cat.id, 10);
    weeklyRankingSnapshot.categories[cat.id] = top;
  }
  weeklyRankingSnapshot.previous = previousSnapshot.categories || null;
  return weeklyRankingSnapshot;
}

function getMyRankProgress(player, players) {
  const result = {};
  const prevCats = dailyRankingSnapshot.previous;

  for (const cat of RANKING_CATEGORIES) {
    const currentRankings = getRankings(players, cat.id, 999);
    const currentIdx = currentRankings.findIndex(r => r.name === (player.displayName || ''));
    const currentRank = currentIdx >= 0 ? currentIdx + 1 : null;

    let prevRank = null;
    if (prevCats && prevCats[cat.id]) {
      const prevIdx = prevCats[cat.id].findIndex(r => r.name === (player.displayName || ''));
      prevRank = prevIdx >= 0 ? prevIdx + 1 : null;
    }

    let change = '━';
    if (currentRank !== null && prevRank !== null) {
      const diff = prevRank - currentRank; // positive = moved up
      if (diff > 0) change = `↑${diff}`;
      else if (diff < 0) change = `↓${Math.abs(diff)}`;
    } else if (currentRank !== null && prevRank === null) {
      change = '🆕';
    }

    result[cat.id] = {
      categoryName: cat.name,
      icon: cat.icon,
      currentRank,
      change,
    };
  }
  return result;
}

// ============================================
// Power Score Breakdown — 전투력 상세 분석
// ============================================

function getPowerBreakdown(player) {
  const cards = player.cards || [];
  const equipment = player.equipment || {};
  const skins = player.skins || [];

  // Card base stats
  const cardStats = cards.reduce((acc, c) => {
    acc.atk += c.atk || 0;
    acc.def += c.def || 0;
    acc.hp += c.hp || 0;
    return acc;
  }, { atk: 0, def: 0, hp: 0 });
  const cardTotal = cardStats.atk + cardStats.def + cardStats.hp * 0.1;

  // Equipment bonus
  const equipBonus = Object.values(equipment).reduce((s, e) => {
    if (!e) return s;
    return s + (e.atk || 0) + (e.def || 0) + (e.hp || 0) * 0.1;
  }, 0);

  // Enchant bonus
  const enchantBonus = cards.reduce((s, c) => s + (c.enchantBonus || 0), 0);

  // Awakening bonus
  const awakeningBonus = cards.filter(c => c.awakened).reduce((s, c) => s + (c.awakeningPower || 50), 0);

  // Set bonus (equipment set + skin set)
  const equipSetBonus = player.equipSetBonus || 0;
  const skinSetBonus = player.skinSetBonus || 0;
  const setBonus = equipSetBonus + skinSetBonus;

  // Synergy bonus (party)
  const synergyBonus = player.partySynergyBonus || 0;

  // Guild skill bonus
  const guildBonus = player.guildSkillBonus || 0;

  // Title bonus
  const titleBonus = player.titleBonus || 0;

  const total = Math.floor(cardTotal + equipBonus + enchantBonus + awakeningBonus + setBonus + synergyBonus + guildBonus + titleBonus);

  return {
    items: [
      { label: '카드 스탯 합계', value: Math.floor(cardTotal), detail: `ATK ${cardStats.atk} / DEF ${cardStats.def} / HP ${cardStats.hp}` },
      { label: '장비 보너스', value: Math.floor(equipBonus) },
      { label: '강화 보너스', value: Math.floor(enchantBonus) },
      { label: '각성 보너스', value: Math.floor(awakeningBonus) },
      { label: '세트 효과', value: Math.floor(setBonus), detail: `장비 ${equipSetBonus} + 스킨 ${skinSetBonus}` },
      { label: '시너지 보너스', value: Math.floor(synergyBonus) },
      { label: '길드 스킬 보너스', value: Math.floor(guildBonus) },
      { label: '칭호 보너스', value: Math.floor(titleBonus) },
    ],
    total,
  };
}

// ============================================
// Ranking Rewards Auto-distribute
// ============================================

function distributeRankingRewards(players) {
  const winners = [];
  const playerList = Object.values(players).filter(p => p && !p.isBot && p.displayName);

  for (const cat of RANKING_CATEGORIES) {
    const rankings = getRankings(players, cat.id, 10);

    for (const entry of rankings) {
      let reward = null;
      if (entry.rank === 1) reward = TOP_REWARDS[1];
      else if (entry.rank === 2) reward = TOP_REWARDS[2];
      else if (entry.rank === 3) reward = TOP_REWARDS[3];
      else if (entry.rank <= 10) reward = TOP_REWARDS[10];

      if (!reward) continue;

      const target = playerList.find(p => p.displayName === entry.name);
      if (!target) continue;

      const mailTitle = `[랭킹] ${cat.name} ${reward.desc} 보상`;
      const mailBody = `${cat.icon} ${cat.name} 랭킹 ${reward.desc}를 달성하셨습니다! 골드 ${reward.gold}, 다이아 ${reward.diamonds} 지급!`;

      if (typeof cardMail.sendSystemMail === 'function') {
        cardMail.sendSystemMail(target, mailTitle, mailBody, [
          { type: 'gold', amount: reward.gold },
          { type: 'diamond', amount: reward.diamonds },
        ]);
      }

      winners.push({
        playerName: entry.name,
        category: cat.name,
        rank: entry.rank,
        reward: reward.desc,
      });
    }
  }

  return winners;
}

// ============================================
// Rival System — 라이벌 자동 감지
// ============================================

function detectRivals(player, players) {
  if (!player || !player.displayName) return {};

  const rivals = {};

  for (const cat of RANKING_CATEGORIES) {
    const rankings = getRankings(players, cat.id, 999);
    const myIdx = rankings.findIndex(r => r.name === player.displayName);
    if (myIdx < 0) continue;

    const myScore = rankings[myIdx].score;
    const candidates = [];

    // Players above me (rivals to chase)
    for (let i = myIdx - 1; i >= 0 && candidates.length < 2; i--) {
      candidates.push({
        name: rankings[i].name,
        rank: rankings[i].rank,
        score: rankings[i].score,
        gap: rankings[i].score - myScore,
        direction: 'above',
      });
    }

    // Player below me (rival chasing me)
    for (let i = myIdx + 1; i < rankings.length && candidates.length < 3; i++) {
      candidates.push({
        name: rankings[i].name,
        rank: rankings[i].rank,
        score: rankings[i].score,
        gap: myScore - rankings[i].score,
        direction: 'below',
      });
    }

    if (candidates.length > 0) {
      rivals[cat.id] = {
        categoryName: cat.name,
        icon: cat.icon,
        myRank: myIdx + 1,
        myScore,
        rivals: candidates,
      };
    }
  }

  return rivals;
}

// ============================================
// Core getRankings
// ============================================

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

// ============================================
// Socket Registration
// ============================================

function register(io, socket, player, players) {
  socket.on('ranking_request', (data) => {
    const rankings = getRankings(players || {}, data.category || 'power', data.limit || 20);
    const myRank = rankings.findIndex(r => r.name === (player.displayName || '')) + 1;
    socket.emit('ranking_result', {
      category: data.category || 'power',
      rankings,
      myRank: myRank || '순위 밖',
      categories: RANKING_CATEGORIES.map(c => ({ id: c.id, name: c.name, icon: c.icon, desc: c.desc })),
    });
  });

  socket.on('ranking_hall_of_fame', () => {
    socket.emit('ranking_hall_of_fame_result', { hallOfFame: getHallOfFame() });
  });

  socket.on('ranking_my_progress', () => {
    const progress = getMyRankProgress(player, players || {});
    socket.emit('ranking_my_progress_result', { progress });
  });

  socket.on('ranking_power_breakdown', () => {
    const breakdown = getPowerBreakdown(player);
    socket.emit('ranking_power_breakdown_result', { breakdown });
  });

  socket.on('ranking_rivals', () => {
    const rivals = detectRivals(player, players || {});
    socket.emit('ranking_rivals_result', { rivals });
  });
}

module.exports = {
  RANKING_CATEGORIES,
  TOP_REWARDS,
  getRankings,
  register,
  hallOfFame,
  addHallOfFame,
  getHallOfFame,
  takeDailySnapshot,
  takeWeeklySnapshot,
  getMyRankProgress,
  getPowerBreakdown,
  distributeRankingRewards,
  detectRivals,
};
