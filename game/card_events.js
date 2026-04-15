// ============================================
// 카드게임 이벤트/퀘스트 시스템
// ============================================

// 일일 퀘스트 (매일 3개 자동 생성)
const DAILY_QUESTS = [
  { id: 'dq_upgrade3', name: '카드 강화 3회', icon: '⬆️', goal: 3, reward: { gold: 1500, diamonds: 5 }, track: 'upgrades' },
  { id: 'dq_action5', name: '행동 카드 5회 사용', icon: '🎴', goal: 5, reward: { gold: 1000, diamonds: 3 }, track: 'actions' },
  { id: 'dq_pvp3', name: 'PvP 대전 3회', icon: '⚔️', goal: 3, reward: { gold: 2000, diamonds: 8 }, track: 'pvpBattles' },
  { id: 'dq_summon1', name: '소환 1회', icon: '📜', goal: 1, reward: { gold: 500, diamonds: 10 }, track: 'summons' },
  { id: 'dq_trade3', name: '무역 카드 3회 사용', icon: '💰', goal: 3, reward: { gold: 2000 }, track: 'trades' },
  { id: 'dq_io_join', name: 'IO 출전 1회', icon: '⚔️🏆', goal: 1, reward: { gold: 3000, diamonds: 15 }, track: 'ioJoins' },
  { id: 'dq_evolve1', name: '용병 진화 1회', icon: '🔥', goal: 1, reward: { gold: 2000, diamonds: 10 }, track: 'evolves' },
  { id: 'dq_promote1', name: '용병 진급 1회', icon: '⭐', goal: 1, reward: { gold: 1500, diamonds: 8 }, track: 'promotes' },
  { id: 'dq_login', name: '출석 체크', icon: '📅', goal: 1, reward: { gold: 500, diamonds: 3 }, track: 'logins' },
  { id: 'dq_collect5', name: '카드 5장 보유', icon: '🃏', goal: 5, reward: { gold: 1000 }, track: 'cardCount' },
];

// 주간 이벤트 (랜덤)
const WEEKLY_EVENTS = [
  { id: 'we_double_gold', name: '💰 골드 2배 주간', duration: 7, effect: { goldMul: 2.0 }, desc: '모든 골드 획득 2배!' },
  { id: 'we_summon_up', name: '📜 소환 확률 UP', duration: 7, effect: { summonRateUp: 1.5 }, desc: '전설 이상 확률 1.5배!' },
  { id: 'we_pvp_season', name: '⚔️ PvP 시즌', duration: 7, effect: { pvpPointsMul: 2.0 }, desc: 'PvP 포인트 2배!' },
  { id: 'we_exp_boost', name: '📈 경험치 부스트', duration: 7, effect: { expMul: 2.0 }, desc: '카드 강화 효과 2배!' },
  { id: 'we_trade_fest', name: '🏪 무역 축제', duration: 7, effect: { tradeMul: 2.0 }, desc: '무역 수익 2배!' },
];

// 특별 이벤트 (서버 전체)
const SPECIAL_EVENTS = [
  { id: 'se_boss_raid', name: '🐲 카드 보스 레이드', desc: '서버 전원이 보스 카드에 데미지를 합산! 처치 시 전원 보상',
    boss: { name: '드래곤 황제', hp: 1000000, icon: '🐲👑' }, reward: { gold: 5000, diamonds: 20, card: true } },
  { id: 'se_lottery', name: '🎰 카드 복권', desc: '매일 무료 1회, 신화 카드 당첨 확률!',
    prizes: [{ name: '신화 카드', chance: 0.001 }, { name: '전설 카드', chance: 0.01 }, { name: '1000G', chance: 0.1 }, { name: '100G', chance: 0.5 }] },
  { id: 'se_tournament', name: '🏆 카드 토너먼트', desc: '32강 카드 대전! 우승자 한정 카드',
    format: '32인 토너먼트', reward: { gold: 50000, diamonds: 100, card: 'tournament_champion' } },
];

// 출석 보상 (연속 출석)
const ATTENDANCE_REWARDS = [
  { day: 1, reward: { gold: 500 } },
  { day: 2, reward: { gold: 800 } },
  { day: 3, reward: { gold: 1000, diamonds: 5 } },
  { day: 5, reward: { gold: 2000, diamonds: 10 } },
  { day: 7, reward: { gold: 3000, diamonds: 20, card: 'rare' } },
  { day: 14, reward: { gold: 5000, diamonds: 30, card: 'epic' } },
  { day: 30, reward: { gold: 10000, diamonds: 50, card: 'legend' } },
];

