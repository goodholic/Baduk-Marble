// 일기장 소켓 핸들러 — v1.90
function registerDiaryHandlers(socket, ctx) {
  const { players, playerId, diary } = ctx;

  socket.on('diary_get', (filter) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('diary_get_result', {
      entries: diary.getDiary(p, filter || {}),
      stats: diary.getStats(p),
    });
  });

  socket.on('diary_highlights', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('diary_highlights_result', diary.getHighlights(p));
  });
}

module.exports = { registerDiaryHandlers };
