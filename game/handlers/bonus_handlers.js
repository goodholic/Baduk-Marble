// 보너스 집계 소켓 핸들러 — v2.0
function registerBonusHandlers(socket, ctx) {
  const { players, playerId, bonusAggregator } = ctx;

  socket.on('bonus_full', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('bonus_full_result', bonusAggregator.aggregate(p));
  });

  socket.on('bonus_summary', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('bonus_summary_result', bonusAggregator.getCompactSummary(p));
  });
}

module.exports = { registerBonusHandlers };
