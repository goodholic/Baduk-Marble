// ============================================
// 카드 대전 PvP (카드게임 메인 화면에서 다른 플레이어와 대결)
// ============================================

// 카드 대전 규칙: 5장 덱으로 자동 전투, 상성+스탯+시너지+등급+별

const ELEMENT_TYPES = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
const ELEMENT_ADVANTAGE = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };

// 등급 순서 (낮은 → 높은)
const GRADE_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legend', 'myth'];

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

// PvP 등급 (ELO 기반)
const PVP_RANKS = [
  { rank: 'bronze', name: '브론즈', icon: '🥉', minRating: 0 },
  { rank: 'silver', name: '실버', icon: '🥈', minRating: 1000 },
  { rank: 'gold', name: '골드', icon: '🏅', minRating: 1200 },
  { rank: 'platinum', name: '플래티넘', icon: '💎', minRating: 1400 },
  { rank: 'diamond', name: '다이아', icon: '💠', minRating: 1600 },
  { rank: 'master', name: '마스터', icon: '🌟', minRating: 1800 },
  { rank: 'legend', name: '전설', icon: '👑', minRating: 2000 },
];

// 시즌 보상
const SEASON_REWARDS = [
  { rank: 'legend', reward: { gold: 50000, diamonds: 200, card: 'myth' } },
  { rank: 'master', reward: { gold: 30000, diamonds: 100, card: 'legend' } },
  { rank: 'diamond', reward: { gold: 15000, diamonds: 50, card: 'epic' } },
  { rank: 'platinum', reward: { gold: 10000, diamonds: 30, card: 'rare' } },
  { rank: 'gold', reward: { gold: 5000, diamonds: 15, card: 'uncommon' } },
  { rank: 'silver', reward: { gold: 2000, diamonds: 5, card: 'common' } },
  { rank: 'bronze', reward: { gold: 500, diamonds: 0, card: null } },
];

// 시즌 정보 (매월 1일 리셋)
function getSeasonInfo() {
  const now = new Date();
  const seasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const seasonStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysLeft = Math.ceil((seasonEnd - now) / (1000 * 60 * 60 * 24));
  return {
    season: `${now.getFullYear()}-S${now.getMonth() + 1}`,
    startDate: seasonStart.toISOString(),
    endDate: seasonEnd.toISOString(),
    daysLeft,
    rewards: SEASON_REWARDS,
  };
}

// ============================================
// 시너지 계산
// ============================================

function getActiveSynergies(deck) {
  const active = [];
  for (const syn of SYNERGIES) {
    const { req } = syn;
    let matched = false;

    if (req.type && req.count) {
      const cnt = deck.filter(c => c.type === req.type).length;
      if (cnt >= req.count) matched = true;
    }
    if (req.uniqueTypes) {
      const types = new Set(deck.map(c => c.type).filter(Boolean));
      if (types.size >= req.uniqueTypes) matched = true;
    }
    if (req.minStars) {
      if (deck.every(c => (c.star || 0) >= req.minStars)) matched = true;
    }
    if (req.minGrade && req.count) {
      const minIdx = GRADE_ORDER.indexOf(req.minGrade);
      const cnt = deck.filter(c => GRADE_ORDER.indexOf(c.grade || 'common') >= minIdx).length;
      if (cnt >= req.count) matched = true;
    }
    if (req.element && req.count) {
      const cnt = deck.filter(c => c.element === req.element).length;
      if (cnt >= req.count) matched = true;
    }
    if (req.exactCount && req.uniqueGrades) {
      const grades = new Set(deck.map(c => c.grade || 'common'));
      if (deck.length === req.exactCount && grades.size >= req.uniqueGrades) matched = true;
    }

    if (matched) active.push(syn);
  }
  return active;
}

function applySynergyBonuses(card, synergies) {
  let atkMul = 1, defMul = 1, hpMul = 1;
  for (const syn of synergies) {
    const b = syn.bonus;
    if (b.atk) atkMul *= b.atk;
    if (b.def) defMul *= b.def;
    if (b.all) { atkMul *= b.all; defMul *= b.all; hpMul *= b.all; }
    // fireDmg: 카드의 속성이 fire일 때만 공격력 보너스
    if (b.fireDmg && card.element === 'fire') atkMul *= b.fireDmg;
  }
  return {
    ...card,
    atk: Math.floor((card.atk || 30) * atkMul),
    def: Math.floor((card.def || 20) * defMul),
    hp: Math.floor((card.hp || 100) * hpMul),
  };
}

