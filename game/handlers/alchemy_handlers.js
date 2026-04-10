// 금지된 연금술 소켓 핸들러 — v2.49

function registerAlchemyHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, forbiddenAlchemy } = ctx;

  socket.on('alchemy_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('alchemy_status_result', forbiddenAlchemy.getStatus(p));
  });

  socket.on('alchemy_brew', (itemIds) => {
    const p = players[playerId]; if (!p) return;
    if (!Array.isArray(itemIds)) return;
    if (itemIds.length < 2 || itemIds.length > 4) return;
    if (!itemIds.every(id => typeof id === 'string')) return;

    const result = forbiddenAlchemy.brew(p, itemIds);
    if (result.success) {
      savePlayer(p);
      if (result.crafted && result.isNew) {
        io.emit('server_msg', { msg: `⚗️ ${p.displayName}: 새 레시피 [${result.recipe.icon} ${result.recipe.name}] 발견!`, type: 'legendary' });
      }
      io.emit('player_update', p);
    }
    socket.emit('alchemy_result', result);
  });
}

module.exports = { registerAlchemyHandlers };
