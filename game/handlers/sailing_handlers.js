// 항해 소켓 핸들러 — v2.08
function registerSailingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, sailing } = ctx;

  socket.on('sailing_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('sailing_status_result', sailing.getStatus(p));
  });

  socket.on('sailing_buy', (shipId) => {
    const p = players[playerId]; if (!p) return;
    const result = sailing.buyShip(p, shipId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('sailing_result', result);
  });

  socket.on('sailing_repair', () => {
    const p = players[playerId]; if (!p) return;
    const result = sailing.repair(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('sailing_result', result);
  });

  socket.on('sailing_depart', (islandId) => {
    const p = players[playerId]; if (!p) return;
    const result = sailing.depart(p, islandId);
    if (result.success) savePlayer(p);
    socket.emit('sailing_result', result);
  });

  socket.on('sailing_arrive', () => {
    const p = players[playerId]; if (!p) return;
    const result = sailing.arrive(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('sailing_result', result);
  });
}

module.exports = { registerSailingHandlers };
