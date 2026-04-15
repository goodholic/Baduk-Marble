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

// ============================================
// 시즌 패스 (무료 + 프리미엄) — 1~50 레벨, 2레벨 간격 보상
// ============================================
const SEASON_PASS = {
  free: [
    { level: 1, reward: { gold: 500 } },
    { level: 2, reward: { gold: 800 } },
    { level: 4, reward: { gold: 1200 } },
    { level: 6, reward: { gold: 1500, diamonds: 3 } },
    { level: 8, reward: { gold: 2000, diamonds: 5 } },
    { level: 10, reward: { gold: 3000, card: 'normal' } },
    { level: 12, reward: { gold: 3500 } },
    { level: 14, reward: { gold: 4000, diamonds: 8 } },
    { level: 16, reward: { gold: 5000 } },
    { level: 18, reward: { gold: 6000, diamonds: 10 } },
    { level: 20, reward: { gold: 8000, card: 'rare' } },
    { level: 22, reward: { gold: 9000 } },
    { level: 24, reward: { gold: 10000, diamonds: 15 } },
    { level: 26, reward: { gold: 12000 } },
    { level: 28, reward: { gold: 14000, diamonds: 18 } },
    { level: 30, reward: { gold: 16000, card: 'rare', diamonds: 20 } },
    { level: 32, reward: { gold: 18000 } },
    { level: 34, reward: { gold: 20000, diamonds: 22 } },
    { level: 36, reward: { gold: 22000 } },
    { level: 38, reward: { gold: 25000, diamonds: 25 } },
    { level: 40, reward: { gold: 28000, card: 'epic' } },
    { level: 42, reward: { gold: 30000, diamonds: 30 } },
    { level: 44, reward: { gold: 35000 } },
    { level: 46, reward: { gold: 40000, diamonds: 40 } },
    { level: 48, reward: { gold: 45000, diamonds: 45 } },
    { level: 50, reward: { gold: 50000, diamonds: 50, card: 'epic', title: '시즌 완주자' } },
  ],
  premium: [
    { level: 1, reward: { gold: 1000, diamonds: 5 } },
    { level: 2, reward: { gold: 1500, diamonds: 5 } },
    { level: 4, reward: { gold: 2500, diamonds: 8 } },
    { level: 6, reward: { gold: 3000, diamonds: 10, card: 'normal' } },
    { level: 8, reward: { gold: 4000, diamonds: 12 } },
    { level: 10, reward: { gold: 6000, diamonds: 15, card: 'rare' } },
    { level: 12, reward: { gold: 7000, diamonds: 18 } },
    { level: 14, reward: { gold: 8000, diamonds: 20, card: 'rare' } },
    { level: 16, reward: { gold: 10000, diamonds: 22 } },
    { level: 18, reward: { gold: 12000, diamonds: 25, card: 'epic' } },
    { level: 20, reward: { gold: 15000, diamonds: 30, card: 'epic' } },
    { level: 22, reward: { gold: 18000, diamonds: 35 } },
    { level: 24, reward: { gold: 20000, diamonds: 40, card: 'epic' } },
    { level: 26, reward: { gold: 22000, diamonds: 45 } },
    { level: 28, reward: { gold: 25000, diamonds: 50 } },
    { level: 30, reward: { gold: 30000, diamonds: 60, card: 'legend' } },
    { level: 32, reward: { gold: 35000, diamonds: 65 } },
    { level: 34, reward: { gold: 38000, diamonds: 70, card: 'legend' } },
    { level: 36, reward: { gold: 42000, diamonds: 80 } },
    { level: 38, reward: { gold: 48000, diamonds: 90 } },
    { level: 40, reward: { gold: 55000, diamonds: 100, card: 'legend' } },
    { level: 42, reward: { gold: 60000, diamonds: 110 } },
    { level: 44, reward: { gold: 65000, diamonds: 120, card: 'legend' } },
    { level: 46, reward: { gold: 75000, diamonds: 140 } },
    { level: 48, reward: { gold: 85000, diamonds: 170 } },
    { level: 50, reward: { gold: 100000, diamonds: 200, card: 'myth', title: '시즌 엘리트', frame: 'season_premium' } },
  ],
  premiumCost: 500, // 다이아
};

