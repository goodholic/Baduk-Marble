// 용병 아레나 PvP — v3.0
// 내 용병 파티 6명 vs 상대 파티 6명 자동 대전
// 랭크 시스템: 브론즈→실버→골드→다이아→마스터→전설

const RANKS = [
  { name: '브론즈',  icon: '🥉', min: 0,    max: 999,  winPt: 30, losePt: 5,  banCount: 0 },
  { name: '실버',    icon: '🥈', min: 1000, max: 1999, winPt: 25, losePt: 13, banCount: 0 },
  { name: '골드',    icon: '🥇', min: 2000, max: 2999, winPt: 20, losePt: 17, banCount: 1 },
  { name: '다이아',  icon: '💎', min: 3000, max: 3999, winPt: 15, losePt: 20, banCount: 2 },
  { name: '마스터',  icon: '👑', min: 4000, max: 9999, winPt: 10, losePt: 22, banCount: 2 },
];

const SEASON_REWARDS = {
  '브론즈': { gold: 3000,   diamonds: 10 },
  '실버':  { gold: 8000,   diamonds: 30 },
  '골드':  { gold: 20000,  diamonds: 60 },
  '다이아': { gold: 50000,  diamonds: 150 },
  '마스터': { gold: 100000, diamonds: 300 },
};

const ARENA_CFG = {
  matchDuration: 120,     // 2분
  dailyFree: 5,
  dailyMax: 20,
  ticketCost: 500,        // 골드
  matchRange: 300,        // ±300점 내 매칭
};

// 활성 큐 & 매치
const arenaQueue = [];
const activeMatches = {};

function getArenaState(player) {
  if (!player._arena) player._arena = { score: 0, wins: 0, losses: 0, streak: 0, dailyCount: 0, dailyDate: '', bans: [] };
  return player._arena;
}

function getRank(score) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
}

// 매칭 큐 등록
function joinQueue(playerId, players) {
  const player = players[playerId];
  if (!player) return { success: false, msg: '플레이어 없음' };

  const arena = getArenaState(player);
  const today = new Date().toDateString();
  if (arena.dailyDate !== today) { arena.dailyDate = today; arena.dailyCount = 0; }
  if (arena.dailyCount >= ARENA_CFG.dailyMax) return { success: false, msg: '일일 한도 초과 (20회)' };

  // 무료 5회 초과 시 티켓 비용
  if (arena.dailyCount >= ARENA_CFG.dailyFree) {
    if ((player.gold || 0) < ARENA_CFG.ticketCost) return { success: false, msg: `티켓 비용 ${ARENA_CFG.ticketCost}G 필요` };
    player.gold -= ARENA_CFG.ticketCost;
  }

  // 용병 파티 체크
  let mercSystem;
  try { mercSystem = require('./mercenary_system'); } catch(e) { return { success: false, msg: '용병 시스템 오류' }; }
  const mercs = mercSystem.getPlayerMercs(player);
  const party = mercs.roster.filter(m => mercs.party.includes(m.uid));
  if (party.length === 0) return { success: false, msg: '용병 파티를 먼저 편성하세요' };

  // 중복 큐 방지
  if (arenaQueue.find(q => q.playerId === playerId)) return { success: false, msg: '이미 매칭 대기 중' };

  arenaQueue.push({
    playerId,
    name: player.displayName || player.className,
    score: arena.score,
    party: party.map(m => ({
      uid: m.uid, name: m.name, icon: m.icon,
      atk: m.atk, def: m.def, hp: m.hp, maxHp: m.hp,
      spd: m.spd || 10, skill: m.skill, skillLevel: m.skillLevel || 1,
      grade: m.grade, stars: m.stars || 0,
    })),
    joinedAt: Date.now(),
  });

  return { success: true, msg: '🏟️ 아레나 매칭 대기 중...', queueSize: arenaQueue.length };
}

