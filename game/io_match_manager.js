// ============================================
// IO 배틀로얄 매치 매니저 — 1시간, 100인, 1데스, 단일 서버
// ============================================

const MATCH_CONFIG = {
  maxPlayers: 100,
  matchDuration: 3600,       // 1시간 (초)
  disconnectTimeout: 300,    // 5분 미접속 → 탈락
  reviveCost: 50,            // 다이아
  safeZoneShrinkStart: 600,  // 10분 후부터 축소 시작
  safeZoneShrinkInterval: 300, // 5분마다 축소
  safeZoneStartRadius: 50,   // 맵 반지름 (유닛)
  safeZoneMinRadius: 5,
};

// 매치 상태
let currentMatch = null;

function createMatch() {
  currentMatch = {
    id: `match_${Date.now()}`,
    startTime: Date.now(),
    endTime: Date.now() + MATCH_CONFIG.matchDuration * 1000,
    players: {},       // { socketId: { playerId, name, alive, kills, joinTime, lastHeartbeat } }
    eliminated: [],    // 탈락 순서 기록
    safeZoneRadius: MATCH_CONFIG.safeZoneStartRadius,
    safeZoneCenter: { x: 0, y: 0 },
    status: 'active',  // 'active' | 'ending' | 'finished'
    playerCount: 0,
    aliveCount: 0,
  };
  console.log(`[IO Match] New match created: ${currentMatch.id}`);
  return currentMatch;
}

function getMatch() {
  // 매치가 없거나 끝났으면 새로 생성
  if (!currentMatch || currentMatch.status === 'finished') {
    createMatch();
  }
  return currentMatch;
}

function joinMatch(socketId, playerData) {
  const match = getMatch();
  if (match.playerCount >= MATCH_CONFIG.maxPlayers) {
    return { ok: false, reason: '매치 인원 초과 (100명)' };
  }
  if (match.players[socketId]) {
    // 재접속
    match.players[socketId].lastHeartbeat = Date.now();
    match.players[socketId].disconnected = false;
    return { ok: true, reconnect: true, match: getMatchInfo() };
  }

  match.players[socketId] = {
    playerId: playerData.id || socketId,
    name: playerData.displayName || playerData.name || '???',
    alive: true,
    kills: 0,
    joinTime: Date.now(),
    lastHeartbeat: Date.now(),
    disconnected: false,
    revived: false,
  };
  match.playerCount++;
  match.aliveCount++;

  return { ok: true, match: getMatchInfo() };
}

function playerDeath(socketId, killerId) {
  const match = getMatch();
  const player = match.players[socketId];
  if (!player || !player.alive) return null;

  player.alive = false;
  match.aliveCount--;
  match.eliminated.push({
    playerId: player.playerId,
    name: player.name,
    rank: match.aliveCount + 1,
    kills: player.kills,
    survivalTime: Math.floor((Date.now() - player.joinTime) / 1000),
    killedBy: killerId,
    time: Date.now(),
  });

  // 킬러 킬수 증가
  if (killerId && match.players[killerId]) {
    match.players[killerId].kills++;
  }

  const result = {
    rank: match.aliveCount + 1,
    kills: player.kills,
    survivalTime: Math.floor((Date.now() - player.joinTime) / 1000),
    matchTimeLeft: Math.max(0, Math.floor((match.endTime - Date.now()) / 1000)),
    diamonds: 0, // 클라이언트에서 플레이어 다이아 표시용
    reviveCost: MATCH_CONFIG.reviveCost,
    aliveCount: match.aliveCount,
  };

  // 최후 1인 체크
  if (match.aliveCount <= 1) {
    endMatch();
  }

  return result;
}

function playerRevive(socketId) {
  const match = getMatch();
  const player = match.players[socketId];
  if (!player) return { ok: false, reason: '매치 미참여' };
  if (player.alive) return { ok: false, reason: '이미 살아있음' };
  if (player.revived) return { ok: false, reason: '이미 1회 부활 사용' };

  player.alive = true;
  player.revived = true;
  match.aliveCount++;

  return { ok: true };
}

