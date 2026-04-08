// 월드 이벤트 소켓 핸들러 — v1.88
function registerWorldEventHandlers(socket, ctx) {
  const { worldEvent } = ctx;

  socket.on('world_event_status', () => {
    socket.emit('world_event_status_result', worldEvent.getStatus());
  });

  socket.on('world_event_stats', () => {
    socket.emit('world_event_stats_result', worldEvent.getEventStats());
  });
}

module.exports = { registerWorldEventHandlers };