// ============================================
// 시즌 챌린지 — 주간 로테이션
// ============================================
const SEASON_CHALLENGES = [
  { id: 'sc_killer', name: '학살의 주간', icon: '⚔️', goal: { ioKills: 50 }, reward: { seasonPoints: 500, gold: 10000 }, desc: 'IO 50킬' },
  { id: 'sc_trader', name: '무역 축제', icon: '💰', goal: { trades: 20 }, reward: { seasonPoints: 300, gold: 8000 }, desc: '무역 20회' },
  { id: 'sc_siege', name: '공성의 주간', icon: '🏰', goal: { siegeWins: 10 }, reward: { seasonPoints: 400, diamonds: 15 }, desc: '공성 10승' },
  { id: 'sc_tower', name: '탑 도전', icon: '🗼', goal: { towerFloors: 20 }, reward: { seasonPoints: 400, diamonds: 20 }, desc: '탑 20층 클리어' },
  { id: 'sc_pvp', name: 'PvP 대전쟁', icon: '⚔️🏆', goal: { pvpWins: 15 }, reward: { seasonPoints: 500, gold: 15000 }, desc: 'PvP 15승' },
  { id: 'sc_summon', name: '소환 축제', icon: '📜', goal: { summons: 30 }, reward: { seasonPoints: 300, diamonds: 10 }, desc: '30회 소환' },
  { id: 'sc_expedition', name: '대탐험', icon: '🗺️', goal: { expeditions: 15 }, reward: { seasonPoints: 350, gold: 12000 }, desc: '원정 15회' },
  { id: 'sc_guild', name: '길드 활동', icon: '👥', goal: { guildDonations: 10 }, reward: { seasonPoints: 250, gold: 5000 }, desc: '길드 기부 10회' },
];

function _getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now - start) / (7 * 86400000));
}

function getWeeklyChallenge() {
  const week = _getWeekNumber();
  const count = SEASON_CHALLENGES.length;
  const indices = [];
  // Pick 3 non-repeating challenges based on week rotation
  for (let i = 0; i < 3; i++) {
    indices.push((week * 3 + i) % count);
  }
  // Deduplicate in case count < 3
  const unique = [...new Set(indices)];
  return unique.map(idx => ({ ...SEASON_CHALLENGES[idx], weekNumber: week }));
}

function checkChallengeProgress(player, challengeId) {
  const challenge = SEASON_CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return { ok: false, reason: '존재하지 않는 챌린지' };

  const active = getWeeklyChallenge();
  if (!active.find(c => c.id === challengeId)) return { ok: false, reason: '이번 주 활성 챌린지가 아님' };

  const progress = player.challengeProgress || {};
  const goalKey = Object.keys(challenge.goal)[0];
  const goalValue = challenge.goal[goalKey];
  const current = progress[challengeId] || 0;
  const done = current >= goalValue;

  return {
    ok: true,
    challengeId,
    name: challenge.name,
    current,
    goal: goalValue,
    done,
    percent: Math.min(100, Math.floor((current / goalValue) * 100)),
    reward: done ? challenge.reward : null,
  };
}

function claimChallengeReward(player, challengeId) {
  const status = checkChallengeProgress(player, challengeId);
  if (!status.ok) return status;
  if (!status.done) return { ok: false, reason: '아직 완료되지 않음' };

  const claimed = player.challengeClaimed || {};
  const week = _getWeekNumber();
  const key = `${challengeId}_w${week}`;
  if (claimed[key]) return { ok: false, reason: '이미 보상 수령함' };

  const challenge = SEASON_CHALLENGES.find(c => c.id === challengeId);
  const reward = challenge.reward;
  if (reward.gold) player.gold = (player.gold || 0) + reward.gold;
  if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
  if (reward.seasonPoints) {
    player.seasonPoints = (player.seasonPoints || 0) + reward.seasonPoints;
    player.seasonLevel = Math.floor(player.seasonPoints / 200) + 1;
  }

  claimed[key] = true;
  player.challengeClaimed = claimed;
  return { ok: true, reward, msg: `${challenge.name} 보상 수령!` };
}

