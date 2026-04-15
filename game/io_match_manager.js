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

// 동적 매치 이벤트
const MATCH_EVENTS = [
  { id: 'meteor_shower', name: '유성우🌠', time: 120, duration: 30, effect: 'random damage zone', desc: '하늘에서 유성이 쏟아진다!' },
  { id: 'supply_drop', name: '보급 투하📦', time: 300, duration: 60, effect: 'loot crates spawn', desc: '전설 장비가 들어있는 보급 상자!' },
  { id: 'world_boss', name: '월드보스 출현🐉', time: 600, duration: 120, effect: 'boss spawn center', desc: '고대 드래곤 출현! 처치 시 전설 보상!' },
  { id: 'fog_of_war', name: '전장의 안개🌫️', time: 900, duration: 90, effect: 'vision reduced', desc: '시야가 50%로 줄어든다!' },
  { id: 'blood_moon', name: '블러드문🌑', time: 1200, duration: 120, effect: 'damage +30%', desc: '붉은 달! 모든 데미지 30% 증가!' },
  { id: 'treasure_vault', name: '보물 금고💰', time: 1500, duration: 60, effect: 'gold zone spawn', desc: '중앙에 보물 금고 출현! 접근 시 대량 골드!' },
  { id: 'poison_gas', name: '독안개☠️', time: 1800, duration: 90, effect: 'dot outside safe', desc: '안전구역 외부 독 데미지 2배!' },
  { id: 'berserk', name: '광폭화💢', time: 2400, duration: 180, effect: 'all stats +50%', desc: '모든 플레이어 전투력 50% 증가!' },
  { id: 'final_hunt', name: '최후의 사냥🎯', time: 3000, duration: 300, effect: 'kill reveals location', desc: '킬 시 모든 적 위치가 5초간 공개!' },
  { id: 'armageddon', name: '아마겟돈🔥', time: 3300, duration: 300, effect: 'zone shrinks fast', desc: '최종 단계! 안전구역 급속 축소!' },
];

// 킬 스트릭 시스템
const KILL_STREAKS = [
  { kills: 3, name: '연속 처치🔥', reward: { gold: 500 }, buff: { atk: 1.1 } },
  { kills: 5, name: '살인마💀', reward: { gold: 1500 }, buff: { atk: 1.2, def: 1.1 } },
  { kills: 7, name: '학살자☠️', reward: { gold: 3000, diamonds: 5 }, buff: { atk: 1.3, def: 1.2 } },
  { kills: 10, name: '전장의 신⚔️', reward: { gold: 5000, diamonds: 10 }, buff: { atk: 1.5, def: 1.3 } },
  { kills: 15, name: '전설🌟', reward: { gold: 10000, diamonds: 20 }, buff: { atk: 1.8, def: 1.5 } },
  { kills: 20, name: '불멸의 왕👑', reward: { gold: 20000, diamonds: 50 }, buff: { atk: 2.0, def: 2.0 } },
];

function checkKillStreak(player) {
  const streak = KILL_STREAKS.slice().reverse().find(s => player.kills >= s.kills);
  if (!streak) return null;
  // 이미 알림한 스트릭이면 스킵
  if (player._lastStreakKills >= streak.kills) return null;
  player._lastStreakKills = streak.kills;
  // 버프 적용
  player.buff = { ...(player.buff || {}), ...streak.buff };
  return streak;
}

function getActiveEvents(match) {
  if (!match || !match.activeEvents) return [];
  const now = Date.now();
  return match.activeEvents.filter(e => now < e.endsAt);
}

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
    activeEvents: [],     // 현재 활성 이벤트
    triggeredEvents: {},  // 이미 트리거된 이벤트 id → true
    rewards: [],          // 매치 종료 시 보상 기록
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

  // 킬러 킬수 증가 + 킬스트릭 체크
  let killStreakInfo = null;
  if (killerId && match.players[killerId]) {
    match.players[killerId].kills++;
    killStreakInfo = checkKillStreak(match.players[killerId]);
  }

  const result = {
    rank: match.aliveCount + 1,
    kills: player.kills,
    survivalTime: Math.floor((Date.now() - player.joinTime) / 1000),
    matchTimeLeft: Math.max(0, Math.floor((match.endTime - Date.now()) / 1000)),
    diamonds: 0, // 클라이언트에서 플레이어 다이아 표시용
    reviveCost: MATCH_CONFIG.reviveCost,
    aliveCount: match.aliveCount,
    killerStreak: killStreakInfo, // 킬러의 스트릭 정보 (있으면)
    activeEvents: getActiveEvents(match).map(e => ({ id: e.id, name: e.name })),
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

  // 4. 동적 이벤트 체크 & 트리거
  // 만료된 이벤트 제거
  match.activeEvents = match.activeEvents.filter(e => now < e.endsAt);

  // 새 이벤트 트리거
  for (const evt of MATCH_EVENTS) {
    if (match.triggeredEvents[evt.id]) continue;
    if (elapsed >= evt.time) {
      match.triggeredEvents[evt.id] = true;
      const activeEvt = {
        id: evt.id,
        name: evt.name,
        effect: evt.effect,
        desc: evt.desc,
        startedAt: now,
        endsAt: now + evt.duration * 1000,
      };
      match.activeEvents.push(activeEvt);
      console.log(`[IO Match] Event triggered: ${evt.name} (${evt.id})`);
      try {
        io.emit('br_event', {
          type: 'start',
          event: { id: evt.id, name: evt.name, effect: evt.effect, desc: evt.desc, duration: evt.duration },
        });
      } catch (e) {}
    }
  }

  // 이벤트 종료 알림 (이전 틱에서 활성이었지만 이번에 만료된 이벤트)
  // (activeEvents 필터 전에 비교하면 복잡해지므로, 종료 알림은 클라이언트가 duration 기반으로 처리)

  // 5. 최후 1인 체크
  if (match.aliveCount <= 1) {
    endMatch();
    return;
  }

  // 6. 매치 상태 브로드캐스트
  const activeEvts = getActiveEvents(match).map(e => ({ id: e.id, name: e.name, effect: e.effect }));
  io.emit('br_match_tick', {
    timeLeft: Math.max(0, Math.floor((match.endTime - now) / 1000)),
    alive: match.aliveCount,
    total: match.playerCount,
    safeZoneRadius: match.safeZoneRadius,
    activeEvents: activeEvts,
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

  // 보상 계산
  const allResults = match.eliminated.sort((a, b) => a.rank - b.rank);
  match.rewards = allResults.map(r => {
    let gold = 500, diamonds = 0, cards = 1;
    if (r.rank === 1) { gold = 10000; diamonds = 30; cards = 3; }
    else if (r.rank <= 3) { gold = 5000; diamonds = 15; cards = 2; }
    else if (r.rank <= 10) { gold = 2000; diamonds = 5; cards = 1; }
    // 킬당 보너스 골드
    gold += (r.kills || 0) * 200;
    return {
      playerId: r.playerId,
      name: r.name,
      rank: r.rank,
      kills: r.kills,
      gold,
      diamonds,
      cards,
    };
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
  MATCH_CONFIG, MATCH_EVENTS, KILL_STREAKS,
  createMatch, getMatch, joinMatch, playerDeath, playerRevive,
  playerDisconnect, playerHeartbeat, matchTick, endMatch, getMatchInfo, getMatchResults,
  checkKillStreak, getActiveEvents,
};
