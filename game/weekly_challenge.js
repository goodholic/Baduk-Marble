// 주간 도전 보드 — v4.5
// 매주 3개 던전 로테이션, 솔로/듀오/트리오, 랭킹, 시즌 칭호
const { simulateBattle } = require('./merc_combat_engine');
const { getPlayerMercs } = require('./mercenary_system');

// ═══ 던전 풀 ═══
const CHALLENGE_DUNGEONS = [
  { id: 'inferno', name: '지옥의 화염관', icon: '🔥', element: 'fire', minPower: 500, waves: 5, bossHP: 5000, bossATK: 80, reward: { gold: 5000, diamonds: 30 } },
  { id: 'abyss', name: '심연의 나락', icon: '🌊', element: 'water', minPower: 800, waves: 7, bossHP: 8000, bossATK: 120, reward: { gold: 8000, diamonds: 50 } },
  { id: 'storm', name: '뇌신의 탑', icon: '⚡', element: 'wind', minPower: 600, waves: 6, bossHP: 6000, bossATK: 100, reward: { gold: 6000, diamonds: 40 } },
  { id: 'earth', name: '대지의 심장', icon: '🪨', element: 'earth', minPower: 700, waves: 5, bossHP: 10000, bossATK: 60, reward: { gold: 7000, diamonds: 45 } },
  { id: 'holy', name: '빛의 성역', icon: '✨', element: 'light', minPower: 1000, waves: 8, bossHP: 12000, bossATK: 150, reward: { gold: 10000, diamonds: 80 } },
  { id: 'shadow', name: '그림자 왕좌', icon: '🌑', element: 'dark', minPower: 1200, waves: 10, bossHP: 15000, bossATK: 200, reward: { gold: 15000, diamonds: 100 } },
  { id: 'dragon', name: '용의 둥지', icon: '🐲', element: 'fire', minPower: 1500, waves: 8, bossHP: 20000, bossATK: 250, reward: { gold: 20000, diamonds: 150 } },
  { id: 'void', name: '공허의 균열', icon: '🕳️', element: 'dark', minPower: 2000, waves: 12, bossHP: 30000, bossATK: 300, reward: { gold: 30000, diamonds: 200 } },
];

const TEAM_SIZES = { solo: 1, duo: 2, trio: 3 };
const TEAM_BONUS = { solo: 1.0, duo: 1.3, trio: 1.5 };

const WEEKLY_RANKS = [
  { rank: 1, title: '주간 챔피언', icon: '👑', reward: { gold: 50000, diamonds: 300 } },
  { rank: 2, title: '주간 영웅', icon: '🥈', reward: { gold: 30000, diamonds: 200 } },
  { rank: 3, title: '주간 전사', icon: '🥉', reward: { gold: 20000, diamonds: 100 } },
  { rank: 10, title: 'TOP 10', icon: '🏅', reward: { gold: 10000, diamonds: 50 } },
];

const ENTRY_FEE = { solo: 500, duo: 0, trio: 0 };
const MAX_DAILY_ATTEMPTS = 5;

// ═══ 글로벌 주간 상태 ═══
let weeklyState = {
  weekNumber: 0,
  activeDungeons: [],
  leaderboard: [],    // [{ playerId, playerName, score, dungeonId, teamSize, timestamp }]
  claimed: new Set(),  // playerIds who claimed rank reward
};