// ============================================
// 일일 미션 보드
// ============================================
const DAILY_MISSIONS = [
  { id: 'dm_io_join', name: 'IO 출전', icon: '⚔️', goal: { ioJoins: 1 }, reward: { seasonPoints: 50, gold: 2000 } },
  { id: 'dm_pvp_3', name: 'PvP 3판', icon: '⚔️🏅', goal: { pvpBattles: 3 }, reward: { seasonPoints: 40, gold: 1500 } },
  { id: 'dm_action_5', name: '행동 카드 5회', icon: '🎴', goal: { actions: 5 }, reward: { seasonPoints: 30, gold: 1000 } },
  { id: 'dm_upgrade_3', name: '카드 강화 3회', icon: '⬆️', goal: { upgrades: 3 }, reward: { seasonPoints: 30, gold: 1000 } },
  { id: 'dm_expedition', name: '원정 1회', icon: '🗺️', goal: { expeditions: 1 }, reward: { seasonPoints: 35, gold: 1200 } },
  { id: 'dm_trade', name: '무역 1회', icon: '💰', goal: { trades: 1 }, reward: { seasonPoints: 25, gold: 800 } },
  { id: 'dm_tower', name: '탑 도전 1회', icon: '🗼', goal: { towerAttempts: 1 }, reward: { seasonPoints: 35, gold: 1200 } },
  { id: 'dm_summon', name: '소환 1회', icon: '📜', goal: { summons: 1 }, reward: { seasonPoints: 40, gold: 1500 } },
  { id: 'dm_farm', name: '농장 수집', icon: '🌿', goal: { farmCollects: 1 }, reward: { seasonPoints: 20, gold: 500 } },
  { id: 'dm_enchant', name: '인챈트 1회', icon: '✨', goal: { enchants: 1 }, reward: { seasonPoints: 30, gold: 1000 } },
  { id: 'dm_fortress', name: '기지 건설/수집', icon: '🏰', goal: { fortressActions: 1 }, reward: { seasonPoints: 25, gold: 800 } },
  { id: 'dm_all_clear', name: '미션 전체 클리어!', icon: '🌟', goal: { allDailyDone: true }, reward: { seasonPoints: 100, diamonds: 10 } },
];

function _getDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function generateDailyMissions(player) {
  const dayKey = _getDayKey();
  // Return cached if already generated today
  if (player._dailyMissionDay === dayKey && player._dailyMissions) {
    return player._dailyMissions;
  }

  // Pick 5 random missions (excluding all_clear bonus)
  const pool = DAILY_MISSIONS.filter(m => m.id !== 'dm_all_clear');
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 5);
  // Always include all_clear as the bonus mission
  const allClear = DAILY_MISSIONS.find(m => m.id === 'dm_all_clear');
  picked.push(allClear);

  player._dailyMissionDay = dayKey;
  player._dailyMissions = picked.map(m => m.id);
  player._dailyProgress = {};
  player._dailyClaimed = {};
  return player._dailyMissions;
}

function getDailyMissionStatus(player) {
  const missionIds = generateDailyMissions(player);
  const progress = player._dailyProgress || {};
  const claimed = player._dailyClaimed || {};

  return missionIds.map(id => {
    const mission = DAILY_MISSIONS.find(m => m.id === id);
    if (!mission) return null;

    if (id === 'dm_all_clear') {
      // Check if all other daily missions are done
      const others = missionIds.filter(mid => mid !== 'dm_all_clear');
      const allDone = others.every(mid => {
        const m = DAILY_MISSIONS.find(dm => dm.id === mid);
        const goalKey = Object.keys(m.goal)[0];
        return (progress[mid] || 0) >= m.goal[goalKey];
      });
      return { ...mission, current: allDone ? 1 : 0, goal: 1, done: allDone, claimed: !!claimed[id] };
    }

    const goalKey = Object.keys(mission.goal)[0];
    const goalVal = mission.goal[goalKey];
    const current = progress[id] || 0;
    const done = current >= goalVal;
    return { ...mission, current, goal: goalVal, done, claimed: !!claimed[id] };
  }).filter(Boolean);
}