// ============================================
// ELO 레이팅
// ============================================

function calculateEloChange(winnerRating, loserRating, winnerGames) {
  const K = (winnerGames || 0) < 30 ? 32 : 16;
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const winnerGain = Math.round(K * (1 - expected));
  const loserLoss = Math.round(K * expected);
  return { winnerGain, loserLoss };
}

function getRank(rating) {
  return [...PVP_RANKS].reverse().find(r => rating >= r.minRating) || PVP_RANKS[0];
}

// ============================================
// 전투 시뮬레이션 (Best of 5, 카드별 개별 전투)
// ============================================

function simulateCardBattle(deckA, deckB) {
  // Step 1: 시너지 계산
  const synA = getActiveSynergies(deckA);
  const synB = getActiveSynergies(deckB);

  // Step 2: 시너지 보너스 적용
  const boostedA = deckA.map(c => applySynergyBonuses(c, synA));
  const boostedB = deckB.map(c => applySynergyBonuses(c, synB));

  // Step 3: 5라운드 개별 카드 매치업
  const rounds = [];
  let winsA = 0, winsB = 0;
  const numRounds = Math.min(5, boostedA.length, boostedB.length);

  for (let i = 0; i < numRounds; i++) {
    const cardA = boostedA[i];
    const cardB = boostedB[i];

    // 속성 상성
    const elemA = cardA.element || 'fire';
    const elemB = cardB.element || 'fire';
    const aBeatsB = ELEMENT_ADVANTAGE[elemA] === elemB;
    const bBeatsA = ELEMENT_ADVANTAGE[elemB] === elemA;
    const elemMulA = aBeatsB ? 1.3 : (bBeatsA ? 0.8 : 1.0);
    const elemMulB = bBeatsA ? 1.3 : (aBeatsB ? 0.8 : 1.0);

    // 등급 보너스 (+10% per grade difference)
    const gradeA = GRADE_ORDER.indexOf(cardA.grade || 'common');
    const gradeB = GRADE_ORDER.indexOf(cardB.grade || 'common');
    const gradeDiff = gradeA - gradeB;
    const gradeMulA = 1 + Math.max(0, gradeDiff) * 0.1;
    const gradeMulB = 1 + Math.max(0, -gradeDiff) * 0.1;

    // 별 보너스 (+5% per star)
    const starMulA = 1 + (cardA.star || 0) * 0.05;
    const starMulB = 1 + (cardB.star || 0) * 0.05;

    // 랜덤 변동 (0.85 ~ 1.15)
    const randA = 0.85 + Math.random() * 0.3;
    const randB = 0.85 + Math.random() * 0.3;

    // 데미지 계산
    const dmgA = Math.max(5, Math.floor(
      cardA.atk * elemMulA * gradeMulA * starMulA * randA - cardB.def * 0.3
    ));
    const dmgB = Math.max(5, Math.floor(
      cardB.atk * elemMulB * gradeMulB * starMulB * randB - cardA.def * 0.3
    ));

    const roundWinner = dmgA > dmgB ? 'A' : dmgB > dmgA ? 'B' : 'draw';
    if (roundWinner === 'A') winsA++;
    else if (roundWinner === 'B') winsB++;

    rounds.push({
      round: i + 1,
      cardA: { name: cardA.name || cardA.id, atk: cardA.atk, def: cardA.def, element: elemA, grade: cardA.grade || 'common', star: cardA.star || 0 },
      cardB: { name: cardB.name || cardB.id, atk: cardB.atk, def: cardB.def, element: elemB, grade: cardB.grade || 'common', star: cardB.star || 0 },
      dmgA,
      dmgB,
      elemAdvantage: aBeatsB ? 'A' : bBeatsA ? 'B' : null,
      winner: roundWinner,
    });
  }

  // Step 4: Best of 5
  const winner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'draw';

  return {
    winner,
    score: { A: winsA, B: winsB },
    rounds,
    synergiesA: synA.map(s => ({ id: s.id, name: s.name, icon: s.icon })),
    synergiesB: synB.map(s => ({ id: s.id, name: s.name, icon: s.icon })),
  };
}

// ============================================
// 덱 분석
// ============================================

