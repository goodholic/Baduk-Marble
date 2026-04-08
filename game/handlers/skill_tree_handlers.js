// 특성 트리 소켓 핸들러 — v1.85
function registerSkillTreeHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, skillTree } = ctx;

  socket.on('talent_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('talent_status_result', skillTree.getTreeStatus(p));
  });

  socket.on('talent_spend', (nodeId) => {
    const p = players[playerId];
    if (!p) return;
    const result = skillTree.spendPoint(p, nodeId);
    socket.emit('talent_spend_result', result);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
  });

  socket.on('talent_reset', () => {
    const p = players[playerId];
    if (!p) return;
    const cost = skillTree.TREE_CONFIG.resetCostDiamond;
    if ((p.diamonds || 0) < cost) {
      socket.emit('talent_reset_result', { success: false, msg: `다이아 ${cost}개 필요` });
      return;
    }
    p.diamonds -= cost;
    const result = skillTree.resetTree(p);
    savePlayer(p);
    socket.emit('talent_reset_result', { success: true, refunded: result.refunded });
    io.emit('player_update', p);
  });
}

module.exports = { registerSkillTreeHandlers };
