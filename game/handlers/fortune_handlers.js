// 일일 운세 소켓 핸들러 — v1.88
function registerFortuneHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, fortune } = ctx;

  socket.on('fortune_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('fortune_status_result', fortune.getStatus(p));
  });

  socket.on('fortune_read', () => {
    const p = players[playerId];
    if (!p) return;
    const result = fortune.readFortune(p);
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      savePlayer(p);
      io.emit('player_update', p);
      if (result.fortune.id === 'excellent') {
        io.emit('server_msg', {
          msg: `[운세] ${p.displayName}이(가) 오늘 대길운! (스트릭 ${result.streak}일)`,
          type: 'rare',
        });
      }
    }
    socket.emit('fortune_read_result', result);
  });

  socket.on('fortune_reroll', () => {
    const p = players[playerId];
    if (!p) return;
    const result = fortune.rerollFortune(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('fortune_read_result', result);
  });
}

module.exports = { registerFortuneHandlers };
