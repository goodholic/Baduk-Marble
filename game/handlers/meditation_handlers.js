// 명상 소켓 핸들러 — v1.91
function registerMeditationHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, meditation } = ctx;

  socket.on('meditation_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('meditation_status_result', meditation.getStatus(p));
  });

  socket.on('meditation_start', (zoneId) => {
    const p = players[playerId]; if (!p) return;
    const result = meditation.startSession(p, zoneId);
    if (result.success) savePlayer(p);
    socket.emit('meditation_result', result);
  });

  socket.on('meditation_end', () => {
    const p = players[playerId]; if (!p) return;
    const result = meditation.endSession(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('meditation_result', result);
  });

  socket.on('meditation_buy', (perkId) => {
    const p = players[playerId]; if (!p) return;
    const result = meditation.buyPerk(p, perkId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('meditation_result', result);
  });
}

module.exports = { registerMeditationHandlers };
