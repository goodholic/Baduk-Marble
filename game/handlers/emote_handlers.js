// 이모트 소켓 핸들러 — v2.06
function registerEmoteHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, emote } = ctx;

  socket.on('emote_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('emote_status_result', emote.getStatus(p));
  });

  socket.on('emote_unlock', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = emote.unlock(p, id);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('emote_result', result);
  });

  socket.on('emote_perform', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = emote.perform(p, id);
    if (result.success) {
      savePlayer(p);
      io.emit('emote_broadcast', result.broadcast);
    }
    socket.emit('emote_result', result);
  });

  socket.on('emote_favorite', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = emote.toggleFavorite(p, id);
    if (result.success) savePlayer(p);
    socket.emit('emote_result', result);
  });
}

module.exports = { registerEmoteHandlers };
