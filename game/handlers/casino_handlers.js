// 카지노 소켓 핸들러 — v2.05
function registerCasinoHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, casino } = ctx;

  socket.on('casino_stats', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('casino_stats_result', casino.getStats(p));
  });

  socket.on('casino_slot', (bet) => {
    const p = players[playerId]; if (!p) return;
    const result = casino.playSlot(p, bet);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.result === 'jackpot' && result.payout >= 50000) {
        io.emit('server_msg', {
          msg: `🎰 ${p.displayName}이(가) 슬롯 잭팟 ${result.payout.toLocaleString()}G 획득!`,
          type:'rare',
        });
      }
    }
    socket.emit('casino_result', result);
  });

  socket.on('casino_dice', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('casino_result', { success:false, msg:'데이터 필요' }); return; }
    const result = casino.playDice(p, data.bet, data.guess);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('casino_result', result);
  });

  socket.on('casino_coin', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('casino_result', { success:false, msg:'데이터 필요' }); return; }
    const result = casino.playCoin(p, data.bet, data.guess);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('casino_result', result);
  });
}

module.exports = { registerCasinoHandlers };
