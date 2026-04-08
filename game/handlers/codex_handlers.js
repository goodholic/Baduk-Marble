// 도감 소켓 핸들러 — v1.85
function registerCodexHandlers(socket, ctx) {
  const { players, playerId, savePlayer, codex, codexDiscover } = ctx;

  socket.on('codex_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('codex_status_result', codex.getProgress(p));
  });

  socket.on('codex_report', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.category || !data.entryId) return;
    if (!['monster','zone','equip','fish','pet'].includes(data.category)) return;
    codexDiscover(p, data.category, String(data.entryId));
    savePlayer(p);
    socket.emit('codex_status_result', codex.getProgress(p));
  });
}

module.exports = { registerCodexHandlers };
