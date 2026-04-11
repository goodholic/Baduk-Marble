// 길드 공성전 리워크 — v2.59
// 실시간 점령 포인트 기반, 3팀 동시 공성

const SIEGE_CONFIG = {
  duration: 300,        // 5분
  capturePoints: 3,     // 점령 포인트 3개
  captureTime: 15,      // 15초 점령
  pointsPerTick: 10,    // 점령 시 초당 10점
  killPoints: 50,       // 킬당 50점
  minGuilds: 2,
  rewards: {
    winner: { gold: 50000, diamonds: 200, title: 'siege_champion' },
    participant: { gold: 5000, diamonds: 20 },
  },
};

let siegeState = { phase: 'idle', guilds: {}, points: {}, captureOwners: {}, startTime: 0 };
let _siegeInterval = null;

function startSiege(io, guilds) {
  if (siegeState.phase !== 'idle') return { success: false, msg: '이미 공성전 진행 중' };
  if (!guilds || guilds.length < SIEGE_CONFIG.minGuilds) return { success: false, msg: '최소 ' + SIEGE_CONFIG.minGuilds + '개 길드 필요' };

  siegeState = {
    phase: 'active',
    guilds: {},
    points: {},
    captureOwners: { A: null, B: null, C: null },
    startTime: Date.now(),
    kills: {},
  };

  guilds.forEach(g => {
    siegeState.guilds[g.id] = { name: g.name, members: g.members || [] };
    siegeState.points[g.id] = 0;
    siegeState.kills[g.id] = 0;
  });

  if (io) {
    io.emit('server_msg', { msg: '🏰 공성전 시작! ' + guilds.map(g => g.name).join(' vs '), type: 'boss' });
    io.emit('siege_start', { guilds: guilds.map(g => ({ id: g.id, name: g.name })), duration: SIEGE_CONFIG.duration });
  }

  _siegeInterval = setInterval(() => tickSiege(io), 1000);
  setTimeout(() => endSiege(io), SIEGE_CONFIG.duration * 1000);

  return { success: true };
}

function tickSiege(io) {
  if (siegeState.phase !== 'active') return;
  // 점령 포인트 소유 길드에 점수 부여
  for (const [point, ownerId] of Object.entries(siegeState.captureOwners)) {
    if (ownerId && siegeState.points[ownerId] !== undefined) {
      siegeState.points[ownerId] += SIEGE_CONFIG.pointsPerTick;
    }
  }
  // 5초마다 상태 브로드캐스트
  const elapsed = Math.floor((Date.now() - siegeState.startTime) / 1000);
  if (elapsed % 5 === 0 && io) {
    io.emit('siege_update', {
      points: siegeState.points,
      captureOwners: siegeState.captureOwners,
      kills: siegeState.kills,
      remaining: Math.max(0, SIEGE_CONFIG.duration - elapsed),
    });
  }
}

function capturePoint(guildId, pointName) {
  if (siegeState.phase !== 'active') return { success: false };
  if (!['A', 'B', 'C'].includes(pointName)) return { success: false };
  siegeState.captureOwners[pointName] = guildId;
  return { success: true, point: pointName, guild: siegeState.guilds[guildId]?.name };
}

function siegeKill(killerGuildId) {
  if (siegeState.phase !== 'active') return;
  if (siegeState.points[killerGuildId] !== undefined) {
    siegeState.points[killerGuildId] += SIEGE_CONFIG.killPoints;
    siegeState.kills[killerGuildId] = (siegeState.kills[killerGuildId] || 0) + 1;
  }
}

function endSiege(io) {
  if (_siegeInterval) { clearInterval(_siegeInterval); _siegeInterval = null; }
  siegeState.phase = 'idle';

  const rankings = Object.entries(siegeState.points)
    .sort((a, b) => b[1] - a[1])
    .map(([gid, pts], i) => ({ rank: i + 1, guildId: gid, name: siegeState.guilds[gid]?.name, points: pts, kills: siegeState.kills[gid] || 0 }));

  if (io && rankings.length > 0) {
    io.emit('server_msg', { msg: '🏆 공성전 승리: ' + rankings[0].name + ' (' + rankings[0].points + '점)', type: 'boss' });
    io.emit('siege_end', { rankings });
  }
}

function registerSiegeHandlers(socket, playerId, players, io) {
  socket.on('siege_capture', (pointName) => {
    const p = players[playerId];
    if (!p || !p.clanId) return;
    const result = capturePoint(p.clanId, pointName);
    if (result.success) {
      io.emit('server_msg', { msg: '🚩 ' + result.guild + '이(가) 거점 ' + result.point + ' 점령!', type: 'danger' });
    }
    socket.emit('siege_result', result);
  });

  socket.on('siege_status', () => {
    socket.emit('siege_status', {
      phase: siegeState.phase,
      points: siegeState.points,
      captureOwners: siegeState.captureOwners,
      remaining: siegeState.phase === 'active' ? Math.max(0, SIEGE_CONFIG.duration - Math.floor((Date.now() - siegeState.startTime) / 1000)) : 0,
    });
  });
}

module.exports = { startSiege, capturePoint, siegeKill, registerSiegeHandlers, SIEGE_CONFIG };