function playerDisconnect(socketId) {
  const match = getMatch();
  const player = match.players[socketId];
  if (!player || !player.alive) return;
  player.disconnected = true;
  player.disconnectTime = Date.now();
}

function playerHeartbeat(socketId) {
  const match = getMatch();
  const player = match.players[socketId];
  if (player) player.lastHeartbeat = Date.now();
}

// 매치 틱 (매 30초 호출)
function matchTick(io) {
  const match = getMatch();
  if (match.status !== 'active') return;
  const now = Date.now();

  // 1. 시간 만료 체크
  if (now >= match.endTime) {
    endMatch();
    return;
  }

  // 2. 미접속 플레이어 탈락
  for (const [sid, p] of Object.entries(match.players)) {
    if (p.alive && p.disconnected && now - p.disconnectTime > MATCH_CONFIG.disconnectTimeout * 1000) {
      p.alive = false;
      match.aliveCount--;
      match.eliminated.push({
        playerId: p.playerId, name: p.name,
        rank: match.aliveCount + 1, kills: p.kills,
        survivalTime: Math.floor((now - p.joinTime) / 1000),
        killedBy: 'disconnect', time: now,
      });
      try { io.to(sid).emit('br_eliminated', { reason: '5분 미접속 탈락', result: { rank: match.aliveCount + 1 } }); } catch(e) {}
    }
  }

  // 3. 안전 구역 축소
  const elapsed = (now - match.startTime) / 1000;
  if (elapsed > MATCH_CONFIG.safeZoneShrinkStart) {
    const shrinkSteps = Math.floor((elapsed - MATCH_CONFIG.safeZoneShrinkStart) / MATCH_CONFIG.safeZoneShrinkInterval);
    match.safeZoneRadius = Math.max(
      MATCH_CONFIG.safeZoneMinRadius,
      MATCH_CONFIG.safeZoneStartRadius - shrinkSteps * 5
    );
  }

  // 4. 최후 1인 체크
  if (match.aliveCount <= 1) {
    endMatch();
    return;
  }

  // 5. 매치 상태 브로드캐스트
  io.emit('br_match_tick', {
    timeLeft: Math.max(0, Math.floor((match.endTime - now) / 1000)),
    alive: match.aliveCount,
    total: match.playerCount,
    safeZoneRadius: match.safeZoneRadius,
  });
}

function endMatch() {
  const match = getMatch();
  if (match.status === 'finished') return;
  match.status = 'finished';

  // 생존자 순위 기록
  const survivors = Object.entries(match.players).filter(([, p]) => p.alive);
  survivors.forEach(([sid, p], idx) => {
    match.eliminated.push({
      playerId: p.playerId, name: p.name,
      rank: survivors.length - idx,
      kills: p.kills,
      survivalTime: Math.floor((Date.now() - p.joinTime) / 1000),
      time: Date.now(),
    });
  });

  console.log(`[IO Match] Match ${match.id} ended. Players: ${match.playerCount}, Winner: ${survivors[0]?.[1]?.name || 'none'}`);
  return match;
}

function getMatchInfo() {
  const match = getMatch();
  return {
    id: match.id,
    status: match.status,
    timeLeft: Math.max(0, Math.floor((match.endTime - Date.now()) / 1000)),
    playerCount: match.playerCount,
    aliveCount: match.aliveCount,
    safeZoneRadius: match.safeZoneRadius,
  };
}

function getMatchResults() {
  const match = currentMatch;
  if (!match) return [];
  return match.eliminated.sort((a, b) => a.rank - b.rank);
}

module.exports = {
  MATCH_CONFIG, createMatch, getMatch, joinMatch, playerDeath, playerRevive,
  playerDisconnect, playerHeartbeat, matchTick, endMatch, getMatchInfo, getMatchResults,
};
