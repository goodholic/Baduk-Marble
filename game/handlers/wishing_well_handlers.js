// 소원의 우물 소켓 핸들러 — v2.14
function registerWishingWellHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, wishingWell } = ctx;

  socket.on('well_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('well_status_result', wishingWell.getStatus(p));
  });

  socket.on('well_wish', (amount) => {
    const p = players[playerId]; if (!p) return;
    const result = wishingWell.makeWish(p, amount);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.wish && result.wish.id === 'jackpot') {
        io.emit('server_msg', {
          msg: `✨ ${p.displayName}이(가) 우물에서 전설의 보물 — ${result.reward.toLocaleString()}G!`,
          type: 'rare',
        });
      }
    }
    socket.emit('well_result', result);
  });
}

module.exports = { registerWishingWellHandlers };