// ═══ 유틸리티 ═══

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function seededShuffle(arr, seed) {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ensureWeeklyData(player) {
  if (!player._weeklyChallenge) {
    player._weeklyChallenge = {
      weekNumber: 0,
      completedDungeons: {},  // { dungeonId: { bestScore, attempts, lastAttempt } }
      totalScore: 0,
      teamHistory: [],
      claimedReward: false,
    };
  }
  const wk = getWeekNumber();
  if (player._weeklyChallenge.weekNumber !== wk) {
    player._weeklyChallenge = {
      weekNumber: wk,
      completedDungeons: {},
      totalScore: 0,
      teamHistory: [],
      claimedReward: false,
    };
  }
  return player._weeklyChallenge;
}

function calcPartyPower(mercs) {
  return mercs.reduce((sum, m) => sum + (m.atk || 0) + (m.def || 0) + (m.hp || 0) + (m.spd || 0), 0);
}

// ═══ 보스/몹 유닛 생성 ═══

function createWaveEnemies(dungeon, waveNum, totalWaves) {
  const isBoss = waveNum === totalWaves;
  const scale = 0.5 + (waveNum / totalWaves) * 0.5;

  if (isBoss) {
    return [{
      name: dungeon.name + ' 보스',
      hp: dungeon.bossHP,
      atk: dungeon.bossATK,
      def: Math.floor(dungeon.bossATK * 0.4),
      spd: Math.floor(dungeon.bossATK * 0.3),
      element: dungeon.element,
      grade: 'legendary',
      skill: { name: '보스 분노', dmg: Math.floor(dungeon.bossATK * 1.5), cd: 3, aoe: true },
    }];
  }

  const mobCount = 2 + Math.floor(waveNum / 2);
  const enemies = [];
  for (let i = 0; i < mobCount; i++) {
    enemies.push({
      name: `${dungeon.icon} 몬스터 ${waveNum}-${i + 1}`,
      hp: Math.floor(dungeon.bossHP * 0.1 * scale),
      atk: Math.floor(dungeon.bossATK * 0.5 * scale),
      def: Math.floor(dungeon.bossATK * 0.15 * scale),
      spd: Math.floor(dungeon.bossATK * 0.2 * scale),
      element: dungeon.element,
      grade: 'normal',
      skill: null,
    });
  }
  return enemies;
}

// ═══ 핵심 함수 ═══

function getWeeklyDungeons() {
  const wk = getWeekNumber();
  if (weeklyState.weekNumber !== wk) {
    const shuffled = seededShuffle(CHALLENGE_DUNGEONS, wk * 7919 + 2027);
    weeklyState.weekNumber = wk;
    weeklyState.activeDungeons = shuffled.slice(0, 3);
    weeklyState.leaderboard = [];
    weeklyState.claimed = new Set();
  }
  return weeklyState.activeDungeons;
}

function getWeeklyStatus(player) {
  const data = ensureWeeklyData(player);
  const dungeons = getWeeklyDungeons();
  const rank = getPlayerRank(player.id);

  return {
    weekNumber: data.weekNumber,
    activeDungeons: dungeons.map(d => ({
      ...d,
      completed: !!(data.completedDungeons[d.id] && data.completedDungeons[d.id].bestScore > 0),
      bestScore: data.completedDungeons[d.id]?.bestScore || 0,
      attempts: data.completedDungeons[d.id]?.attempts || 0,
    })),
    totalScore: data.totalScore,
    rank,
    teamHistory: data.teamHistory.slice(-10),
    claimedReward: data.claimedReward,
  };
}

function getPlayerRank(playerId) {
  const sorted = [...weeklyState.leaderboard].sort((a, b) => b.score - a.score);
  const idx = sorted.findIndex(e => e.playerId === playerId);
  return idx === -1 ? null : idx + 1;
}

function startChallenge(player, dungeonId, teamSize, teammates, players) {
  const dungeons = getWeeklyDungeons();
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) return { success: false, msg: '이번 주 활성화된 던전이 아닙니다.' };

  if (!TEAM_SIZES[teamSize]) return { success: false, msg: '유효하지 않은 팀 크기입니다. (solo/duo/trio)' };

  const data = ensureWeeklyData(player);
  const dungeonData = data.completedDungeons[dungeonId] || { bestScore: 0, attempts: 0, lastAttempt: 0 };

  if (dungeonData.attempts >= MAX_DAILY_ATTEMPTS) {
    return { success: false, msg: `일일 도전 횟수를 초과했습니다. (${MAX_DAILY_ATTEMPTS}회)` };
  }

  // 파티 구성
  const mercs = getPlayerMercs(player);
  const party = mercs.party.map(uid => mercs.roster.find(m => m.uid === uid)).filter(Boolean);
  if (party.length === 0) return { success: false, msg: '편성된 용병이 없습니다.' };

  // 팀원 파티 합산
  const allParty = [...party];
  const teamMembers = [player.name || player.id];

  if (teamSize !== 'solo' && teammates && teammates.length > 0) {
    const required = TEAM_SIZES[teamSize] - 1;
    if (teammates.length !== required) {
      return { success: false, msg: `${teamSize} 모드는 ${required}명의 팀원이 필요합니다.` };
    }
    for (const mateId of teammates) {
      const mate = players ? players.get(mateId) : null;
      if (!mate) return { success: false, msg: `팀원 ${mateId}을(를) 찾을 수 없습니다.` };
      const mateMercs = getPlayerMercs(mate);
      const mateParty = mateMercs.party.map(uid => mateMercs.roster.find(m => m.uid === uid)).filter(Boolean);
      if (mateParty.length === 0) return { success: false, msg: `팀원 ${mate.name || mateId}의 편성된 용병이 없습니다.` };
      allParty.push(...mateParty);
      teamMembers.push(mate.name || mateId);
    }
  }

  // 전투력 체크
  const totalPower = calcPartyPower(allParty);
  if (totalPower < dungeon.minPower) {
    return { success: false, msg: `최소 전투력 ${dungeon.minPower} 필요 (현재: ${totalPower})` };
  }

  // 입장료 차감
  const fee = ENTRY_FEE[teamSize] || 0;
  if (fee > 0) {
    if ((player.gold || 0) < fee) return { success: false, msg: `입장료 ${fee}G가 부족합니다.` };
    player.gold -= fee;
  }

  // 전투 실행
  const result = simulateChallengeBattle(allParty, dungeon, teamSize);

  // 결과 기록
  dungeonData.attempts += 1;
  dungeonData.lastAttempt = Date.now();
  if (result.score > dungeonData.bestScore) {
    dungeonData.bestScore = result.score;
  }
  data.completedDungeons[dungeonId] = dungeonData;

  // 총점 재계산 (각 던전 최고 점수 합산)
  data.totalScore = Object.values(data.completedDungeons).reduce((s, d) => s + d.bestScore, 0);

  // 팀 히스토리 추가
  data.teamHistory.push({
    dungeonId,
    teamSize,
    teamMembers,
    score: result.score,
    timestamp: Date.now(),
  });

  // 리더보드 업데이트
  updateLeaderboard(player, data.totalScore, dungeonId, teamSize);

  // 보상 지급
  const bonus = TEAM_BONUS[teamSize];
  const earnedGold = Math.floor(dungeon.reward.gold * result.clearRate * bonus);
  const earnedDiamonds = Math.floor(dungeon.reward.diamonds * result.clearRate * bonus);
  player.gold = (player.gold || 0) + earnedGold;
  player.diamonds = (player.diamonds || 0) + earnedDiamonds;

  return {
    success: true,
    msg: result.cleared
      ? `${dungeon.icon} ${dungeon.name} 클리어! 점수: ${result.score}`
      : `${dungeon.icon} ${dungeon.name} 실패... 웨이브 ${result.wavesCleared}/${dungeon.waves} 도달`,
    dungeon: dungeon.name,
    cleared: result.cleared,
    wavesCleared: result.wavesCleared,
    totalWaves: dungeon.waves,
    score: result.score,
    bestScore: dungeonData.bestScore,
    earnedGold,
    earnedDiamonds,
    teamBonus: bonus,
    attemptsLeft: MAX_DAILY_ATTEMPTS - dungeonData.attempts,
    mvp: result.mvp,
  };
}

