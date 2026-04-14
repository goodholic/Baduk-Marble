// v5.2 — IO 리그전 시스템
// 시즌 리그, 승급/강등, 챔피언 보상, 리그별 특수 규칙

const SEASON_DURATION = 7 * 24 * 3600; // 1주일 시즌

// 리그 등급 (최하→최상)
const LEAGUES = [
  { id: 'bronze',   name: '브론즈',   icon: '🥉', minPoints: 0,    reward: { gold: 5000,  diamonds: 10 }, rules: '기본 규칙' },
  { id: 'silver',   name: '실버',     icon: '🥈', minPoints: 100,  reward: { gold: 15000, diamonds: 30 }, rules: '무기 1개 밴' },
  { id: 'gold',     name: '골드',     icon: '🏅', minPoints: 300,  reward: { gold: 30000, diamonds: 60 }, rules: '무기 2개 밴 + 맵 투표' },
  { id: 'platinum', name: '플래티넘', icon: '💎', minPoints: 600,  reward: { gold: 50000, diamonds: 100, skin: true }, rules: '클래스 밴 1개 추가' },
  { id: 'diamond',  name: '다이아',   icon: '💠', minPoints: 1000, reward: { gold: 80000, diamonds: 200, skin: true }, rules: '풀 밴픽 시스템' },
  { id: 'master',   name: '마스터',   icon: '🌟', minPoints: 1500, reward: { gold: 120000, diamonds: 350, title: true }, rules: '풀 밴픽 + 용병 소환 허용' },
  { id: 'champion', name: '챔피언',   icon: '👑', minPoints: 2000, reward: { gold: 200000, diamonds: 500, title: true, frame: true }, rules: '모든 규칙 + 관전 + 중계' },
];

// 포인트 시스템
const POINTS = {
  win_1st:  25,  // 1위
  win_top3: 15,  // 2~3위
  win_top5: 8,   // 4~5위
  top10:    3,   // 6~10위
  lose:    -5,   // 그 외
  streak3:  10,  // 3연승 보너스
  streak5:  25,  // 5연승 보너스
  streak10: 60,  // 10연승 보너스
};

// 리그별 특수 규칙
const LEAGUE_MODIFIERS = {
  bronze:   { hpMul: 1.0, dmgMul: 1.0, timeMul: 1.0, special: '없음' },
  silver:   { hpMul: 1.0, dmgMul: 1.0, timeMul: 1.0, special: '무기 1개 밴 (랜덤)' },
  gold:     { hpMul: 1.1, dmgMul: 1.0, timeMul: 0.9, special: '무기 밴 2개 + 맵 투표' },
  platinum: { hpMul: 1.1, dmgMul: 1.1, timeMul: 0.9, special: '클래스 밴 + 무기 밴' },
  diamond:  { hpMul: 1.2, dmgMul: 1.1, timeMul: 0.85, special: '풀 밴픽 (3밴 3픽)' },
  master:   { hpMul: 1.2, dmgMul: 1.2, timeMul: 0.8, special: '밴픽 + 용병 소환 가능' },
  champion: { hpMul: 1.3, dmgMul: 1.2, timeMul: 0.8, special: '전 규칙 + 관전/중계' },
};

// 시즌 보상 (추가)
const SEASON_REWARDS = {
  champion_1: { title: '시즌 챔피언 👑', gold: 500000, diamonds: 1000, frame: 'champion_gold', skin: 'champion_exclusive', merc: 'season_legend' },
  champion_top3: { title: '시즌 전설 🏆', gold: 300000, diamonds: 600, frame: 'champion_silver' },
  champion_top10: { title: '시즌 영웅 ⭐', gold: 150000, diamonds: 300, frame: 'champion_bronze' },
  master_top10: { title: '마스터 ★', gold: 80000, diamonds: 150 },
  diamond_top10: { title: '다이아 엘리트', gold: 50000, diamonds: 100 },
};

// 특수 토너먼트 (주간)
const SPECIAL_TOURNAMENTS = [
  { id: 'merc_only', name: '용병 대난투', icon: '⚔️🎪', desc: '플레이어 조작 없이 용병만 싸운다', freq: 'weekly' },
  { id: 'no_weapon', name: '맨손 격투', icon: '👊', desc: '무기 없이 맨손+스킬만', freq: 'weekly' },
  { id: 'boss_rush_tournament', name: '보스 러시 토너먼트', icon: '👹🏆', desc: '보스 클리어 타임 어택', freq: 'weekly' },
  { id: 'capture_the_flag', name: '깃발 쟁탈전', icon: '🚩', desc: '상대 팀 깃발 탈취 IO', freq: 'biweekly' },
  { id: 'survival_extreme', name: '익스트림 서바이벌', icon: '💀🌪️', desc: '재앙+변이+보스 동시 출현', freq: 'monthly' },
  { id: 'champion_invitational', name: '챔피언 초대전', icon: '👑⚔️', desc: '챔피언 리그 TOP10만 참가', freq: 'monthly' },
];

function getLeague(points) {
  return [...LEAGUES].reverse().find(l => points >= l.minPoints) || LEAGUES[0];
}

function addPoints(player, rank, totalPlayers) {
  const league = player.leagueData = player.leagueData || { points: 0, wins: 0, streak: 0, season: 0 };
  let pts = 0;
  if (rank === 1) { pts = POINTS.win_1st; league.streak++; }
  else if (rank <= 3) { pts = POINTS.win_top3; league.streak++; }
  else if (rank <= 5) { pts = POINTS.win_top5; league.streak++; }
  else if (rank <= 10) { pts = POINTS.top10; league.streak = 0; }
  else { pts = POINTS.lose; league.streak = 0; }

  if (league.streak >= 10) pts += POINTS.streak10;
  else if (league.streak >= 5) pts += POINTS.streak5;
  else if (league.streak >= 3) pts += POINTS.streak3;

  league.points = Math.max(0, league.points + pts);
  if (rank <= 3) league.wins++;
  const currentLeague = getLeague(league.points);

  return { points: league.points, delta: pts, league: currentLeague, streak: league.streak };
}

function register(io, socket, player) {
  socket.on('league_status', () => {
    const data = player.leagueData || { points: 0, wins: 0, streak: 0 };
    const league = getLeague(data.points);
    const modifier = LEAGUE_MODIFIERS[league.id];
    socket.emit('league_status', { ...data, league, modifier, allLeagues: LEAGUES });
  });

  socket.on('league_match_result', (data) => {
    const result = addPoints(player, data.rank, data.totalPlayers);
    socket.emit('league_match_result', result);
    if (result.streak >= 5) {
      io.emit('server_msg', `🔥 [리그] ${player.name} ${result.streak}연승 중! (${result.league.name} ${result.points}pts)`);
    }
  });

  socket.on('league_tournaments', () => {
    socket.emit('league_tournaments', SPECIAL_TOURNAMENTS);
  });

  socket.on('league_season_rewards', () => {
    socket.emit('league_season_rewards', SEASON_REWARDS);
  });
}

module.exports = {
  LEAGUES, POINTS, LEAGUE_MODIFIERS, SEASON_REWARDS, SPECIAL_TOURNAMENTS,
  getLeague, addPoints, register,
};
