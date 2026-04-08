// 변신 소켓 핸들러 — v2.01
function registerMorphHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, morph } = ctx;

  socket.on('morph_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('morph_status_result', morph.getStatus(p));
  });

  socket.on('morph_transform', (formId) => {
    const p = players[playerId]; if (!p) return;
    const result = morph.transform(p, formId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('morph_result', result);
  });

  socket.on('morph_revert', () => {
    const p = players[playerId]; if (!p) return;
    const result = morph.revert(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('morph_result', result);
  });
}

module.exports = { registerMorphHandlers };