// ============================================
// 복권 시스템
// ============================================
const LOTTERY_PRIZES = [
  { name: '🏆 대상: 신화 용병', grade: 'myth', chance: 0.001, type: 'card' },
  { name: '🥇 1등: 전설 용병', grade: 'legend', chance: 0.01, type: 'card' },
  { name: '🥈 2등: 에픽 용병', grade: 'epic', chance: 0.05, type: 'card' },
  { name: '🥉 3등: 10000G', value: 10000, chance: 0.1, type: 'gold' },
  { name: '4등: 3000G', value: 3000, chance: 0.2, type: 'gold' },
  { name: '5등: 500G', value: 500, chance: 0.634, type: 'gold' },
];

const LOTTERY_DRAW_COST = 5; // diamonds per paid draw

// ============================================
// 시즌 이벤트 체인
// ============================================
const SEASON_EVENT_CHAINS = [
  {
    id: 'chain_dragon_invasion',
    name: '🐲 드래곤 침공',
    stages: [
      { name: '1단계: 정찰', goal: { serverKills: 1000 }, reward: { allGold: 2000 }, desc: '몬스터 1000마리 처치 (서버 합산)' },
      { name: '2단계: 전쟁', goal: { serverKills: 5000 }, reward: { allDiamonds: 20 }, desc: '몬스터 5000마리 처치' },
      { name: '3단계: 최종 결전', goal: { bossDefeat: true }, reward: { allCard: 'epic' }, desc: '드래곤 로드 처치!' },
    ],
  },
  {
    id: 'chain_treasure_hunt',
    name: '💎 보물 사냥',
    stages: [
      { name: '1단계: 단서 수집', goal: { trades: 100 }, reward: { allGold: 3000 }, desc: '서버 무역 100회' },
      { name: '2단계: 지도 완성', goal: { trades: 500 }, reward: { allDiamonds: 30 }, desc: '서버 무역 500회' },
      { name: '3단계: 보물 발굴', goal: { trades: 1000 }, reward: { allCard: 'legend' }, desc: '전설 보물 출현!' },
    ],
  },
  {
    id: 'chain_pvp_war',
    name: '⚔️ 대전쟁',
    stages: [
      { name: '1단계: 선전포고', goal: { pvpBattles: 200 }, reward: { allGold: 2000 }, desc: 'PvP 200회' },
      { name: '2단계: 격전', goal: { pvpBattles: 1000 }, reward: { allDiamonds: 25 }, desc: 'PvP 1000회' },
      { name: '3단계: 최후의 결전', goal: { pvpBattles: 3000 }, reward: { allCard: 'legend', title: '전쟁영웅' }, desc: '칭호 + 전설 카드!' },
    ],
  },
];

// ============================================
// Boss Raid State (server-wide singleton)
// ============================================
let activeBossRaid = null;

function startBossRaid() {
  activeBossRaid = {
    id: `boss_${Date.now()}`,
    name: '드래곤 황제🐲👑',
    maxHp: 1000000,
    hp: 1000000,
    atk: 500,
    phase: 1,
    participants: {},
    startTime: Date.now(),
    endTime: Date.now() + 3600000, // 1 hour
    status: 'active',
  };
  return activeBossRaid;
}

function getBossPhase(hp, maxHp) {
  const ratio = hp / maxHp;
  if (ratio <= 0.2) return 3;
  if (ratio <= 0.5) return 2;
  return 1;
}

