// PvP 토너먼트 시스템 — v1.63
// 16강 단일 토너먼트 (정해진 시간에 시작)
// 아레나(큐 기반 1v1)와 PK존(상시)과 다른 카테고리

const TOURNAMENT_CONFIG = {
  bracketSize: 16,
  registrationFee: 1000, // 골드
  registrationOpenSec: 600, // 10분 등록 윈도우
  matchDurationSec: 180, // 3분/매치
  schedules: ['12:00', '18:00', '21:00'], // 매일 3회
};

const PRIZE_POOL = {
  1: { gold: 50000, diamonds: 500, title: 'tournament_champion' },
  2: { gold: 25000, diamonds: 250 },
  3: { gold: 15000, diamonds: 150 }, // 3-4위 동일
  participation: { gold: 2000, diamonds: 20 },
};

// 활성 토너먼트 (메모리)
let currentTournament = null;
let tournamentIdCounter = 1;

function createTournament() {
  if (currentTournament) return { success: false, msg: '이미 진행 중인 토너먼트' };
  currentTournament = {
    id: `tour_${tournamentIdCounter++}`,
    status: 'registration', // registration → in_progress → finished
    participants: [],
    bracket: null,
    startedAt: Date.now(),
    registrationEndsAt: Date.now() + TOURNAMENT_CONFIG.registrationOpenSec * 1000,
    currentRound: 0,
  };
  return { success: true, tournament: currentTournament };
}

function register(player) {
  if (!currentTournament) return { success: false, msg: '진행 중인 토너먼트 없음' };
  if (currentTournament.status !== 'registration') return { success: false, msg: '등록 마감' };
  if (currentTournament.participants.length >= TOURNAMENT_CONFIG.bracketSize) {
    return { success: false, msg: '정원 초과 (16명)' };
  }
  if (currentTournament.participants.find(p => p.id === player.id)) {
    return { success: false, msg: '이미 등록됨' };
  }
  if ((player.gold || 0) < TOURNAMENT_CONFIG.registrationFee) {
    return { success: false, msg: `등록비 ${TOURNAMENT_CONFIG.registrationFee}G 필요` };
  }
  player.gold -= TOURNAMENT_CONFIG.registrationFee;
  currentTournament.participants.push({
    id: player.id,
    name: player.displayName,
    level: player.level || 1,
    eliminated: false,
    wins: 0,
    losses: 0,
  });
  return { success: true, position: currentTournament.participants.length };
}

function _shuffleBracket() {
  if (!currentTournament) return null;
  const players = [...currentTournament.participants];
  // Fisher-Yates 셔플
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  // 16강 매칭 (8쌍)
  const matches = [];
  for (let i = 0; i < players.length; i += 2) {
    matches.push({
      round: 1,
      matchId: `m${i / 2 + 1}`,
      player1: players[i],
      player2: players[i + 1] || null, // 부전승
      winner: null,
    });
  }
  return matches;
}

function startTournament() {
  if (!currentTournament) return { success: false, msg: '존재하지 않음' };
  if (currentTournament.status !== 'registration') return { success: false, msg: '등록 단계 아님' };
  if (currentTournament.participants.length < 2) return { success: false, msg: '최소 2명 필요' };
  currentTournament.status = 'in_progress';
  currentTournament.bracket = _shuffleBracket();
  currentTournament.currentRound = 1;
  return { success: true, bracket: currentTournament.bracket };
}

function reportMatch(matchId, winnerId) {
  if (!currentTournament || currentTournament.status !== 'in_progress') return { success: false };
  const match = currentTournament.bracket.find(m => m.matchId === matchId && !m.winner);
  if (!match) return { success: false, msg: '존재하지 않거나 종료된 매치' };

  const winner = match.player1.id === winnerId ? match.player1 : match.player2;
  const loser = winner === match.player1 ? match.player2 : match.player1;
  if (!winner) return { success: false, msg: '잘못된 승자' };

  match.winner = winner;
  winner.wins++;
  if (loser) {
    loser.eliminated = true;
    loser.losses++;
  }

  // 다음 라운드 자동 생성 체크
  const currentRoundMatches = currentTournament.bracket.filter(m => m.round === currentTournament.currentRound);
  const allDone = currentRoundMatches.every(m => m.winner);
  if (allDone) {
    return _advanceRound();
  }
  return { success: true, match };
}

function _advanceRound() {
  const winners = currentTournament.bracket
    .filter(m => m.round === currentTournament.currentRound && m.winner)
    .map(m => m.winner);
  if (winners.length === 1) {
    // 우승자 결정
    return finishTournament(winners[0]);
  }
  currentTournament.currentRound++;
  // 다음 라운드 매치 생성
  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    nextMatches.push({
      round: currentTournament.currentRound,
      matchId: `r${currentTournament.currentRound}m${i / 2 + 1}`,
      player1: winners[i],
      player2: winners[i + 1] || null,
      winner: null,
    });
  }
  currentTournament.bracket.push(...nextMatches);
  return { roundAdvanced: true, newRound: currentTournament.currentRound, matches: nextMatches };
}

function finishTournament(champion) {
  if (!currentTournament) return null;
  currentTournament.status = 'finished';
  currentTournament.champion = champion;

  // 순위 계산 (탈락 라운드 기준)
  const participants = currentTournament.participants;
  const rankings = [];
  // 1위 (우승)
  rankings.push({ rank: 1, player: champion, reward: PRIZE_POOL[1] });
  // 2위 (결승 패배)
  const finalMatch = currentTournament.bracket.find(m => m.round === currentTournament.currentRound);
  if (finalMatch && finalMatch.player1 && finalMatch.player2) {
    const runnerUp = finalMatch.player1.id === champion.id ? finalMatch.player2 : finalMatch.player1;
    if (runnerUp) rankings.push({ rank: 2, player: runnerUp, reward: PRIZE_POOL[2] });
  }
  // 3-4위 (4강 패배)
  const semifinalRound = currentTournament.currentRound - 1;
  const semifinalLosers = currentTournament.bracket
    .filter(m => m.round === semifinalRound && m.winner)
    .map(m => m.player1.id === m.winner.id ? m.player2 : m.player1)
    .filter(p => p);
  for (const sp of semifinalLosers) {
    rankings.push({ rank: 3, player: sp, reward: PRIZE_POOL[3] });
  }
  // 나머지 참가상
  const rankedIds = new Set(rankings.map(r => r.player.id));
  for (const p of participants) {
    if (!rankedIds.has(p.id)) {
      rankings.push({ rank: 5, player: p, reward: PRIZE_POOL.participation });
    }
  }

  const result = {
    finished: true,
    champion,
    rankings,
    totalParticipants: participants.length,
  };
  currentTournament = null;
  return result;
}

function getStatus() {
  return {
    current: currentTournament,
    nextSchedule: TOURNAMENT_CONFIG.schedules,
    config: TOURNAMENT_CONFIG,
    prizes: PRIZE_POOL,
  };
}

module.exports = {
  TOURNAMENT_CONFIG,
  PRIZE_POOL,
  createTournament,
  register,
  startTournament,
  reportMatch,
  finishTournament,
  getStatus,
};
