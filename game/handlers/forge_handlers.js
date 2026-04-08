// 제련 소켓 핸들러 — v1.98
function registerForgeHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, forge } = ctx;

  socket.on('forge_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('forge_status_result', forge.getStatus(p));
  });

  socket.on('forge_refuel', (amount) => {
    const p = players[playerId]; if (!p) return;
    const result = forge.refuel(p, Number(amount) || 10);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('forge_result', result);
  });

  socket.on('forge_start', (recipeId) => {
    const p = players[playerId]; if (!p) return;
    const result = forge.startForge(p, recipeId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('forge_result', result);
  });

  socket.on('forge_speedup', (jobIndex) => {
    const p = players[playerId]; if (!p) return;
    const result = forge.speedup(p, Number(jobIndex) || 0);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('forge_result', result);
  });
}

module.exports = { registerForgeHandlers };
