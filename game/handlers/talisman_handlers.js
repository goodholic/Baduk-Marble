// 부적 소켓 핸들러 — v2.13
function registerTalismanHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, talisman } = ctx;

  socket.on('talisman_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('talisman_status_result', talisman.getStatus(p));
  });

  socket.on('talisman_buy', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('talisman_result', { success:false, msg:'데이터 필요' }); return; }
    const result = talisman.buyMaterials(p, data.kind, Number(data.count) || 1);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('talisman_result', result);
  });

  socket.on('talisman_craft', (typeId) => {
    const p = players[playerId]; if (!p) return;
    const result = talisman.craft(p, typeId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('talisman_result', result);
  });

  socket.on('talisman_equip', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('talisman_result', { success:false, msg:'데이터 필요' }); return; }
    const result = talisman.equip(p, Number(data.slot), data.id || null);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('talisman_result', result);
  });
}

module.exports = { registerTalismanHandlers };
