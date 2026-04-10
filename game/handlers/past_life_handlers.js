// 환생의 기억 소켓 핸들러 — v2.46

function registerPastLifeHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, pastLife } = ctx;

  socket.on('pastlife_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('pastlife_status_result', pastLife.getStatus(p));
  });

  socket.on('pastlife_equip', (memoryId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof memoryId !== 'string') return;
    const result = pastLife.equipMemory(p, memoryId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('pastlife_result', result);
  });

  socket.on('pastlife_unequip', (memoryId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof memoryId !== 'string') return;
    const result = pastLife.unequipMemory(p, memoryId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('pastlife_result', result);
  });
}

module.exports = { registerPastLifeHandlers };
