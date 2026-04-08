// 정원 소켓 핸들러 — v2.18
function registerGardenHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, garden } = ctx;

  socket.on('garden_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('garden_status_result', garden.getStatus(p));
  });

  socket.on('garden_plant', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('garden_result', { success:false, msg:'데이터 필요' }); return; }
    const result = garden.plant(p, Number(data.slot), data.flower);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('garden_result', result);
  });

  socket.on('garden_harvest', (slotIndex) => {
    const p = players[playerId]; if (!p) return;
    const result = garden.harvest(p, Number(slotIndex));
    if (result.success) savePlayer(p);
    socket.emit('garden_result', result);
  });
}

module.exports = { registerGardenHandlers };
