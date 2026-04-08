// 변환 소켓 핸들러 — v1.87
function registerTransmutationHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, transmutation } = ctx;

  socket.on('transmutation_options', () => {
    socket.emit('transmutation_options_result', transmutation.getTransmutationOptions());
  });

  socket.on('transmutation_dismantle', (equipId) => {
    const p = players[playerId];
    if (!p) return;
    const result = transmutation.dismantleEquipment(p, equipId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('transmutation_result', result);
  });

  socket.on('transmutation_refine_food', (foodId) => {
    const p = players[playerId];
    if (!p) return;
    const result = transmutation.refineFood(p, foodId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('transmutation_result', result);
  });

  socket.on('transmutation_compress', (tradeId) => {
    const p = players[playerId];
    if (!p) return;
    const result = transmutation.compressTrade(p, tradeId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('transmutation_result', result);
  });

  socket.on('transmutation_upgrade', (recipeId) => {
    const p = players[playerId];
    if (!p) return;
    const result = transmutation.upgradeMaterial(p, recipeId);
    if (result.success || result.failed) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('transmutation_result', result);
  });
}

module.exports = { registerTransmutationHandlers };