function attackBoss(player) {
  if (!activeBossRaid || activeBossRaid.status !== 'active') {
    return { ok: false, reason: '현재 진행 중인 보스 레이드가 없습니다.' };
  }
  if (Date.now() > activeBossRaid.endTime) {
    activeBossRaid.status = 'expired';
    return { ok: false, reason: '보스 레이드 시간이 종료되었습니다.' };
  }

  const pid = player.id || player.name || 'unknown';
  const now = Date.now();

  // Cooldown check: 30 seconds between attacks
  if (!activeBossRaid.participants[pid]) {
    activeBossRaid.participants[pid] = { damage: 0, attacks: 0, name: player.name || pid, lastAttack: 0 };
  }
  const pData = activeBossRaid.participants[pid];
  if (now - pData.lastAttack < 30000) {
    const remaining = Math.ceil((30000 - (now - pData.lastAttack)) / 1000);
    return { ok: false, reason: `쿨다운 중입니다. ${remaining}초 후 공격 가능.` };
  }

  // Calculate damage from player's party cards
  const cards = player.cards || [];
  const partyCards = cards.slice(0, 5); // top 5 cards
  let baseDmg = 0;
  for (const c of partyCards) {
    baseDmg += (c.atk || c.attack || 100);
  }
  if (baseDmg === 0) baseDmg = 100; // minimum damage for players with no cards
  // Random variance +/- 20%
  const variance = 0.8 + Math.random() * 0.4;
  const damage = Math.floor(baseDmg * variance);

  // Apply damage to boss
  activeBossRaid.hp = Math.max(0, activeBossRaid.hp - damage);

  // Update phase
  const oldPhase = activeBossRaid.phase;
  activeBossRaid.phase = getBossPhase(activeBossRaid.hp, activeBossRaid.maxHp);

  // Phase 3 enrage timer (5 minutes)
  if (activeBossRaid.phase === 3 && oldPhase !== 3) {
    activeBossRaid.enrageTime = Date.now() + 300000;
  }

  // Boss counter-attack
  let bossAtk = activeBossRaid.atk;
  if (activeBossRaid.phase >= 2) bossAtk *= 2;
  if (activeBossRaid.phase >= 3) bossAtk *= 1.5; // phase 3: x3 total
  const counterDmg = Math.floor(bossAtk * (0.8 + Math.random() * 0.4));

  // Apply counter damage to a random party card (reduce HP)
  let hitCard = null;
  if (partyCards.length > 0) {
    hitCard = partyCards[Math.floor(Math.random() * partyCards.length)];
    hitCard.hp = Math.max(0, (hitCard.hp || 1000) - counterDmg);
  }

  // Track participant stats
  pData.damage += damage;
  pData.attacks += 1;
  pData.lastAttack = now;

  const log = [];
  log.push(`${player.name || pid}이(가) 보스에게 ${damage} 데미지!`);
  if (hitCard) log.push(`보스 반격! ${hitCard.name || '카드'}에게 ${counterDmg} 데미지`);
  if (activeBossRaid.phase !== oldPhase) log.push(`⚠️ 보스 페이즈 ${activeBossRaid.phase} 돌입!`);

  // Check boss death
  if (activeBossRaid.hp <= 0) {
    activeBossRaid.status = 'defeated';
    log.push('🎉 보스 처치 성공!');
  }

  // Check enrage timeout
  if (activeBossRaid.enrageTime && Date.now() > activeBossRaid.enrageTime) {
    activeBossRaid.status = 'expired';
    log.push('💀 보스 광폭화 시간 초과! 레이드 실패...');
  }

  return {
    ok: true,
    damage,
    bossHp: activeBossRaid.hp,
    bossMaxHp: activeBossRaid.maxHp,
    bossPhase: activeBossRaid.phase,
    counterDmg,
    hitCard: hitCard ? (hitCard.name || '카드') : null,
    log,
  };
}

function getBossRanking() {
  if (!activeBossRaid) return [];
  const entries = Object.values(activeBossRaid.participants);
  entries.sort((a, b) => b.damage - a.damage);
  return entries.map((e, i) => ({ rank: i + 1, name: e.name, damage: e.damage, attacks: e.attacks }));
}

function getBossRewards() {
  if (!activeBossRaid || activeBossRaid.status !== 'defeated') return null;
  const ranking = getBossRanking();
  const rewards = {};
  for (let i = 0; i < ranking.length; i++) {
    const r = ranking[i];
    if (i === 0) {
      rewards[r.name] = { gold: 10000, diamonds: 50, card: 'myth', rank: 1 };
    } else if (i < 3) {
      rewards[r.name] = { gold: 5000, diamonds: 30, card: 'legend', rank: i + 1 };
    } else if (i < 10) {
      rewards[r.name] = { gold: 3000, diamonds: 15, card: 'epic', rank: i + 1 };
    } else {
      rewards[r.name] = { gold: 1000, diamonds: 5, rank: i + 1 };
    }
  }
  return rewards;
}