function claimDailyMissionReward(player, missionId) {
  const missionIds = generateDailyMissions(player);
  if (!missionIds.includes(missionId)) return { ok: false, reason: '오늘의 미션이 아님' };

  const status = getDailyMissionStatus(player);
  const entry = status.find(s => s.id === missionId);
  if (!entry) return { ok: false, reason: '미션 없음' };
  if (!entry.done) return { ok: false, reason: '아직 완료되지 않음' };
  if (entry.claimed) return { ok: false, reason: '이미 수령함' };

  const reward = entry.reward;
  if (reward.gold) player.gold = (player.gold || 0) + reward.gold;
  if (reward.diamonds) player.diamonds = (player.diamonds || 0) + reward.diamonds;
  if (reward.seasonPoints) {
    player.seasonPoints = (player.seasonPoints || 0) + reward.seasonPoints;
    player.seasonLevel = Math.floor(player.seasonPoints / 200) + 1;
  }

  player._dailyClaimed = player._dailyClaimed || {};
  player._dailyClaimed[missionId] = true;
  return { ok: true, reward, msg: `${entry.name} 보상 수령!` };
}

// ============================================
// 시즌 상점
// ============================================
const SEASON_SHOP = [
  { id: 'ss_card_epic', name: '시즌 한정 에픽 카드', icon: '🃏💎', cost: 2000, stock: 3, desc: '시즌 전용 에픽 카드' },
  { id: 'ss_card_legend', name: '시즌 한정 전설 카드', icon: '🃏🌟', cost: 5000, stock: 1, desc: '시즌 전용 전설 카드' },
  { id: 'ss_stone', name: '각성석', icon: '🌟', cost: 3000, stock: 2, desc: '각성에 필요' },
  { id: 'ss_enchant', name: '전설 인챈트 주문서', icon: '📜✨', cost: 2500, stock: 3, desc: '전설 인챈트 100% 성공' },
  { id: 'ss_frame', name: '시즌 프레임', icon: '🖼️', cost: 8000, stock: 1, desc: '이번 시즌 한정 프레임' },
  { id: 'ss_title', name: '시즌 칭호', icon: '🏷️', cost: 5000, stock: 1, desc: '시즌 한정 칭호' },
  { id: 'ss_gold_box', name: '대량 골드 상자', icon: '📦💰', cost: 1000, stock: 10, desc: '30000G' },
  { id: 'ss_diamond_box', name: '다이아 상자', icon: '📦💎', cost: 1500, stock: 5, desc: '50💎' },
];

function getSeasonShopStatus(player) {
  const purchased = player._seasonShopPurchased || {};
  return SEASON_SHOP.map(item => ({
    ...item,
    remaining: item.stock - (purchased[item.id] || 0),
    soldOut: (purchased[item.id] || 0) >= item.stock,
  }));
}

function buySeasonShopItem(player, itemId) {
  const item = SEASON_SHOP.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '존재하지 않는 아이템' };

  const purchased = player._seasonShopPurchased || {};
  const bought = purchased[itemId] || 0;
  if (bought >= item.stock) return { ok: false, reason: '품절' };

  const currency = player.seasonPoints || 0;
  if (currency < item.cost) return { ok: false, reason: `시즌 포인트 ${item.cost} 필요 (보유: ${currency})` };

  player.seasonPoints -= item.cost;
  player.seasonLevel = Math.floor(player.seasonPoints / 200) + 1;
  purchased[itemId] = bought + 1;
  player._seasonShopPurchased = purchased;

  // Grant item rewards
  const rewards = {};
  switch (itemId) {
    case 'ss_card_epic':
      rewards.card = 'epic';
      break;
    case 'ss_card_legend':
      rewards.card = 'legend';
      break;
    case 'ss_stone':
      rewards.item = 'awakening_stone';
      break;
    case 'ss_enchant':
      rewards.item = 'legend_enchant_scroll';
      break;
    case 'ss_frame':
      player.frames = player.frames || [];
      player.frames.push('season_frame');
      rewards.frame = 'season_frame';
      break;
    case 'ss_title':
      player.titles = player.titles || [];
      player.titles.push('시즌 한정 칭호');
      rewards.title = '시즌 한정 칭호';
      break;
    case 'ss_gold_box':
      player.gold = (player.gold || 0) + 30000;
      rewards.gold = 30000;
      break;
    case 'ss_diamond_box':
      player.diamonds = (player.diamonds || 0) + 50;
      rewards.diamonds = 50;
      break;
  }

  return { ok: true, item: item.name, cost: item.cost, remaining: item.stock - purchased[itemId], rewards, msg: `${item.name} 구매 완료!` };
}

