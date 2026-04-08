// 트랜스모그 소켓 핸들러 — v1.88
function registerTransmogHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, transmog } = ctx;

  socket.on('transmog_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('transmog_status_result', transmog.getStatus(p));
  });

  socket.on('transmog_apply', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.skinId) {
      socket.emit('transmog_result', { success: false, msg: '스킨 미지정' });
      return;
    }
    const result = transmog.applySkin(p, data.skinId, data.slot || null);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('transmog_result', result);
  });

  socket.on('transmog_remove', (slot) => {
    const p = players[playerId];
    if (!p) return;
    const result = transmog.removeSkin(p, slot);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('transmog_result', result);
  });
}

module.exports = { registerTransmogHandlers };