// ============================================
// Lottery System
// ============================================
function drawLottery(player, paid) {
  const pid = player.id || player.name || 'unknown';
  const today = new Date().toDateString();

  if (!player._lotteryData) {
    player._lotteryData = { freeDrawDate: null, totalDraws: 0, history: [] };
  }
  const ld = player._lotteryData;

  if (!paid) {
    // Free draw: 1 per day
    if (ld.freeDrawDate === today) {
      return { ok: false, reason: '오늘 무료 뽑기를 이미 사용했습니다.' };
    }
    ld.freeDrawDate = today;
  } else {
    // Paid draw: 5 diamonds
    if ((player.diamonds || 0) < LOTTERY_DRAW_COST) {
      return { ok: false, reason: `다이아몬드가 부족합니다. (필요: ${LOTTERY_DRAW_COST}💎)` };
    }
    player.diamonds -= LOTTERY_DRAW_COST;
  }

  // Weighted random pick
  const roll = Math.random();
  let cumulative = 0;
  let prize = LOTTERY_PRIZES[LOTTERY_PRIZES.length - 1]; // default: lowest
  for (const p of LOTTERY_PRIZES) {
    cumulative += p.chance;
    if (roll < cumulative) {
      prize = p;
      break;
    }
  }

  // Apply reward
  if (prize.type === 'gold') {
    player.gold = (player.gold || 0) + prize.value;
  }
  // Card rewards would be handled by the caller adding the card to player.cards

  ld.totalDraws += 1;
  const record = { prize: prize.name, type: prize.type, grade: prize.grade || null, value: prize.value || null, time: Date.now(), paid };
  ld.history.push(record);

  // Milestone rewards every 100 draws
  let milestoneReward = null;
  if (ld.totalDraws % 100 === 0) {
    milestoneReward = { gold: 5000, diamonds: 20, card: 'epic' };
    player.gold = (player.gold || 0) + 5000;
    player.diamonds = (player.diamonds || 0) + 20;
  }

  // Determine animation tier
  let animation = 'normal';
  if (prize.grade === 'myth') animation = 'myth_explosion';
  else if (prize.grade === 'legend') animation = 'legend_flash';
  else if (prize.grade === 'epic') animation = 'epic_glow';

  return {
    ok: true,
    prize,
    animation,
    totalDraws: ld.totalDraws,
    milestoneReward,
    paid,
    diamonds: player.diamonds,
    gold: player.gold,
  };
}

function getLotteryHistory(player) {
  if (!player._lotteryData) return [];
  return player._lotteryData.history.slice(-20); // last 20 draws
}

// ============================================
// Tournament System
// ============================================
let activeTournaments = {}; // tournamentId -> tournament state
let tournamentQueue = []; // players waiting to join

function simulateBattle(cardsA, cardsB) {
  const statSum = (cards) => {
    let atk = 0, def = 0, hp = 0;
    for (const c of cards) {
      atk += (c.atk || c.attack || 100);
      def += (c.def || c.defense || 50);
      hp += (c.hp || 500);
    }
    return { atk, def, hp };
  };

  const sA = statSum(cardsA);
  const sB = statSum(cardsB);

  // Score = ATK * 1.0 + DEF * 0.5 + HP * 0.3, with +/-20% random
  const calcScore = (s) => {
    const base = s.atk * 1.0 + s.def * 0.5 + s.hp * 0.3;
    return Math.floor(base * (0.8 + Math.random() * 0.4));
  };

  const scoreA = calcScore(sA);
  const scoreB = calcScore(sB);

  const log = [];
  log.push(`A팀 전투력: ATK=${sA.atk} DEF=${sA.def} HP=${sA.hp} -> 점수 ${scoreA}`);
  log.push(`B팀 전투력: ATK=${sB.atk} DEF=${sB.def} HP=${sB.hp} -> 점수 ${scoreB}`);

  const winner = scoreA >= scoreB ? 'A' : 'B';
  log.push(`승자: ${winner}팀!`);

  return { winner, scoreA, scoreB, log };
}

