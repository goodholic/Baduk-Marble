// 차원 균열 소켓 핸들러 — v2.17
function registerRiftHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, rift } = ctx;

  socket.on('rift_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('rift_status_result', rift.getStatus(p));
  });

  socket.on('rift_challenge', () => {
    const p = players[playerId]; if (!p) return;
    const result = rift.challenge(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.boss && result.victory) {
        io.emit('server_msg', {
          msg: `👑 ${p.displayName}이(가) 균열의 군주를 처치 — 등급 ${result.tier}!`,
          type: 'rare',
        });
      }
    }
    socket.emit('rift_result', result);
  });
}

module.exports = { registerRiftHandlers };
