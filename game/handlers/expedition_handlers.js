// 원정 소켓 핸들러 — v1.87
function registerExpeditionHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, expedition } = ctx;

  socket.on('expedition_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('expedition_status_result', expedition.getStatus(p));
  });

  socket.on('expedition_start', (expId) => {
    const p = players[playerId];
    if (!p) return;
    const result = expedition.startExpedition(p, expId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('expedition_result', result);
  });

  socket.on('expedition_branch', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.expId || !data.option) {
      socket.emit('expedition_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const result = expedition.pickBranch(p, data.expId, data.option);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('expedition_result', result);
  });
}

module.exports = { registerExpeditionHandlers };