function createBotPlayer(index) {
  const botNames = ['AI전사', 'AI마법사', 'AI궁수', 'AI기사', 'AI도적', 'AI성직자', 'AI드루이드', 'AI소환사'];
  const name = botNames[index % botNames.length] + (index >= botNames.length ? `_${index}` : '');
  // Generate 3 random cards for the bot
  const cards = [];
  for (let i = 0; i < 3; i++) {
    cards.push({
      name: `${name}의 용병${i + 1}`,
      atk: 80 + Math.floor(Math.random() * 120),
      def: 40 + Math.floor(Math.random() * 80),
      hp: 300 + Math.floor(Math.random() * 500),
    });
  }
  return { id: `bot_${index}_${Date.now()}`, name, cards, isBot: true };
}

function createTournament(players) {
  // Fill with bots if fewer than 8 players
  const roster = [...players];
  let botIdx = 0;
  while (roster.length < 8) {
    roster.push(createBotPlayer(botIdx++));
  }
  // Shuffle roster
  for (let i = roster.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roster[i], roster[j]] = [roster[j], roster[i]];
  }

  const tid = `tournament_${Date.now()}`;

  // Get top 3 cards for each player
  const getTop3 = (p) => {
    const cards = p.cards || [];
    const sorted = [...cards].sort((a, b) => ((b.atk || b.attack || 0) + (b.def || b.defense || 0)) - ((a.atk || a.attack || 0) + (a.def || a.defense || 0)));
    return sorted.slice(0, 3);
  };

  // Quarterfinals (4 matches)
  const quarterfinals = [];
  for (let i = 0; i < 8; i += 2) {
    const pA = roster[i];
    const pB = roster[i + 1];
    const result = simulateBattle(getTop3(pA), getTop3(pB));
    quarterfinals.push({
      playerA: { id: pA.id, name: pA.name, isBot: !!pA.isBot },
      playerB: { id: pB.id, name: pB.name, isBot: !!pB.isBot },
      winner: result.winner === 'A' ? pA : pB,
      scoreA: result.scoreA,
      scoreB: result.scoreB,
      log: result.log,
    });
  }

  // Semifinals (2 matches)
  const semifinals = [];
  for (let i = 0; i < 4; i += 2) {
    const pA = quarterfinals[i].winner;
    const pB = quarterfinals[i + 1].winner;
    const result = simulateBattle(getTop3(pA), getTop3(pB));
    semifinals.push({
      playerA: { id: pA.id, name: pA.name, isBot: !!pA.isBot },
      playerB: { id: pB.id, name: pB.name, isBot: !!pB.isBot },
      winner: result.winner === 'A' ? pA : pB,
      scoreA: result.scoreA,
      scoreB: result.scoreB,
      log: result.log,
    });
  }

  // Final
  const pA = semifinals[0].winner;
  const pB = semifinals[1].winner;
  const finalResult = simulateBattle(getTop3(pA), getTop3(pB));
  const champion = finalResult.winner === 'A' ? pA : pB;

  const finalMatch = {
    playerA: { id: pA.id, name: pA.name, isBot: !!pA.isBot },
    playerB: { id: pB.id, name: pB.name, isBot: !!pB.isBot },
    winner: { id: champion.id, name: champion.name, isBot: !!champion.isBot },
    scoreA: finalResult.scoreA,
    scoreB: finalResult.scoreB,
    log: finalResult.log,
  };

  const tournament = {
    id: tid,
    status: 'completed',
    roster: roster.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })),
    quarterfinals,
    semifinals,
    final: finalMatch,
    champion: { id: champion.id, name: champion.name, isBot: !!champion.isBot },
    rewards: {
      champion: { gold: 20000, diamonds: 100, card: 'tournament_champion' },
      finalist: { gold: 10000, diamonds: 50, card: 'epic' },
      semifinalist: { gold: 5000, diamonds: 25, card: 'rare' },
      participant: { gold: 2000, diamonds: 10 },
    },
    createdAt: Date.now(),
  };

  activeTournaments[tid] = tournament;
  return tournament;
}

function joinTournamentQueue(player) {
  const pid = player.id || player.name;
  if (tournamentQueue.find(p => (p.id || p.name) === pid)) {
    return { ok: false, reason: '이미 대기열에 참가 중입니다.' };
  }
  tournamentQueue.push(player);

  // If 8 players gathered, start tournament
  if (tournamentQueue.length >= 8) {
    const players = tournamentQueue.splice(0, 8);
    const tournament = createTournament(players);
    return { ok: true, started: true, tournament };
  }

  return { ok: true, started: false, queueSize: tournamentQueue.length, needed: 8 - tournamentQueue.length };
}

