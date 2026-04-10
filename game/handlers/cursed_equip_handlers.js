// 저주받은 장비 소켓 핸들러 — v2.48

function registerCursedEquipHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, cursedEquipment, recalcStats } = ctx;

  socket.on('cursed_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('cursed_status_result', cursedEquipment.getStatus(p));
  });

  socket.on('cursed_equip', (itemId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof itemId !== 'string') return;
    const result = cursedEquipment.equipCursed(p, itemId);
    if (result.success) {
      recalcStats(p);
      savePlayer(p);
      io.emit('server_msg', { msg: `⚠️ ${p.displayName}: ${result.item.icon} ${result.item.name} 장착! [저주: ${result.item.curse.name}]`, type: 'legendary' });
      io.emit('player_update', p);
    }
    socket.emit('cursed_result', result);
  });

  socket.on('cursed_purify', (itemId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof itemId !== 'string') return;
    const result = cursedEquipment.purify(p, itemId);
    if (result.success) {
      recalcStats(p);
      savePlayer(p);
      io.emit('server_msg', { msg: `✨ ${p.displayName}: ${result.purified.name} 정화 완료! — ${result.purified.special}`, type: 'legendary' });
      io.emit('player_update', p);
    }
    socket.emit('cursed_result', result);
  });
}

module.exports = { registerCursedEquipHandlers };