// 매칭 시도 (서버 틱에서 주기적 호출)
function tryMatch(io, players) {
  if (arenaQueue.length < 2) return;

  // 점수 근접한 2명 매칭
  arenaQueue.sort((a, b) => a.score - b.score);

  for (let i = 0; i < arenaQueue.length - 1; i++) {
    const a = arenaQueue[i];
    const b = arenaQueue[i + 1];
    if (Math.abs(a.score - b.score) <= ARENA_CFG.matchRange) {
      // 매칭 성공!
      arenaQueue.splice(i, 2);
      startMatch(a, b, io, players);
      return;
    }
  }

  // 30초 이상 대기 시 범위 확대 매칭
  const now = Date.now();
  for (let i = 0; i < arenaQueue.length - 1; i++) {
    if (now - arenaQueue[i].joinedAt > 30000 && now - arenaQueue[i + 1].joinedAt > 30000) {
      const a = arenaQueue[i];
      const b = arenaQueue[i + 1];
      arenaQueue.splice(i, 2);
      startMatch(a, b, io, players);
      return;
    }
  }
}

// 매치 시작
function startMatch(entryA, entryB, io, players) {
  const matchId = 'arena_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);

  // 딥카피 파티 (전투 중 HP 변경)
  const teamA = entryA.party.map(m => ({ ...m, hp: m.maxHp, alive: true, skillCd: 0 }));
  const teamB = entryB.party.map(m => ({ ...m, hp: m.maxHp, alive: true, skillCd: 0 }));

  const match = {
    id: matchId,
    playerA: { id: entryA.playerId, name: entryA.name, score: entryA.score, team: teamA },
    playerB: { id: entryB.playerId, name: entryB.name, score: entryB.score, team: teamB },
    startTime: Date.now(),
    elapsed: 0,
    phase: 'active',
    log: [],
    result: null,
  };

  activeMatches[matchId] = match;

  // 알림
  if (io) {
    const matchInfo = {
      matchId, duration: ARENA_CFG.matchDuration,
      opponent: { name: entryB.name, score: entryB.score, team: teamB.map(m => ({ icon: m.icon, name: m.name, grade: m.grade })) },
    };
    io.to(entryA.playerId).emit('arena_match_start', { ...matchInfo, role: 'A' });
    io.to(entryB.playerId).emit('arena_match_start', {
      ...matchInfo,
      opponent: { name: entryA.name, score: entryA.score, team: teamA.map(m => ({ icon: m.icon, name: m.name, grade: m.grade })) },
      role: 'B',
    });
  }

  // 자동 전투 틱
  const tickTimer = setInterval(() => {
    const result = tickMatch(matchId, io, players);
    if (result && result.ended) clearInterval(tickTimer);
  }, 1000);

  match._tickTimer = tickTimer;
}