function simulateChallengeBattle(party, dungeon, teamSize) {
  let totalDamage = 0;
  let turnsSurvived = 0;
  let wavesCleared = 0;
  let mvp = null;

  // 파티 HP를 웨이브 간 유지하기 위한 상태
  let currentParty = party.map(m => ({ ...m }));

  for (let wave = 1; wave <= dungeon.waves; wave++) {
    const enemies = createWaveEnemies(dungeon, wave, dungeon.waves);

    // 이전 웨이브에서 쓰러진 용병 제거, HP 유지
    const aliveParty = currentParty.filter(m => (m.hp || m.currentHP || 1) > 0);
    if (aliveParty.length === 0) break;

    const result = simulateBattle(aliveParty, enemies, {
      maxTurns: 30,
      formationA: aliveParty.map((_, i) => i < Math.ceil(aliveParty.length / 2) ? 'front' : 'back'),
      formationB: enemies.map(() => 'front'),
    });

    turnsSurvived += result.totalTurns;

    // 데미지 집계
    for (const entry of result.log) {
      if (entry.type === 'attack' || entry.type === 'skill') {
        totalDamage += entry.dmg || entry.totalDmg || 0;
      }
    }

    if (result.mvp && (!mvp || (result.mvp.totalDmg || 0) > (mvp.totalDmg || 0))) {
      mvp = result.mvp;
    }

    if (result.winner === 'A') {
      wavesCleared = wave;
      // 생존자 HP 갱신
      currentParty = currentParty.map(m => {
        const survivor = result.survivorsA.find(s => s.name === m.name);
        if (survivor) return { ...m, hp: survivor.hp };
        return { ...m, hp: 0 };
      });
    } else {
      // 패배 — 이 웨이브에서 끝남
      wavesCleared = wave - 1;
      break;
    }

    if (wave === dungeon.waves) wavesCleared = dungeon.waves;
  }

  const cleared = wavesCleared === dungeon.waves;
  const bonus = TEAM_BONUS[teamSize] || 1.0;
  const clearRate = wavesCleared / dungeon.waves;

  // 점수 = (생존턴 × 딜량 × 팀보너스 × 클리어율) / 100
  const score = Math.floor((turnsSurvived * Math.max(totalDamage, 1) * bonus * (cleared ? 1.5 : clearRate)) / 100);

  return { cleared, wavesCleared, turnsSurvived, totalDamage, score, clearRate, mvp };
}