function analyzeDeck(deck, allCards) {
  if (!deck || deck.length === 0) return { error: '덱이 비어 있습니다' };

  // 속성 커버리지
  const elements = deck.map(c => c.element || 'fire');
  const elementSet = new Set(elements);
  const missingElements = ELEMENT_TYPES.filter(e => !elementSet.has(e));

  // 시너지 매칭
  const activeSynergies = getActiveSynergies(deck);

  // 약점 분석
  const weaknesses = [];
  for (const elem of elements) {
    // 이 속성에 강한 상대 속성 찾기
    const counter = Object.entries(ELEMENT_ADVANTAGE).find(([, v]) => v === elem);
    if (counter) {
      const counteredBy = counter[0];
      if (!elementSet.has(ELEMENT_ADVANTAGE[counteredBy]) && counteredBy !== elem) {
        weaknesses.push({ element: elem, counteredBy });
      }
    }
  }

  // 파워 스코어
  const totalAtk = deck.reduce((s, c) => s + (c.atk || 30), 0);
  const totalDef = deck.reduce((s, c) => s + (c.def || 20), 0);
  const totalHp = deck.reduce((s, c) => s + (c.hp || 100), 0);
  const avgGrade = deck.reduce((s, c) => s + GRADE_ORDER.indexOf(c.grade || 'common'), 0) / deck.length;
  const avgStar = deck.reduce((s, c) => s + (c.star || 0), 0) / deck.length;
  const synergyBonus = activeSynergies.length * 5;
  const powerScore = Math.floor(totalAtk * 1.5 + totalDef + totalHp * 0.5 + avgGrade * 20 + avgStar * 10 + synergyBonus);

  // 교체 추천
  const recommendations = [];
  if (allCards && allCards.length > 0) {
    const deckIds = new Set(deck.map(c => c.id));
    const available = allCards.filter(c => !deckIds.has(c.id));

    // 약점 커버를 위한 추천
    for (const miss of missingElements.slice(0, 2)) {
      const candidate = available
        .filter(c => c.element === miss)
        .sort((a, b) => (b.atk || 30) - (a.atk || 30))[0];
      if (candidate) {
        recommendations.push({
          action: 'swap',
          reason: `${miss} 속성 부재 — 상성 커버리지 확보`,
          cardIn: { id: candidate.id, name: candidate.name, element: candidate.element },
        });
      }
    }

    // 더 높은 등급 카드 추천
    const bestAvail = available
      .sort((a, b) => GRADE_ORDER.indexOf(b.grade || 'common') - GRADE_ORDER.indexOf(a.grade || 'common'))[0];
    const worstInDeck = [...deck]
      .sort((a, b) => GRADE_ORDER.indexOf(a.grade || 'common') - GRADE_ORDER.indexOf(b.grade || 'common'))[0];
    if (bestAvail && worstInDeck &&
        GRADE_ORDER.indexOf(bestAvail.grade || 'common') > GRADE_ORDER.indexOf(worstInDeck.grade || 'common')) {
      recommendations.push({
        action: 'upgrade',
        reason: `${worstInDeck.name || worstInDeck.id} → ${bestAvail.name || bestAvail.id} (등급 업그레이드)`,
        cardOut: { id: worstInDeck.id, name: worstInDeck.name },
        cardIn: { id: bestAvail.id, name: bestAvail.name, grade: bestAvail.grade },
      });
    }
  }

  return {
    elementCoverage: [...elementSet],
    missingElements,
    activeSynergies: activeSynergies.map(s => ({ id: s.id, name: s.name, icon: s.icon })),
    weaknesses,
    powerScore,
    stats: { totalAtk, totalDef, totalHp, avgGrade: avgGrade.toFixed(1), avgStar: avgStar.toFixed(1) },
    recommendations,
  };
}

// ============================================
// 매치메이킹 큐
// ============================================

const pvpQueue = [];
const MATCH_RANGE_INITIAL = 200;
const MATCH_RANGE_EXPAND = 100;
const MATCH_EXPAND_INTERVAL = 30000; // 30초 후 범위 확대
const MAX_QUEUE_WAIT = 60000; // 60초 후 봇 매칭

function joinPvPQueue(socketId, player, deck) {
  // 이미 큐에 있으면 무시
  if (pvpQueue.find(q => q.socketId === socketId)) return { ok: false, reason: '이미 대기 중' };

  const rating = player.pvpRating || 1000;
  pvpQueue.push({
    socketId,
    player,
    deck,
    rating,
    queueTime: Date.now(),
  });
  return { ok: true, position: pvpQueue.length };
}

