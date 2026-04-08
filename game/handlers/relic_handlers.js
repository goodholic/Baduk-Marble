// 유물 소켓 핸들러 — v1.86
function registerRelicHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, relic } = ctx;

  socket.on('relic_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('relic_status_result', relic.getStatus(p));
  });

  socket.on('relic_equip', (relicId) => {
    const p = players[playerId];
    if (!p) return;
    const result = relic.equipRelic(p, relicId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('relic_equip_result', result);
  });

  socket.on('relic_unequip', (relicId) => {
    const p = players[playerId];
    if (!p) return;
    const result = relic.unequipRelic(p, relicId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('relic_unequip_result', result);
  });

  socket.on('relic_enchant', (relicId) => {
    const p = players[playerId];
    if (!p) return;
    const result = relic.enchantRelic(p, relicId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('relic_enchant_result', result);
  });
}

module.exports = { registerRelicHandlers };
