// 보석 세공 소켓 핸들러 — v1.95
function registerGemcraftHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, gemcraft } = ctx;

  socket.on('gemcraft_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('gemcraft_status_result', gemcraft.getStatus(p));
  });

  socket.on('gemcraft_buy', (data) => {
    const p = players[playerId]; if (!p) return;
    if (!data || !data.id) {
      socket.emit('gemcraft_result', { success:false, msg:'원석 ID 필요' });
      return;
    }
    const result = gemcraft.buyRough(p, data.id, Math.min(999, Math.max(1, Math.floor(Number(data.count)) || 1)));
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('gemcraft_result', result);
  });

  socket.on('gemcraft_cut', (roughId) => {
    const p = players[playerId]; if (!p) return;
    const result = gemcraft.cut(p, roughId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    if (result.perfect) {
      io.emit('server_msg', {
        msg: `💎 ${p.displayName}이(가) PERFECT 보석 세공 — ${result.gem.name}!`,
        type: 'rare',
      });
    }
    socket.emit('gemcraft_result', result);
  });

  socket.on('gemcraft_sell', (gemId) => {
    const p = players[playerId]; if (!p) return;
    const result = gemcraft.sellGem(p, gemId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('gemcraft_result', result);
  });
}

module.exports = { registerGemcraftHandlers };