function leavePvPQueue(socketId) {
  const idx = pvpQueue.findIndex(q => q.socketId === socketId);
  if (idx !== -1) {
    pvpQueue.splice(idx, 1);
    return { ok: true };
  }
  return { ok: false, reason: '큐에 없음' };
}

function generateBotDeck(playerDeck, playerRating) {
  // 봇 난이도: 플레이어 레이팅에 비례
  const diffScale = Math.min(1.3, 0.7 + (playerRating - 800) / 2000);
  return playerDeck.map(c => ({
    ...c,
    id: 'bot_' + c.id,
    name: (c.name || 'Bot Card') + ' (Bot)',
    atk: Math.floor((c.atk || 30) * (diffScale * (0.85 + Math.random() * 0.3))),
    def: Math.floor((c.def || 20) * (diffScale * (0.85 + Math.random() * 0.3))),
    hp: Math.floor((c.hp || 100) * (diffScale * (0.85 + Math.random() * 0.3))),
    element: ELEMENT_TYPES[Math.floor(Math.random() * ELEMENT_TYPES.length)],
    grade: GRADE_ORDER[Math.min(GRADE_ORDER.length - 1, Math.max(0, GRADE_ORDER.indexOf(c.grade || 'common') + Math.floor(Math.random() * 3) - 1))],
    star: Math.max(0, (c.star || 0) + Math.floor(Math.random() * 3) - 1),
  }));
}

function processPvPQueue(io) {
  const now = Date.now();

  // 가장 오래 기다린 플레이어부터 매칭
  for (let i = 0; i < pvpQueue.length; i++) {
    const entry = pvpQueue[i];
    const waitTime = now - entry.queueTime;
    const range = MATCH_RANGE_INITIAL + Math.floor(waitTime / MATCH_EXPAND_INTERVAL) * MATCH_RANGE_EXPAND;

    // 같은 범위 내 상대 찾기
    for (let j = i + 1; j < pvpQueue.length; j++) {
      const opponent = pvpQueue[j];
      if (Math.abs(entry.rating - opponent.rating) <= range) {
        // 매칭 성공 — 큐에서 제거
        pvpQueue.splice(j, 1);
        pvpQueue.splice(i, 1);
        i--;

        // 전투 실행
        const result = simulateCardBattle(entry.deck, opponent.deck);
        const isEntryWin = result.winner === 'A';
        const eloChange = calculateEloChange(
          isEntryWin ? entry.rating : opponent.rating,
          isEntryWin ? opponent.rating : entry.rating,
          isEntryWin ? entry.player._pvpGames : opponent.player._pvpGames
        );

        // 레이팅 업데이트
        const entryRatingChange = isEntryWin ? eloChange.winnerGain : -eloChange.loserLoss;
        const oppRatingChange = isEntryWin ? -eloChange.loserLoss : eloChange.winnerGain;
        entry.player.pvpRating = Math.max(0, (entry.player.pvpRating || 1000) + entryRatingChange);
        opponent.player.pvpRating = Math.max(0, (opponent.player.pvpRating || 1000) + oppRatingChange);
        entry.player._pvpGames = (entry.player._pvpGames || 0) + 1;
        opponent.player._pvpGames = (opponent.player._pvpGames || 0) + 1;

        // 보상
        applyBattleRewards(entry.player, isEntryWin);
        applyBattleRewards(opponent.player, !isEntryWin);

        // 전투 기록 저장
        saveBattleHistory(entry.player, {
          opponent: opponent.player.name || 'Player',
          myDeck: entry.deck,
          oppDeck: opponent.deck,
          rounds: result.rounds,
          result: isEntryWin ? 'win' : 'lose',
          eloChange: entryRatingChange,
          time: Date.now(),
        });
        saveBattleHistory(opponent.player, {
          opponent: entry.player.name || 'Player',
          myDeck: opponent.deck,
          oppDeck: entry.deck,
          rounds: result.rounds,
          result: isEntryWin ? 'lose' : 'win',
          eloChange: oppRatingChange,
          time: Date.now(),
        });

        // 결과 전송
        const entryRank = getRank(entry.player.pvpRating);
        const oppRank = getRank(opponent.player.pvpRating);

        io.to(entry.socketId).emit('pvp_match_result', {
          ok: true, win: isEntryWin, result,
          eloChange: entryRatingChange, rating: entry.player.pvpRating, rank: entryRank,
          streak: entry.player.pvpStreak, opponent: opponent.player.name || 'Player',
        });
        io.to(opponent.socketId).emit('pvp_match_result', {
          ok: true, win: !isEntryWin, result: { ...result, winner: result.winner === 'A' ? 'B' : result.winner === 'B' ? 'A' : 'draw' },
          eloChange: oppRatingChange, rating: opponent.player.pvpRating, rank: oppRank,
          streak: opponent.player.pvpStreak, opponent: entry.player.name || 'Player',
        });

        break;
      }
    }

    // 60초 이상 대기 시 봇 매칭
    if (pvpQueue[i] && waitTime >= MAX_QUEUE_WAIT) {
      const entry2 = pvpQueue.splice(i, 1)[0];
      i--;
      const botDeck = generateBotDeck(entry2.deck, entry2.rating);
      const result = simulateCardBattle(entry2.deck, botDeck);
      const isWin = result.winner === 'A';

      // 봇전 ELO 변동은 절반
      const eloChange = calculateEloChange(
        isWin ? entry2.rating : entry2.rating,
        isWin ? entry2.rating : entry2.rating,
        entry2.player._pvpGames
      );
      const ratingChange = isWin ? Math.ceil(eloChange.winnerGain / 2) : -Math.ceil(eloChange.loserLoss / 2);
      entry2.player.pvpRating = Math.max(0, (entry2.player.pvpRating || 1000) + ratingChange);
      entry2.player._pvpGames = (entry2.player._pvpGames || 0) + 1;

      applyBattleRewards(entry2.player, isWin);
      saveBattleHistory(entry2.player, {
        opponent: 'AI Bot',
        myDeck: entry2.deck,
        oppDeck: botDeck,
        rounds: result.rounds,
        result: isWin ? 'win' : 'lose',
        eloChange: ratingChange,
        time: Date.now(),
      });

      const rank = getRank(entry2.player.pvpRating);
      io.to(entry2.socketId).emit('pvp_match_result', {
        ok: true, win: isWin, result, isBot: true,
        eloChange: ratingChange, rating: entry2.player.pvpRating, rank,
        streak: entry2.player.pvpStreak, opponent: 'AI Bot',
      });
    }
  }
}

