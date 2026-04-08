// 동료 소켓 핸들러 — v1.88
function registerCompanionHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, companion } = ctx;

  socket.on('companion_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('companion_status_result', companion.getStatus(p));
  });

  socket.on('companion_set_active', (companionId) => {
    const p = players[playerId];
    if (!p) return;
    const result = companion.setActive(p, companionId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('companion_result', result);
  });

  socket.on('companion_gift', (data) => {
    const p = players[playerId];
    if (!p || !data || !data.companionId || !data.itemId) {
      socket.emit('companion_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const result = companion.giveGift(p, data.companionId, data.itemId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('companion_result', result);
  });

  socket.on('companion_talk', (companionId) => {
    const p = players[playerId];
    if (!p) return;
    const result = companion.talk(p, companionId);
    if (result.success) savePlayer(p);
    socket.emit('companion_result', result);
  });
}

module.exports = { registerCompanionHandlers };