function updateLeaderboard(player, totalScore, dungeonId, teamSize) {
  const existing = weeklyState.leaderboard.find(e => e.playerId === player.id);
  if (existing) {
    if (totalScore > existing.score) {
      existing.score = totalScore;
      existing.dungeonId = dungeonId;
      existing.teamSize = teamSize;
      existing.timestamp = Date.now();
    }
  } else {
    weeklyState.leaderboard.push({
      playerId: player.id,
      playerName: player.name || player.id,
      score: totalScore,
      dungeonId,
      teamSize,
      timestamp: Date.now(),
    });
  }
  weeklyState.leaderboard.sort((a, b) => b.score - a.score);
}

function getWeeklyLeaderboard() {
  const dungeons = getWeeklyDungeons();
  const top20 = weeklyState.leaderboard.slice(0, 20);
  return {
    weekNumber: weeklyState.weekNumber,
    activeDungeons: dungeons.map(d => ({ id: d.id, name: d.name, icon: d.icon })),
    rankings: top20.map((e, i) => ({
      rank: i + 1,
      playerName: e.playerName,
      score: e.score,
      teamSize: e.teamSize,
      rankTitle: getRankTitle(i + 1),
    })),
    totalParticipants: weeklyState.leaderboard.length,
  };
}

function getRankTitle(rank) {
  for (const r of WEEKLY_RANKS) {
    if (rank <= r.rank) return { title: r.title, icon: r.icon };
  }
  return null;
}

function claimWeeklyReward(player) {
  const data = ensureWeeklyData(player);
  if (data.claimedReward) return { success: false, msg: '이미 주간 보상을 수령했습니다.' };

  const rank = getPlayerRank(player.id);
  if (!rank) return { success: false, msg: '이번 주 도전 기록이 없습니다.' };

  const rankInfo = getRankTitle(rank);
  if (!rankInfo) return { success: false, msg: '순위 보상 대상이 아닙니다. (TOP 10 이내만 수령 가능)' };

  const rewardDef = WEEKLY_RANKS.find(r => rank <= r.rank);
  if (!rewardDef) return { success: false, msg: '보상 정보를 찾을 수 없습니다.' };

  player.gold = (player.gold || 0) + rewardDef.reward.gold;
  player.diamonds = (player.diamonds || 0) + rewardDef.reward.diamonds;
  data.claimedReward = true;
  weeklyState.claimed.add(player.id);

  return {
    success: true,
    msg: `${rankInfo.icon} ${rankInfo.title} 보상 수령! (+${rewardDef.reward.gold}G, +${rewardDef.reward.diamonds}💎)`,
    rank,
    title: rankInfo.title,
    gold: rewardDef.reward.gold,
    diamonds: rewardDef.reward.diamonds,
  };
}

