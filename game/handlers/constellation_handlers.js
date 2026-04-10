// 운명의 별자리 소켓 핸들러 — v2.40 (v1.93 확장)
function registerConstellationHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, constellation } = ctx;

  // 상태 조회
  socket.on('constellation_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('constellation_status_result', constellation.getStatus(p));
  });

  // 일일 관측
  socket.on('constellation_observe', () => {
    const p = players[playerId]; if (!p) return;
    const result = constellation.observe(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.completed) {
        io.emit('server_msg', {
          msg: `🌌 ${p.displayName}이(가) 12 별자리 모두 관측 — 별의 인도자!`,
          type: 'rare',
        });
      }
    }
    socket.emit('constellation_result', result);
  });

  // v2.40: 노드 해금
  socket.on('constellation_unlock', (nodeId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof nodeId !== 'string') return;
    const result = constellation.unlockNode(p, nodeId);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.zodiacComplete) {
        io.emit('server_msg', {
          msg: `🌟 ${p.displayName}: ${result.completeBonus?.name || result.zodiacId + ' 마스터'}! — ${result.completeBonus?.desc || ''}`,
          type: 'rare',
        });
      }
      if (result.grandMaster) {
        io.emit('server_msg', {
          msg: `🌌✨ ${p.displayName}이(가) 별의 지배자 달성! 60개 별 노드 전체 해금!`,
          type: 'legendary',
        });
      }
    }
    socket.emit('constellation_unlock_result', result);
  });
}

module.exports = { registerConstellationHandlers };
