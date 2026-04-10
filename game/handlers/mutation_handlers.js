// 몬스터 변이 소켓 핸들러 — v2.47

function registerMutationHandlers(socket, ctx) {
  const { io, players, playerId, mutation } = ctx;

  socket.on('mutation_codex', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('mutation_codex_result', mutation.getStatus(p));
  });
}

module.exports = { registerMutationHandlers };
