// 신탁 소켓 핸들러 — v1.96
function registerOracleHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, oracle } = ctx;

  socket.on('oracle_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('oracle_status_result', oracle.getStatus(p));
  });

  socket.on('oracle_consult', () => {
    const p = players[playerId]; if (!p) return;
    const result = oracle.consult(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('oracle_result', result);
  });
}

module.exports = { registerOracleHandlers };
