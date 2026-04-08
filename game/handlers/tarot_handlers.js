// 타로 소켓 핸들러 — v2.12
function registerTarotHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, tarot } = ctx;

  socket.on('tarot_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('tarot_status_result', tarot.getStatus(p));
  });

  socket.on('tarot_read', () => {
    const p = players[playerId]; if (!p) return;
    const result = tarot.read(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('tarot_result', result);
  });
}

module.exports = { registerTarotHandlers };
