// 음악 소켓 핸들러 — v2.11
function registerMusicHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, music } = ctx;

  socket.on('music_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('music_status_result', music.getStatus(p));
  });

  socket.on('music_buy_instrument', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = music.buyInstrument(p, id);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('music_result', result);
  });

  socket.on('music_equip', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = music.equipInstrument(p, id);
    if (result.success) savePlayer(p);
    socket.emit('music_result', result);
  });

  socket.on('music_learn', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = music.learnSong(p, id);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('music_result', result);
  });

  socket.on('music_perform', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = music.perform(p, id);
    if (result.success) {
      savePlayer(p);
      io.emit('music_broadcast', {
        playerId: p.id,
        displayName: p.displayName,
        msg: result.msg,
        x: p.x || 0,
        y: p.y || 0,
      });
    }
    socket.emit('music_result', result);
  });
}

module.exports = { registerMusicHandlers };
