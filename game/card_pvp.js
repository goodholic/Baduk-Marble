// ============================================
// 카드 대전 PvP (카드게임 메인 화면에서 다른 플레이어와 대결)
// ============================================

// 카드 대전 규칙: 5장 덱으로 자동 전투, 상성+스탯+시너지

const ELEMENT_TYPES = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
const ELEMENT_ADVANTAGE = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };

// 시너지 조합 (같은 속성/종류 카드가 덱에 있으면 보너스)
const SYNERGIES = [
  { id: 'warrior_duo', name: '전사의 결의', req: { type: 'warrior', count: 2 }, bonus: { atk: 1.15 }, icon: '⚔️⚔️' },
  { id: 'warrior_trio', name: '전사 군단', req: { type: 'warrior', count: 3 }, bonus: { atk: 1.3, def: 1.1 }, icon: '⚔️⚔️⚔️' },
  { id: 'mage_duo', name: '마법 공명', req: { type: 'mage', count: 2 }, bonus: { atk: 1.2 }, icon: '🔮🔮' },
  { id: 'mixed_team', name: '혼합 편성', req: { uniqueTypes: 4 }, bonus: { all: 1.08 }, icon: '🌈' },
  { id: 'full_stars', name: '별의 군단', req: { minStars: 3 }, bonus: { all: 1.12 }, icon: '⭐⭐⭐' },
  { id: 'legend_pair', name: '전설의 힘', req: { minGrade: 'legend', count: 2 }, bonus: { atk: 1.25 }, icon: '🌟🌟' },
  { id: 'fire_team', name: '화염 연합', req: { element: 'fire', count: 3 }, bonus: { fireDmg: 1.4 }, icon: '🔥🔥🔥' },
  { id: 'balance', name: '완벽한 균형', req: { exactCount: 5, uniqueGrades: 3 }, bonus: { all: 1.1 }, icon: '⚖️' },
];

// 카드 대전 보상
const PVP_REWARDS = {
  win:  { gold: 1000, pvpPoints: 30, desc: '승리 보상' },
  lose: { gold: 200, pvpPoints: 5, desc: '패배 위로금' },
  draw: { gold: 500, pvpPoints: 15, desc: '무승부' },
  streak3: { gold: 3000, diamonds: 5, desc: '3연승 보너스!' },
  streak5: { gold: 8000, diamonds: 15, desc: '5연승 보너스!' },
  streak10: { gold: 20000, diamonds: 50, title: '카드 마스터', desc: '10연승!' },
};

// PvP 등급
const PVP_RANKS = [
  { rank: 'bronze', name: '브론즈', icon: '🥉', minPoints: 0 },
  { rank: 'silver', name: '실버', icon: '🥈', minPoints: 100 },
  { rank: 'gold', name: '골드', icon: '🏅', minPoints: 300 },
  { rank: 'platinum', name: '플래티넘', icon: '💎', minPoints: 600 },
  { rank: 'diamond', name: '다이아', icon: '💠', minPoints: 1000 },
  { rank: 'master', name: '마스터', icon: '🌟', minPoints: 1500 },
  { rank: 'legend', name: '전설', icon: '👑', minPoints: 2000 },
];

// 자동 전투 시뮬레이션
function simulateCardBattle(deckA, deckB) {
  const log = [];
  let hpA = deckA.reduce((s, c) => s + (c.hp || 100), 0);
  let hpB = deckB.reduce((s, c) => s + (c.hp || 100), 0);
  const totalAtkA = deckA.reduce((s, c) => s + (c.atk || 30), 0);
  const totalAtkB = deckB.reduce((s, c) => s + (c.atk || 30), 0);
  const totalDefA = deckA.reduce((s, c) => s + (c.def || 20), 0);
  const totalDefB = deckB.reduce((s, c) => s + (c.def || 20), 0);

  for (let round = 1; round <= 10 && hpA > 0 && hpB > 0; round++) {
    const dmgToB = Math.max(5, Math.floor(totalAtkA * (1 + Math.random() * 0.3) - totalDefB * 0.3));
    const dmgToA = Math.max(5, Math.floor(totalAtkB * (1 + Math.random() * 0.3) - totalDefA * 0.3));
    hpB -= dmgToB;
    hpA -= dmgToA;
    log.push({ round, dmgToB, dmgToA, hpA: Math.max(0, hpA), hpB: Math.max(0, hpB) });
  }

  const winner = hpA > hpB ? 'A' : hpB > hpA ? 'B' : 'draw';
  return { winner, log, finalHpA: Math.max(0, hpA), finalHpB: Math.max(0, hpB) };
}

function register(io, socket, player) {
  // PvP 매칭 요청
  socket.on('card_pvp_request', () => {
    // 간단한 봇 대전 (실제 매칭은 추후)
    const myDeck = (player.cards || []).slice(0, 5);
    if (myDeck.length < 3) return socket.emit('card_pvp_result', { ok: false, reason: '카드 3장 이상 필요' });

    // 상대 봇 덱 생성
    const botDeck = myDeck.map(c => ({
      ...c, id: 'bot_' + c.id,
      atk: Math.floor((c.atk || 30) * (0.8 + Math.random() * 0.4)),
      def: Math.floor((c.def || 20) * (0.8 + Math.random() * 0.4)),
      hp: Math.floor((c.hp || 100) * (0.8 + Math.random() * 0.4)),
    }));

    const result = simulateCardBattle(myDeck, botDeck);
    const isWin = result.winner === 'A';
    const reward = isWin ? PVP_REWARDS.win : PVP_REWARDS.lose;

    player.gold = (player.gold || 0) + reward.gold;
    player.pvpPoints = (player.pvpPoints || 0) + reward.pvpPoints;
    player.pvpStreak = isWin ? (player.pvpStreak || 0) + 1 : 0;

    // 연승 보너스
    let streakReward = null;
    if (player.pvpStreak >= 10) streakReward = PVP_REWARDS.streak10;
    else if (player.pvpStreak >= 5) streakReward = PVP_REWARDS.streak5;
    else if (player.pvpStreak >= 3) streakReward = PVP_REWARDS.streak3;

    if (streakReward) {
      player.gold += streakReward.gold || 0;
      player.diamonds = (player.diamonds || 0) + (streakReward.diamonds || 0);
    }

    const rank = [...PVP_RANKS].reverse().find(r => player.pvpPoints >= r.minPoints);

    socket.emit('card_pvp_result', {
      ok: true, win: isWin, result, reward,
      streak: player.pvpStreak, streakReward,
      pvpPoints: player.pvpPoints, rank,
      myDeck, botDeck,
    });
  });

  socket.on('card_pvp_rank', () => {
    const rank = [...PVP_RANKS].reverse().find(r => (player.pvpPoints || 0) >= r.minPoints);
    socket.emit('card_pvp_rank', { rank, points: player.pvpPoints || 0, streak: player.pvpStreak || 0 });
  });
}

module.exports = { SYNERGIES, PVP_REWARDS, PVP_RANKS, ELEMENT_ADVANTAGE, simulateCardBattle, register };