// ============================================
// 시즌 랭킹 리더보드
// ============================================
const LEADERBOARD_REWARDS = [
  { rank: 1, reward: { gold: 500000, diamonds: 2000, card: 'myth', title: '시즌 챔피언', frame: 'season_champion' } },
  { rank: 2, reward: { gold: 300000, diamonds: 1500, card: 'myth', title: '시즌 준우승' } },
  { rank: 3, reward: { gold: 200000, diamonds: 1000, card: 'legend', title: '시즌 3위' } },
  { rank: 4, reward: { gold: 150000, diamonds: 700, card: 'legend' } },
  { rank: 5, reward: { gold: 120000, diamonds: 500, card: 'legend' } },
  { rank: 6, reward: { gold: 100000, diamonds: 400, card: 'epic' } },
  { rank: 7, reward: { gold: 80000, diamonds: 350, card: 'epic' } },
  { rank: 8, reward: { gold: 70000, diamonds: 300, card: 'epic' } },
  { rank: 9, reward: { gold: 60000, diamonds: 250, card: 'epic' } },
  { rank: 10, reward: { gold: 50000, diamonds: 200, card: 'epic' } },
];

function getSeasonLeaderboard(allPlayers) {
  const sorted = [...allPlayers]
    .filter(p => (p.seasonPoints || 0) > 0)
    .sort((a, b) => (b.seasonPoints || 0) - (a.seasonPoints || 0))
    .slice(0, 50);

  return sorted.map((p, idx) => {
    const rank = [...SEASON_RANKS].reverse().find(r => (p.seasonPoints || 0) >= r.minPoints) || SEASON_RANKS[0];
    const leaderReward = LEADERBOARD_REWARDS.find(lr => lr.rank === idx + 1);
    return {
      position: idx + 1,
      name: p.name || p.id || '???',
      seasonPoints: p.seasonPoints || 0,
      seasonLevel: p.seasonLevel || 1,
      rank: rank.name,
      rankIcon: rank.icon,
      endReward: leaderReward ? leaderReward.reward : null,
    };
  });
}

// ============================================
// 기본 함수
// ============================================
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

// ============================================
// 소켓 등록
// ============================================
function register(io, socket, player, allPlayers) {
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

  // --- 시즌 챌린지 ---
  socket.on('season_challenges', () => {
    socket.emit('season_challenges', { challenges: getWeeklyChallenge() });
  });

  socket.on('season_challenge_progress', (data) => {
    const result = checkChallengeProgress(player, data.challengeId);
    socket.emit('season_challenge_progress', result);
  });

  socket.on('season_challenge_claim', (data) => {
    const result = claimChallengeReward(player, data.challengeId);
    socket.emit('season_challenge_claim', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // --- 일일 미션 ---
  socket.on('season_daily_missions', () => {
    socket.emit('season_daily_missions', { missions: getDailyMissionStatus(player) });
  });

  socket.on('season_daily_progress', (data) => {
    const status = getDailyMissionStatus(player);
    socket.emit('season_daily_progress', { missions: status });
  });

  socket.on('season_daily_claim', (data) => {
    const result = claimDailyMissionReward(player, data.missionId);
    socket.emit('season_daily_claim', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // --- 시즌 상점 ---
  socket.on('season_shop_browse', () => {
    socket.emit('season_shop_browse', { items: getSeasonShopStatus(player), currency: player.seasonPoints || 0 });
  });

  socket.on('season_shop_buy', (data) => {
    const result = buySeasonShopItem(player, data.itemId);
    socket.emit('season_shop_buy', result);
    if (result.ok) {
      socket.emit('season_shop_browse', { items: getSeasonShopStatus(player), currency: player.seasonPoints || 0 });
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // --- 시즌 리더보드 ---
  socket.on('season_leaderboard', () => {
    const board = getSeasonLeaderboard(allPlayers || []);
    socket.emit('season_leaderboard', { leaderboard: board });
  });
}

module.exports = {
  SEASON_POINTS,
  SEASON_RANKS,
  SEASON_PASS,
  SEASON_CHALLENGES,
  DAILY_MISSIONS,
  SEASON_SHOP,
  LEADERBOARD_REWARDS,
  addSeasonPoints,
  getSeasonStatus,
  buyPremiumPass,
  getWeeklyChallenge,
  checkChallengeProgress,
  claimChallengeReward,
  generateDailyMissions,
  getDailyMissionStatus,
  claimDailyMissionReward,
  getSeasonShopStatus,
  buySeasonShopItem,
  getSeasonLeaderboard,
  register,
};
