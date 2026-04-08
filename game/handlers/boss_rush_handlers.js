// 보스 러시 소켓 핸들러 — v1.84 (server.js에서 분리)
// ctx = { io, players, playerId, savePlayer, bossRush, bossRushSessions,
//         bossRushRanking, finishBossRush }

function registerBossRushHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, bossRush, bossRushSessions,
          bossRushRanking, finishBossRush } = ctx;

  socket.on('boss_rush_status', () => {
    const p = players[playerId];
    if (!p) return;
    const session = bossRushSessions[playerId] || null;
    socket.emit('boss_rush_status_result', {
      canFreeEntry: bossRush.canFreeEntry(p),
      freeEntriesLeft: Math.max(0, bossRush.BOSS_RUSH_CONFIG.freeEntriesPerDay - ((p.bossRushUsed && p.bossRushDate === new Date().toISOString().slice(0,10)) ? p.bossRushUsed : 0)),
      entryGold: bossRush.BOSS_RUSH_CONFIG.goldEntryPrice,
      entryDiamond: bossRush.BOSS_RUSH_CONFIG.diamondEntryPrice,
      totalWaves: bossRush.BOSS_RUSH_CONFIG.totalWaves,
      currentSession: session ? {
        currentWave: session.currentWave,
        elapsedSec: Math.floor((Date.now() - session.startTime) / 1000),
        waveInfo: bossRush.BOSS_RUSH_WAVES[session.currentWave - 1] || null,
      } : null,
      ranking: bossRushRanking.slice(0, 10),
      bestWave: p.bossRushBestWave || 0,
    });
  });

  socket.on('boss_rush_enter', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (bossRushSessions[playerId]) {
      socket.emit('boss_rush_result', { success: false, msg: '이미 진행 중인 러시가 있습니다' });
      return;
    }
    const useFree = data && data.useFree;
    if (useFree) {
      if (!bossRush.canFreeEntry(p)) {
        socket.emit('boss_rush_result', { success: false, msg: '오늘 무료 입장 횟수 소진' });
        return;
      }
      bossRush.consumeFreeEntry(p);
    } else {
      const currency = (data && data.currency === 'diamond') ? 'diamond' : 'gold';
      const result = bossRush.payEntry(p, currency);
      if (!result.success) {
        socket.emit('boss_rush_result', result);
        return;
      }
    }
    bossRushSessions[playerId] = {
      currentWave: 1,
      startTime: Date.now(),
      waveStart: Date.now(),
      killsInWave: 0,
    };
    savePlayer(p);
    socket.emit('boss_rush_result', {
      success: true,
      msg: '보스 러시 시작!',
      wave: 1,
      waveInfo: bossRush.BOSS_RUSH_WAVES[0],
    });
    io.emit('player_update', p);
  });

  socket.on('boss_rush_advance', () => {
    const p = players[playerId];
    const session = bossRushSessions[playerId];
    if (!p || !session) {
      socket.emit('boss_rush_result', { success: false, msg: '진행 중인 러시 없음' });
      return;
    }
    const wave = bossRush.BOSS_RUSH_WAVES[session.currentWave - 1];
    if (!wave) return;
    const elapsed = (Date.now() - session.waveStart) / 1000;
    if (elapsed > wave.timeLimit) {
      finishBossRush(playerId, false);
      socket.emit('boss_rush_result', { success: false, msg: `웨이브 ${session.currentWave} 시간 초과 (${wave.timeLimit}초)` });
      return;
    }
    session.currentWave++;
    session.waveStart = Date.now();
    if (session.currentWave > bossRush.BOSS_RUSH_CONFIG.totalWaves) {
      finishBossRush(playerId, true);
      return;
    }
    const next = bossRush.BOSS_RUSH_WAVES[session.currentWave - 1];
    socket.emit('boss_rush_result', {
      success: true,
      msg: `웨이브 ${session.currentWave - 1} 클리어! 다음: ${next.name}`,
      wave: session.currentWave,
      waveInfo: next,
    });
  });

  socket.on('boss_rush_abandon', () => {
    if (!bossRushSessions[playerId]) return;
    finishBossRush(playerId, false);
    socket.emit('boss_rush_result', { success: true, msg: '러시 포기' });
  });
}

module.exports = { registerBossRushHandlers };
