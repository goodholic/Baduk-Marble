// 웨이포인트 소켓 핸들러 — v2.02
function registerWaypointHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, waypoint } = ctx;

  socket.on('waypoint_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('waypoint_status_result', waypoint.getStatus(p));
  });

  socket.on('waypoint_unlock', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = waypoint.unlock(p, id);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.completed) {
        io.emit('server_msg', {
          msg: `🌀 ${p.displayName}이(가) 모든 차원문 해금 — 차원 여행자!`,
          type: 'rare',
        });
      }
    }
    socket.emit('waypoint_result', result);
  });

  socket.on('waypoint_teleport', (id) => {
    const p = players[playerId]; if (!p) return;
    const result = waypoint.teleport(p, id);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('waypoint_result', result);
  });
}

module.exports = { registerWaypointHandlers };
