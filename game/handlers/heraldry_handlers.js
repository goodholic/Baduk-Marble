// 가문 문장 소켓 핸들러 — v2.16
function registerHeraldryHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, heraldry } = ctx;

  socket.on('heraldry_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('heraldry_status_result', heraldry.getStatus(p));
  });

  socket.on('heraldry_design', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data) { socket.emit('heraldry_result', { success:false, msg:'데이터 필요' }); return; }
    const result = heraldry.design(p, data.charge, data.color, data.motto);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('heraldry_result', result);
  });
}

module.exports = { registerHeraldryHandlers };