// ══════ 자동 전투 틱 (1초마다) ══════
function tickMatch(matchId, io, players) {
  const match = activeMatches[matchId];
  if (!match || match.phase !== 'active') return { ended: true };

  const now = Date.now();
  match.elapsed = Math.floor((now - match.startTime) / 1000);

  const aliveA = match.playerA.team.filter(m => m.alive);
  const aliveB = match.playerB.team.filter(m => m.alive);

  // 전멸 체크
  if (aliveA.length === 0) return endMatch(matchId, 'B', '팀 A 전멸', io, players);
  if (aliveB.length === 0) return endMatch(matchId, 'A', '팀 B 전멸', io, players);

  // 시간 초과 → HP 비율 비교
  if (match.elapsed >= ARENA_CFG.matchDuration) {
    const hpRatioA = aliveA.reduce((s, m) => s + m.hp / m.maxHp, 0) / match.playerA.team.length;
    const hpRatioB = aliveB.reduce((s, m) => s + m.hp / m.maxHp, 0) / match.playerB.team.length;
    if (hpRatioA > hpRatioB) return endMatch(matchId, 'A', 'HP 우세', io, players);
    if (hpRatioB > hpRatioA) return endMatch(matchId, 'B', 'HP 우세', io, players);
    return endMatch(matchId, 'draw', '무승부', io, players);
  }

  // 각 유닛 행동 (SPD 높은 순)
  const allUnits = [
    ...aliveA.map(m => ({ ...m, side: 'A' })),
    ...aliveB.map(m => ({ ...m, side: 'B' })),
  ].sort((a, b) => (b.spd || 10) - (a.spd || 10));

  for (const unit of allUnits) {
    if (!unit.alive) continue;
    const enemies = unit.side === 'A' ? aliveB : aliveA;
    const allies = unit.side === 'A' ? aliveA : aliveB;
    if (enemies.filter(e => e.alive).length === 0) continue;

    // 타겟 선택: HP 가장 낮은 적
    const target = enemies.filter(e => e.alive).sort((a, b) => a.hp - b.hp)[0];
    if (!target) continue;

    // 스킬 or 기본 공격
    const sk = unit.skill;
    let usedSkill = false;

    if (sk && now >= (unit.skillCd || 0)) {
      // 스킬 사용
      unit.skillCd = now + (sk.cd || 15) * 1000;
      usedSkill = true;

      if (sk.dmg) {
        const dmg = Math.max(1, Math.floor(unit.atk * sk.dmg * (100 / (100 + target.def))));
        if (sk.aoe) {
          // 광역: 전체 적에게 50% 데미지
          for (const e of enemies.filter(e => e.alive)) {
            const aoeDmg = e === target ? dmg : Math.floor(dmg * 0.5);
            e.hp -= aoeDmg;
            if (e.hp <= 0) e.alive = false;
          }
          match.log.push({ t: match.elapsed, s: unit.side, a: unit.icon, sk: sk.name, aoe: true, dmg });
        } else {
          target.hp -= dmg;
          if (target.hp <= 0) target.alive = false;
          match.log.push({ t: match.elapsed, s: unit.side, a: unit.icon, sk: sk.name, v: target.icon, dmg });
        }
      }
      if (sk.heal) {
        // 자힐
        const src = unit.side === 'A' ? match.playerA.team : match.playerB.team;
        const me = src.find(m => m.uid === unit.uid);
        if (me) me.hp = Math.min(me.maxHp, me.hp + sk.heal);
      }
      if (sk.healAll) {
        for (const a of allies.filter(a => a.alive)) {
          a.hp = Math.min(a.maxHp, a.hp + sk.healAll);
        }
        match.log.push({ t: match.elapsed, s: unit.side, a: unit.icon, sk: sk.name, heal: sk.healAll });
      }
      if (sk.stun) {
        target.skillCd = Math.max(target.skillCd || 0, now + sk.stun * 1000);
      }
    }

    if (!usedSkill) {
      // 기본 공격
      const dmg = Math.max(1, Math.floor(unit.atk * (100 / (100 + target.def))));
      target.hp -= dmg;
      if (target.hp <= 0) target.alive = false;
    }
  }

  // 상태 브로드캐스트
  if (io && match.elapsed % 2 === 0) {
    const status = {
      matchId, elapsed: match.elapsed, remaining: ARENA_CFG.matchDuration - match.elapsed,
      teamA: match.playerA.team.map(m => ({ icon: m.icon, hp: m.hp, maxHp: m.maxHp, alive: m.alive })),
      teamB: match.playerB.team.map(m => ({ icon: m.icon, hp: m.hp, maxHp: m.maxHp, alive: m.alive })),
      aliveA: match.playerA.team.filter(m => m.alive).length,
      aliveB: match.playerB.team.filter(m => m.alive).length,
    };
    io.to(match.playerA.id).emit('arena_match_update', { ...status, myRole: 'A' });
    io.to(match.playerB.id).emit('arena_match_update', { ...status, myRole: 'B' });
  }

  return {};
}

