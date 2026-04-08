// 룬 소켓 핸들러 — v1.86
function registerRunesHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, trackQuest, runes } = ctx;

  socket.on('rune_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('rune_status_result', runes.getStatus(p));
  });

  socket.on('rune_craft', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.type) {
      socket.emit('rune_result', { success: false, msg: '룬 종류 미지정' });
      return;
    }
    const result = runes.craftRune(p, data.type, data.grade || 'common');
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('rune_result', result);
  });

  socket.on('rune_socket', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.runeId || !data.equipSlot) {
      socket.emit('rune_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const result = runes.socketRune(p, data.runeId, data.equipSlot);
    if (result.success) {
      const activeWords = runes.getActiveRuneWords(p);
      if (activeWords.length > 0 && typeof trackQuest === 'function') {
        trackQuest(p, 'rune_word', 1);
      }
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('rune_result', result);
  });

  socket.on('rune_unsocket', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.equipSlot || typeof data.socketIdx !== 'number') {
      socket.emit('rune_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const result = runes.unsocketRune(p, data.equipSlot, data.socketIdx);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('rune_result', result);
  });
}

module.exports = { registerRunesHandlers };
