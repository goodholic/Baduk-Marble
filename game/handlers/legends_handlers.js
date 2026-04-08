// 위인 전당 소켓 핸들러 — v1.99
function registerLegendsHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, legends } = ctx;

  socket.on('legends_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('legends_status_result', legends.getStatus(p));
  });

  socket.on('legends_study', (legendId) => {
    const p = players[playerId]; if (!p) return;
    const result = legends.study(p, legendId);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.completed) {
        io.emit('server_msg', {
          msg: `📜 ${p.displayName}이(가) 12 위인을 모두 학습 — 역사의 증인!`,
          type: 'rare',
        });
      }
    }
    socket.emit('legends_result', result);
  });
}

module.exports = { registerLegendsHandlers };