// 매치 종료 + 점수 정산
function endMatch(matchId, winner, reason, io, players) {
  const match = activeMatches[matchId];
  if (!match || match.phase === 'ended') return { ended: true };

  match.phase = 'ended';
  if (match._tickTimer) clearInterval(match._tickTimer);

  const pA = players ? players[match.playerA.id] : null;
  const pB = players ? players[match.playerB.id] : null;

  const arenaA = pA ? getArenaState(pA) : null;
  const arenaB = pB ? getArenaState(pB) : null;

  const rankA = arenaA ? getRank(arenaA.score) : RANKS[0];
  const rankB = arenaB ? getRank(arenaB.score) : RANKS[0];

  let rewardA = {}, rewardB = {};

  if (winner === 'A') {
    if (arenaA) { arenaA.score += rankA.winPt; arenaA.wins++; arenaA.streak++; arenaA.dailyCount++; }
    if (arenaB) { arenaB.score = Math.max(0, arenaB.score - rankB.losePt); arenaB.losses++; arenaB.streak = 0; arenaB.dailyCount++; }
    rewardA = { gold: 500 + rankA.winPt * 10, result: 'win', scoreDelta: '+' + rankA.winPt };
    rewardB = { gold: 100, result: 'lose', scoreDelta: '-' + rankB.losePt };
    if (pA) pA.gold = (pA.gold || 0) + rewardA.gold;
    if (pB) pB.gold = (pB.gold || 0) + rewardB.gold;
  } else if (winner === 'B') {
    if (arenaB) { arenaB.score += rankB.winPt; arenaB.wins++; arenaB.streak++; arenaB.dailyCount++; }
    if (arenaA) { arenaA.score = Math.max(0, arenaA.score - rankA.losePt); arenaA.losses++; arenaA.streak = 0; arenaA.dailyCount++; }
    rewardB = { gold: 500 + rankB.winPt * 10, result: 'win', scoreDelta: '+' + rankB.winPt };
    rewardA = { gold: 100, result: 'lose', scoreDelta: '-' + rankA.losePt };
    if (pB) pB.gold = (pB.gold || 0) + rewardB.gold;
    if (pA) pA.gold = (pA.gold || 0) + rewardA.gold;
  } else {
    // 무승부
    if (arenaA) arenaA.dailyCount++;
    if (arenaB) arenaB.dailyCount++;
    rewardA = { gold: 200, result: 'draw', scoreDelta: '0' };
    rewardB = { gold: 200, result: 'draw', scoreDelta: '0' };
    if (pA) pA.gold = (pA.gold || 0) + 200;
    if (pB) pB.gold = (pB.gold || 0) + 200;
  }

  const resultData = {
    matchId, winner, reason, elapsed: match.elapsed,
    nameA: match.playerA.name, nameB: match.playerB.name,
  };

  if (io) {
    io.to(match.playerA.id).emit('arena_match_end', {
      ...resultData, myRole: 'A', reward: rewardA,
      newScore: arenaA?.score || 0, newRank: getRank(arenaA?.score || 0).name,
    });
    io.to(match.playerB.id).emit('arena_match_end', {
      ...resultData, myRole: 'B', reward: rewardB,
      newScore: arenaB?.score || 0, newRank: getRank(arenaB?.score || 0).name,
    });
  }

  setTimeout(() => { delete activeMatches[matchId]; }, 10000);
  return { ended: true };
}

// 소켓 핸들러
function registerArenaHandlers(socket, playerId, players, io) {
  socket.on('arena_join', () => {
    const result = joinQueue(playerId, players);
    socket.emit('arena_result', result);
  });

  socket.on('arena_status', () => {
    const p = players[playerId];
    if (!p) return;
    const arena = getArenaState(p);
    const rank = getRank(arena.score);
    socket.emit('arena_status', {
      score: arena.score, rank: rank.name, rankIcon: rank.icon,
      wins: arena.wins, losses: arena.losses, streak: arena.streak,
      dailyCount: arena.dailyCount, dailyMax: ARENA_CFG.dailyMax, dailyFree: ARENA_CFG.dailyFree,
      seasonReward: SEASON_REWARDS[rank.name],
      queueSize: arenaQueue.length,
    });
  });

  socket.on('arena_cancel', () => {
    const idx = arenaQueue.findIndex(q => q.playerId === playerId);
    if (idx >= 0) { arenaQueue.splice(idx, 1); socket.emit('arena_result', { success: true, msg: '매칭 취소' }); }
  });
}

module.exports = { registerArenaHandlers, tryMatch, getArenaState, getRank, RANKS, SEASON_REWARDS, arenaQueue };