// ============================================
// 보상 및 기록
// ============================================

function applyBattleRewards(player, isWin) {
  const reward = isWin ? PVP_REWARDS.win : PVP_REWARDS.lose;
  player.gold = (player.gold || 0) + reward.gold;
  player.pvpPoints = (player.pvpPoints || 0) + reward.pvpPoints;
  player.pvpStreak = isWin ? (player.pvpStreak || 0) + 1 : 0;

  let streakReward = null;
  if (player.pvpStreak >= 10) streakReward = PVP_REWARDS.streak10;
  else if (player.pvpStreak >= 5) streakReward = PVP_REWARDS.streak5;
  else if (player.pvpStreak >= 3) streakReward = PVP_REWARDS.streak3;

  if (streakReward) {
    player.gold += streakReward.gold || 0;
    player.diamonds = (player.diamonds || 0) + (streakReward.diamonds || 0);
  }

  return { reward, streakReward };
}

function saveBattleHistory(player, entry) {
  if (!player._pvpHistory) player._pvpHistory = [];
  player._pvpHistory.unshift(entry);
  if (player._pvpHistory.length > 10) player._pvpHistory.length = 10;
}

function getBattleHistory(player) {
  return player._pvpHistory || [];
}

// ============================================
// 리더보드 (메모리 기반, 연결된 플레이어만)
// ============================================

const connectedPlayers = new Map(); // socketId -> player

function getLeaderboard(topN) {
  const players = [...connectedPlayers.values()];
  players.sort((a, b) => (b.pvpRating || 1000) - (a.pvpRating || 1000));
  return players.slice(0, topN || 20).map((p, i) => ({
    rank: i + 1,
    name: p.name || 'Unknown',
    rating: p.pvpRating || 1000,
    tier: getRank(p.pvpRating || 1000),
    wins: p._pvpWins || 0,
    games: p._pvpGames || 0,
  }));
}

// ============================================
// 소켓 등록
// ============================================

let queueInterval = null;

