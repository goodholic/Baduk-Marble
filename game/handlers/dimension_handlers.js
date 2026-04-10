// 차원 여행자 소켓 핸들러 — v2.54

function registerDimensionHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, dimensionTraveler } = ctx;

  socket.on('dim_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('dim_status_result', dimensionTraveler.getStatus(p));
  });

  socket.on('dim_enter', (dimId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof dimId !== 'string') return;
    const result = dimensionTraveler.enterDimension(p, dimId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.dimension.icon} ${p.displayName}이(가) ${result.dimension.name}에 진입!`, type: 'rare' });
    }
    socket.emit('dim_result', result);
  });

  socket.on('dim_clear_stage', () => {
    const p = players[playerId]; if (!p) return;
    const result = dimensionTraveler.clearStage(p);
    if (result.success) {
      savePlayer(p);
      if (result.cleared) {
        io.emit('server_msg', { msg: `${p.displayName}: ${result.msg}`, type: 'legendary' });
      }
      io.emit('player_update', p);
    }
    socket.emit('dim_result', result);
  });

  socket.on('dim_abandon', () => {
    const p = players[playerId]; if (!p) return;
    const result = dimensionTraveler.abandonDimension(p);
    if (result.success) savePlayer(p);
    socket.emit('dim_result', result);
  });

  socket.on('dim_buy', (itemId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof itemId !== 'string') return;
    const result = dimensionTraveler.buyShopItem(p, itemId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('dim_result', result);
  });
}

module.exports = { registerDimensionHandlers };
