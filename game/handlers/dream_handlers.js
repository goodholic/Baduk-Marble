// 꿈 소켓 핸들러 — v2.10
function registerDreamHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, dream } = ctx;

  socket.on('dream_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('dream_status_result', dream.getStatus(p));
  });

  socket.on('dream_sleep', () => {
    const p = players[playerId]; if (!p) return;
    const result = dream.sleep(p);
    if (result.success) savePlayer(p);
    socket.emit('dream_result', result);
  });

  socket.on('dream_choose', (choiceId) => {
    const p = players[playerId]; if (!p) return;
    const result = dream.choose(p, choiceId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('dream_result', result);
  });
}

module.exports = { registerDreamHandlers };
