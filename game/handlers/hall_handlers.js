// 영웅의 전당 소켓 핸들러 — v2.51

function registerHallHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, hallOfHeroes } = ctx;

  socket.on('hall_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('hall_status_result', hallOfHeroes.getStatus(p));
  });
}

module.exports = { registerHallHandlers };