function register(io, socket, player) {
  // 리더보드 추적
  connectedPlayers.set(socket.id, player);
  socket.on('disconnect', () => {
    connectedPlayers.delete(socket.id);
    leavePvPQueue(socket.id);
  });

  // 큐 프로세서 (서버당 1개)
  if (!queueInterval) {
    queueInterval = setInterval(() => processPvPQueue(io), 3000);
  }

  // --- 매치메이킹 큐 ---
  socket.on('pvp_queue_join', (data) => {
    const deck = (data && data.deck) || (player.cards || []).slice(0, 5);
    if (deck.length < 3) return socket.emit('pvp_queue_join', { ok: false, reason: '카드 3장 이상 필요' });
    // 기본 레이팅 초기화
    if (!player.pvpRating) player.pvpRating = 1000;
    const result = joinPvPQueue(socket.id, player, deck);
    socket.emit('pvp_queue_join', result);
  });

  socket.on('pvp_queue_leave', () => {
    const result = leavePvPQueue(socket.id);
    socket.emit('pvp_queue_leave', result);
  });

  // --- 즉시 봇 대전 (기존 호환) ---
  socket.on('card_pvp_request', () => {
    const myDeck = (player.cards || []).slice(0, 5);
    if (myDeck.length < 3) return socket.emit('card_pvp_result', { ok: false, reason: '카드 3장 이상 필요' });

    if (!player.pvpRating) player.pvpRating = 1000;
    const botDeck = generateBotDeck(myDeck, player.pvpRating);
    const result = simulateCardBattle(myDeck, botDeck);
    const isWin = result.winner === 'A';

    // ELO
    const eloChange = calculateEloChange(
      player.pvpRating, player.pvpRating,
      player._pvpGames
    );
    const ratingChange = isWin ? Math.ceil(eloChange.winnerGain / 2) : -Math.ceil(eloChange.loserLoss / 2);
    player.pvpRating = Math.max(0, player.pvpRating + ratingChange);
    player._pvpGames = (player._pvpGames || 0) + 1;
    if (isWin) player._pvpWins = (player._pvpWins || 0) + 1;

    const { reward, streakReward } = applyBattleRewards(player, isWin);
    saveBattleHistory(player, {
      opponent: 'AI Bot',
      myDeck, oppDeck: botDeck,
      rounds: result.rounds,
      result: isWin ? 'win' : 'lose',
      eloChange: ratingChange,
      time: Date.now(),
    });

    const rank = getRank(player.pvpRating);
    socket.emit('card_pvp_result', {
      ok: true, win: isWin, result, reward,
      streak: player.pvpStreak, streakReward,
      eloChange: ratingChange, rating: player.pvpRating, rank,
      myDeck, botDeck,
    });
  });

  // --- 덱 분석 ---
  socket.on('pvp_deck_analyze', (data) => {
    const deck = (data && data.deck) || (player.cards || []).slice(0, 5);
    const allCards = player.cards || [];
    const analysis = analyzeDeck(deck, allCards);
    socket.emit('pvp_deck_analyze', analysis);
  });

  // --- 전투 기록 ---
  socket.on('pvp_history', () => {
    socket.emit('pvp_history', { history: getBattleHistory(player) });
  });

  // --- 시즌 정보 ---
  socket.on('pvp_season_info', () => {
    const season = getSeasonInfo();
    const rank = getRank(player.pvpRating || 1000);
    const myReward = SEASON_REWARDS.find(r => r.rank === rank.rank);
    socket.emit('pvp_season_info', { season, currentRank: rank, projectedReward: myReward });
  });

  // --- 리더보드 ---
  socket.on('pvp_leaderboard', () => {
    const board = getLeaderboard(20);
    socket.emit('pvp_leaderboard', { leaderboard: board });
  });

  // --- 랭크 조회 (기존 호환) ---
  socket.on('card_pvp_rank', () => {
    const rank = getRank(player.pvpRating || 1000);
    socket.emit('card_pvp_rank', {
      rank, rating: player.pvpRating || 1000,
      points: player.pvpPoints || 0, streak: player.pvpStreak || 0,
      games: player._pvpGames || 0, wins: player._pvpWins || 0,
    });
  });
}

module.exports = {
  ELEMENT_TYPES,
  ELEMENT_ADVANTAGE,
  GRADE_ORDER,
  SYNERGIES,
  PVP_REWARDS,
  PVP_RANKS,
  SEASON_REWARDS,
  getActiveSynergies,
  applySynergyBonuses,
  calculateEloChange,
  getRank,
  simulateCardBattle,
  analyzeDeck,
  joinPvPQueue,
  leavePvPQueue,
  processPvPQueue,
  getBattleHistory,
  getSeasonInfo,
  getLeaderboard,
  register,
};
