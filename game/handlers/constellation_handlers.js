// 별자리 소켓 핸들러 — v1.93
function registerConstellationHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, constellation } = ctx;

  socket.on('constellation_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('constellation_status_result', constellation.getStatus(p));
  });

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
}

module.exports = { registerConstellationHandlers };
