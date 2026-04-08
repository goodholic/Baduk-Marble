// 시즌 축제 이벤트 소켓 핸들러 — v1.84 (server.js에서 분리)
// ctx = { socket, festival }

function registerEventHandlers(socket, ctx) {
  const { festival } = ctx;

  socket.on('event_status', () => {
    const ev = festival.getActiveEvent();
    socket.emit('event_status_result', {
      active: !!ev,
      event: ev ? {
        id: ev.id,
        name: ev.name,
        desc: ev.desc,
        color: ev.color,
        globalBuff: ev.globalBuff,
        exclusiveRewards: ev.exclusiveRewards,
        npcGreeting: ev.npcGreeting,
        period: `${ev.startMonth}/${ev.startDay} ~ ${ev.endMonth}/${ev.endDay}`,
      } : null,
    });
  });
}

module.exports = { registerEventHandlers };