// ============================================
// Season Event Chain State
// ============================================
let activeSeasonEvent = null;
let seasonEventProgress = {}; // { serverKills: 0, trades: 0, pvpBattles: 0, bossDefeat: false }

function initSeasonEvent(chainIndex) {
  const chain = SEASON_EVENT_CHAINS[chainIndex % SEASON_EVENT_CHAINS.length];
  activeSeasonEvent = {
    ...chain,
    currentStage: 0,
    startTime: Date.now(),
  };
  seasonEventProgress = { serverKills: 0, trades: 0, pvpBattles: 0, bossDefeat: false };
  return activeSeasonEvent;
}

function updateSeasonProgress(type, amount) {
  if (!activeSeasonEvent) return null;
  if (seasonEventProgress[type] !== undefined) {
    if (typeof seasonEventProgress[type] === 'boolean') {
      seasonEventProgress[type] = amount;
    } else {
      seasonEventProgress[type] += (amount || 1);
    }
  }

  // Check stage completion
  const stage = activeSeasonEvent.stages[activeSeasonEvent.currentStage];
  if (!stage) return { event: activeSeasonEvent, progress: seasonEventProgress, completed: true };

  const goalKey = Object.keys(stage.goal)[0];
  const goalVal = stage.goal[goalKey];
  const current = seasonEventProgress[goalKey] || 0;

  let stageCleared = false;
  if (typeof goalVal === 'boolean') {
    stageCleared = current === goalVal;
  } else {
    stageCleared = current >= goalVal;
  }

  if (stageCleared) {
    activeSeasonEvent.currentStage += 1;
  }

  return {
    event: activeSeasonEvent,
    progress: seasonEventProgress,
    stageName: stage.name,
    stageCleared,
    completed: activeSeasonEvent.currentStage >= activeSeasonEvent.stages.length,
  };
}

function getSeasonEventStatus() {
  if (!activeSeasonEvent) return { active: false };
  const stage = activeSeasonEvent.stages[activeSeasonEvent.currentStage];
  return {
    active: true,
    event: activeSeasonEvent,
    progress: seasonEventProgress,
    currentStage: stage || null,
    stageIndex: activeSeasonEvent.currentStage,
    totalStages: activeSeasonEvent.stages.length,
    completed: activeSeasonEvent.currentStage >= activeSeasonEvent.stages.length,
  };
}

// ============================================
// Original helper functions
// ============================================
function generateDailyQuests() {
  const pool = [...DAILY_QUESTS];
  const quests = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    quests.push({ ...pool.splice(idx, 1)[0], progress: 0 });
  }
  return quests;
}

function checkAttendance(player) {
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (player._lastAttendance === today) return { ok: false, reason: '이미 출석 완료' };

  player._lastAttendance = today;
  player.attendanceDays = (player.attendanceDays || 0) + 1;
  const reward = ATTENDANCE_REWARDS.filter(a => player.attendanceDays >= a.day).pop();
  if (reward) {
    player.gold = (player.gold || 0) + (reward.reward.gold || 0);
    player.diamonds = (player.diamonds || 0) + (reward.reward.diamonds || 0);
  }
  return { ok: true, day: player.attendanceDays, reward };
}