function resetWeekly() {
  // 미수령 보상 자동 지급 (상위 10명)
  const top10 = weeklyState.leaderboard.slice(0, 10);
  const distributed = [];

  for (const entry of top10) {
    if (weeklyState.claimed.has(entry.playerId)) continue;
    const rankIdx = weeklyState.leaderboard.indexOf(entry);
    const rank = rankIdx + 1;
    const rewardDef = WEEKLY_RANKS.find(r => rank <= r.rank);
    if (rewardDef) {
      distributed.push({
        playerId: entry.playerId,
        playerName: entry.playerName,
        rank,
        reward: rewardDef.reward,
      });
    }
  }

  // 상태 초기화
  const prevWeek = weeklyState.weekNumber;
  weeklyState = {
    weekNumber: getWeekNumber(),
    activeDungeons: [],
    leaderboard: [],
    claimed: new Set(),
  };

  // 새 던전 선택
  getWeeklyDungeons();

  return {
    prevWeek,
    newWeek: weeklyState.weekNumber,
    activeDungeons: weeklyState.activeDungeons.map(d => ({ id: d.id, name: d.name, icon: d.icon })),
    pendingRewards: distributed,
  };
}

// ═══ 소켓 핸들러 등록 ═══

function registerWeeklyChallengeHandlers(io, socket, player, players) {
  socket.on('weekly_status', (_, cb) => {
    const respond = typeof cb === 'function' ? cb : (d) => socket.emit('weekly_status', d);
    try {
      const status = getWeeklyStatus(player);
      respond({ success: true, ...status });
    } catch (e) {
      respond({ success: false, msg: '주간 도전 상태 조회 실패: ' + e.message });
    }
  });

  socket.on('weekly_start', (data, cb) => {
    const respond = typeof cb === 'function' ? cb : (d) => socket.emit('weekly_start', d);
    try {
      const { dungeonId, teamSize, teammates } = data || {};
      if (!dungeonId || !teamSize) {
        return respond({ success: false, msg: '던전 ID와 팀 크기를 지정해주세요.' });
      }
      const result = startChallenge(player, dungeonId, teamSize || 'solo', teammates || [], players);
      respond(result);

      if (result.success) {
        io.emit('weekly_update', {
          type: 'challenge_complete',
          playerName: player.name || player.id,
          dungeonId,
          score: result.score,
          cleared: result.cleared,
        });
      }
    } catch (e) {
      respond({ success: false, msg: '주간 도전 시작 실패: ' + e.message });
    }
  });

  socket.on('weekly_leaderboard', (_, cb) => {
    const respond = typeof cb === 'function' ? cb : (d) => socket.emit('weekly_leaderboard', d);
    try {
      const board = getWeeklyLeaderboard();
      respond({ success: true, ...board });
    } catch (e) {
      respond({ success: false, msg: '리더보드 조회 실패: ' + e.message });
    }
  });

  socket.on('weekly_claim', (_, cb) => {
    const respond = typeof cb === 'function' ? cb : (d) => socket.emit('weekly_claim', d);
    try {
      const result = claimWeeklyReward(player);
      respond(result);
    } catch (e) {
      respond({ success: false, msg: '보상 수령 실패: ' + e.message });
    }
  });
}

module.exports = {
  CHALLENGE_DUNGEONS,
  TEAM_SIZES,
  TEAM_BONUS,
  WEEKLY_RANKS,
  getWeeklyDungeons,
  getWeeklyStatus,
  startChallenge,
  simulateChallengeBattle,
  getWeeklyLeaderboard,
  claimWeeklyReward,
  resetWeekly,
  registerWeeklyChallengeHandlers,
};
