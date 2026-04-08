// 농장 소켓 핸들러 — v1.85
function registerFarmHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, farm } = ctx;

  socket.on('farm_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('farm_status_result', farm.getFarmStatus(p));
  });

  socket.on('farm_plant', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || typeof data.slotIdx !== 'number' || !data.cropId) {
      socket.emit('farm_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const result = farm.plantCrop(p, data.slotIdx, data.cropId);
    socket.emit('farm_result', result);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
  });

  socket.on('farm_harvest', (slotIdx) => {
    const p = players[playerId];
    if (!p) return;
    const result = farm.harvestCrop(p, Number(slotIdx));
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('farm_result', result);
  });

  socket.on('farm_fertilize', (slotIdx) => {
    const p = players[playerId];
    if (!p) return;
    const result = farm.applyFertilizer(p, Number(slotIdx));
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('farm_result', result);
  });

  socket.on('farm_expand', () => {
    const p = players[playerId];
    if (!p) return;
    const result = farm.expandSlot(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('farm_result', result);
  });
}

module.exports = { registerFarmHandlers };
