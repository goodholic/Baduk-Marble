// 유물 발굴 소켓 핸들러 — v2.09
function registerExcavationHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, excavation } = ctx;

  socket.on('excavation_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('excavation_status_result', excavation.getStatus(p));
  });

  socket.on('excavation_dig', (siteId) => {
    const p = players[playerId]; if (!p) return;
    const result = excavation.dig(p, siteId);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.grade === 'divine') {
        io.emit('server_msg', {
          msg: `✨ ${p.displayName}이(가) 신물을 발굴! (${result.artifact.name})`,
          type: 'rare',
        });
      }
    }
    socket.emit('excavation_result', result);
  });

  socket.on('excavation_sell', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('excavation_result', { success:false, msg:'데이터 필요' }); return; }
    const result = excavation.sell(p, data.grade, data.count);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('excavation_result', result);
  });

  socket.on('excavation_donate', (grade) => {
    const p = players[playerId]; if (!p) return;
    const result = excavation.donate(p, grade);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('excavation_result', result);
  });
}

module.exports = { registerExcavationHandlers };
