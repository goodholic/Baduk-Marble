// ============================================
// 플레이어 프로필 & 전적 — 종합 통계 + 명함
// ============================================

// 파워 스코어 계산 (모든 시스템 종합)
function calculatePowerScore(player) {
  let score = 0;
  // 카드 파워
  const cards = player.cards || [];
  score += cards.reduce((s, c) => s + (c.atk||0) + (c.def||0) + Math.floor((c.hp||0)*0.1), 0);
  // 장비 보너스
  cards.forEach(c => { if (c.equipment) Object.values(c.equipment).forEach(e => { if (e && e.stat) score += Object.values(e.stat).reduce((a,b) => a + (typeof b === 'number' ? b : 0), 0); }); });
  // 각성 보너스
  score += cards.filter(c => c.awakened).length * 500;
  // 초월 보너스
  score += cards.reduce((s, c) => s + (c.transcendLevel||0) * 300, 0);
  // 기지 레벨
  score += (player.fortress?.level||0) * 200;
  // PvP 점수
  score += (player.pvpPoints||0);
  // 탑 클리어
  score += (player.towerFloor||0) * 50;
  // 시즌 점수
  score += Math.floor((player.seasonPoints||0) * 0.1);
  // 환생 보너스
  score += (player.prestigeLevel||0) * 1000;
  // 펫 보너스
  score += (player.pets||[]).reduce((s, p) => s + (p.level||1) * 20, 0);
  // 하우징 점수
  score += (player._housing?.totalScore||0);

  return Math.floor(score);
}

// 전적 통계
function getStats(player) {
  return {
    // 전투
    ioJoins: player.totalIoJoins || 0,
    ioWins: player.totalIoWins || 0,
    ioKills: player.totalIoKills || 0,
    ioBestRank: player.bestIoRank || 999,
    pvpWins: player.totalPvpWins || 0,
    pvpLosses: player.totalPvpLosses || 0,
    pvpStreak: player.bestPvpStreak || 0,
    pkKills: player.totalPkKills || 0,
    pkDeaths: player.totalPkDeaths || 0,

    // 성장
    cardsOwned: (player.cards||[]).length,
    cardMaxLevel: Math.max(0, ...(player.cards||[]).map(c => c.level||1)),
    awakenedCards: (player.cards||[]).filter(c => c.awakened).length,
    transcendedCards: (player.cards||[]).filter(c => (c.transcendLevel||0) > 0).length,

    // 경제
    totalGoldEarned: player.totalGoldEarned || 0,
    totalDiamondsEarned: player.totalDiamondsEarned || 0,
    tradesCompleted: player.totalTrades || 0,

    // PvE
    towerFloor: player.towerFloor || 0,
    towerInfinite: player.infiniteTowerFloor || 0,
    abyssFloor: player._endgameState?.abyssBestFloor || 0,
    expeditions: player.totalExpeditions || 0,
    roguelikeBest: player._roguelikeRun?.bestRecord?.roomsCleared || 0,

    // 소셜
    guildName: player.guild?.name || null,
    friends: (player.friends||[]).length,
    fortressLevel: player.fortress?.level || 0,

    // 수집
    achievements: (player.achievements||[]).length,
    titles: (player.titles||[]).length,
    skins: (player.skins||[]).length,
    codexCount: new Set((player.cards||[]).map(c => (c.name||'').replace(/[★+\d]+$/, '').trim())).size,

    // 메타
    prestigeLevel: player.prestigeLevel || 0,
    pets: (player.pets||[]).length,
    recipes: (player.discoveredRecipes||[]).length,
    campaignProgress: player._campaign?.completed?.length || 0,

    // 플레이 시간
    accountAge: player._accountCreated ? Math.floor((Date.now() - player._accountCreated) / 86400000) : 0,
    loginDays: player.attendanceDays || 0,
  };
}

// 프로필 카드 (명함)
function getProfileCard(player) {
  const stats = getStats(player);
  const power = calculatePowerScore(player);

  // 대표 칭호
  const mainTitle = player.equippedTitle || (player.titles||[])[0] || '모험가';

  // 대표 카드 (가장 강한 카드)
  const topCard = (player.cards||[]).sort((a,b) => ((b.atk||0)+(b.def||0)+(b.hp||0)) - ((a.atk||0)+(a.def||0)+(a.hp||0)))[0] || null;

  // 대표 펫
  const topPet = (player.pets||[]).sort((a,b) => (b.level||1) - (a.level||1))[0] || null;

  // 프로필 프레임 (스킨)
  const frame = player._profile?.frame || 'default';

  // 명함 메시지
  const message = player._profile?.message || '';

  return {
    name: player.displayName || '???',
    title: mainTitle,
    power,
    level: player.level || 1,
    prestigeLevel: player.prestigeLevel || 0,
    karma: player.karma || 0,
    frame,
    message,
    topCard: topCard ? { name: topCard.name, icon: topCard.icon, grade: topCard.grade, atk: topCard.atk } : null,
    topPet: topPet ? { name: topPet.name, level: topPet.level } : null,
    pvpRank: player.pvpRank || 'bronze',
    seasonRank: player.seasonRank || 'iron',
    guild: player.guild?.name || null,
    highlights: [
      stats.ioWins > 0 ? `IO ${stats.ioWins}승` : null,
      stats.towerFloor > 0 ? `탑 ${stats.towerFloor}층` : null,
      stats.awakenedCards > 0 ? `각성 ${stats.awakenedCards}종` : null,
      stats.achievements > 10 ? `업적 ${stats.achievements}개` : null,
      stats.prestigeLevel > 0 ? `환생 ${stats.prestigeLevel}회` : null,
    ].filter(Boolean).slice(0, 3),
  };
}

// 프로필 설정
function setProfileOptions(player, options) {
  player._profile = player._profile || {};
  if (options.message !== undefined) player._profile.message = (options.message||'').slice(0, 50);
  if (options.frame !== undefined) player._profile.frame = options.frame;
  if (options.showcaseCards) player._profile.showcaseCards = options.showcaseCards.slice(0, 3);
  return { ok: true };
}

// 다른 플레이어 프로필 조회
function viewProfile(targetPlayer) {
  if (!targetPlayer) return null;
  return getProfileCard(targetPlayer);
}

// 파워 랭킹
function getPowerRanking(allPlayers) {
  return Object.values(allPlayers)
    .filter(p => p && p.displayName)
    .map(p => ({ name: p.displayName, power: calculatePowerScore(p), title: p.equippedTitle }))
    .sort((a,b) => b.power - a.power)
    .slice(0, 20)
    .map((e, i) => ({ rank: i+1, ...e }));
}

function register(io, socket, player, allPlayers) {
  socket.on('profile_my', () => {
    socket.emit('profile_my', { card: getProfileCard(player), stats: getStats(player) });
  });
  socket.on('profile_set', (data) => {
    const result = setProfileOptions(player, data);
    socket.emit('profile_set_result', result);
  });
  socket.on('profile_view', (data) => {
    const target = Object.values(allPlayers||{}).find(p => p.displayName === data.name);
    socket.emit('profile_view', viewProfile(target));
  });
  socket.on('profile_power_ranking', () => {
    socket.emit('profile_power_ranking', getPowerRanking(allPlayers||{}));
  });
}

module.exports = { calculatePowerScore, getStats, getProfileCard, setProfileOptions, viewProfile, getPowerRanking, register };
