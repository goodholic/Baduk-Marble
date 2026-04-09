// 요리 소켓 핸들러 — v1.92
function registerCookingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, cooking } = ctx;

  socket.on('cooking_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('cooking_status_result', cooking.getStatus(p));
  });

  socket.on('cooking_buy', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data || !data.id) {
      socket.emit('cooking_result', { success:false, msg:'재료 ID 필요' });
      return;
    }
    const result = cooking.buyIngredient(p, data.id, Math.min(999, Math.max(1, Math.floor(Number(data.count)) || 1)));
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('cooking_result', result);
  });

  socket.on('cooking_learn', (recipeId) => {
    const p = players[playerId]; if (!p) return;
    const result = cooking.learnRecipe(p, recipeId);
    if (result.success) savePlayer(p);
    socket.emit('cooking_result', result);
  });

  socket.on('cooking_cook', (recipeId) => {
    const p = players[playerId]; if (!p) return;
    const result = cooking.cook(p, recipeId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('cooking_result', result);
  });
}

module.exports = { registerCookingHandlers };
