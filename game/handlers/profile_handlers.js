// 프로필 소켓 핸들러 — v2.04
function registerProfileHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, profile } = ctx;

  socket.on('profile_get', (targetId) => {
    const viewer = players[playerId];
    const target = players[targetId] || viewer;
    if (!target) return;
    socket.emit('profile_get_result', profile.getCard(target, viewer));
  });

  socket.on('profile_set_bio', (text) => {
    const p = players[playerId]; if (!p) return;
    const result = profile.setBio(p, text);
    if (result.success) savePlayer(p);
    socket.emit('profile_result', result);
  });

  socket.on('profile_set_theme', (themeId) => {
    const p = players[playerId]; if (!p) return;
    const result = profile.setTheme(p, themeId);
    if (result.success) savePlayer(p);
    socket.emit('profile_result', result);
  });

  socket.on('profile_set_badges', (ids) => {
    const p = players[playerId]; if (!p) return;
    const result = profile.setDisplayBadges(p, ids);
    if (result.success) savePlayer(p);
    socket.emit('profile_result', result);
  });

  socket.on('profile_check_badges', () => {
    const p = players[playerId]; if (!p) return;
    const granted = profile.autoCheckBadges(p);
    if (granted.length > 0) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('profile_check_result', { granted });
  });
}

module.exports = { registerProfileHandlers };