// ============================================
// Socket event registration
// ============================================
function register(io, socket, player) {
  // --- Daily Quests ---
  socket.on('daily_quests_request', () => {
    if (!player._dailyQuests || player._dailyQuestDate !== new Date().toDateString()) {
      player._dailyQuests = generateDailyQuests();
      player._dailyQuestDate = new Date().toDateString();
    }
    socket.emit('daily_quests', { quests: player._dailyQuests, attendance: player.attendanceDays || 0 });
  });

  // --- Attendance ---
  socket.on('attendance_check', () => {
    const result = checkAttendance(player);
    socket.emit('attendance_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // --- Weekly Event ---
  socket.on('weekly_event_request', () => {
    const weekNum = Math.floor(Date.now() / (7 * 86400000));
    const event = WEEKLY_EVENTS[weekNum % WEEKLY_EVENTS.length];
    socket.emit('weekly_event', event);
  });

  // --- Special Events (overview) ---
  socket.on('special_events_request', () => {
    socket.emit('special_events', SPECIAL_EVENTS);
  });

  // --- Boss Raid ---
  socket.on('boss_raid_info', () => {
    if (!activeBossRaid || activeBossRaid.status !== 'active') {
      socket.emit('boss_raid_info', { active: false, lastStatus: activeBossRaid ? activeBossRaid.status : 'none' });
    } else {
      socket.emit('boss_raid_info', {
        active: true,
        id: activeBossRaid.id,
        name: activeBossRaid.name,
        hp: activeBossRaid.hp,
        maxHp: activeBossRaid.maxHp,
        phase: activeBossRaid.phase,
        participantCount: Object.keys(activeBossRaid.participants).length,
        timeLeft: Math.max(0, activeBossRaid.endTime - Date.now()),
        enrageTime: activeBossRaid.enrageTime ? Math.max(0, activeBossRaid.enrageTime - Date.now()) : null,
      });
    }
  });

  socket.on('boss_raid_attack', () => {
    const result = attackBoss(player);
    socket.emit('boss_raid_attack_result', result);
    if (result.ok) {
      // Broadcast boss HP update to all
      io.emit('boss_raid_update', {
        hp: activeBossRaid.hp,
        maxHp: activeBossRaid.maxHp,
        phase: activeBossRaid.phase,
        status: activeBossRaid.status,
      });
      // If boss defeated, broadcast rewards
      if (activeBossRaid.status === 'defeated') {
        const rewards = getBossRewards();
        io.emit('boss_raid_complete', { rewards, ranking: getBossRanking() });
      }
    }
  });

  socket.on('boss_raid_ranking', () => {
    socket.emit('boss_raid_ranking', { ranking: getBossRanking() });
  });

  // --- Lottery ---
  socket.on('lottery_draw', (data) => {
    const paid = data && data.paid;
    const result = drawLottery(player, paid);
    socket.emit('lottery_result', result);
    if (result.ok && result.prize.type === 'card' && result.prize.grade) {
      // Notify about card reward (actual card creation handled elsewhere)
      socket.emit('lottery_card_reward', { grade: result.prize.grade, name: result.prize.name });
    }
  });

  socket.on('lottery_history', () => {
    socket.emit('lottery_history', { history: getLotteryHistory(player) });
  });

  // --- Tournament ---
  socket.on('tournament_join', () => {
    const result = joinTournamentQueue(player);
    socket.emit('tournament_join_result', result);
    if (result.started && result.tournament) {
      // Notify all tournament participants
      const t = result.tournament;
      for (const p of t.roster) {
        if (!p.isBot) {
          io.emit('tournament_result', {
            tournamentId: t.id,
            champion: t.champion,
            bracket: { quarterfinals: t.quarterfinals, semifinals: t.semifinals, final: t.final },
            rewards: t.rewards,
          });
        }
      }
    }
  });

  socket.on('tournament_status', () => {
    const lastTournament = Object.values(activeTournaments).pop();
    socket.emit('tournament_status', {
      queueSize: tournamentQueue.length,
      needed: Math.max(0, 8 - tournamentQueue.length),
      lastTournament: lastTournament ? {
        id: lastTournament.id,
        champion: lastTournament.champion,
        createdAt: lastTournament.createdAt,
      } : null,
    });
  });

  // --- Season Event ---
  socket.on('season_event_status', () => {
    socket.emit('season_event_status', getSeasonEventStatus());
  });
}

// ============================================
// Exports
// ============================================
module.exports = {
  // Data
  DAILY_QUESTS,
  WEEKLY_EVENTS,
  SPECIAL_EVENTS,
  ATTENDANCE_REWARDS,
  LOTTERY_PRIZES,
  SEASON_EVENT_CHAINS,
  // Original functions
  generateDailyQuests,
  checkAttendance,
  // Boss Raid
  startBossRaid,
  attackBoss,
  getBossRewards,
  getBossRanking,
  // Lottery
  drawLottery,
  getLotteryHistory,
  // Tournament
  createTournament,
  simulateBattle,
  joinTournamentQueue,
  // Season Events
  initSeasonEvent,
  updateSeasonProgress,
  getSeasonEventStatus,
  // Socket registration
  register,
};
