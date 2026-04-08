// 가면 소켓 핸들러 — v2.15
function registerMaskHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, mask } = ctx;

  socket.on('mask_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('mask_status_result', mask.getStatus(p));
  });

  socket.on('mask_buy', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = mask.buyMask(p, id);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('mask_result', result);
  });

  socket.on('mask_equip', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = mask.equip(p, id);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('mask_result', result);
  });
}

module.exports = { registerMaskHandlers };
