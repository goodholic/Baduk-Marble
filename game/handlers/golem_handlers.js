// 마법 인형 소켓 핸들러 — v2.50

function registerGolemHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, golemCraft, recalcStats } = ctx;

  socket.on('golem_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('golem_status_result', golemCraft.getStatus(p));
  });

  socket.on('golem_equip_part', (data) => {
    const p = players[playerId]; if (!p) return;
    if (typeof data !== 'object' || !data) return;
    const { slot, partId } = data;
    if (typeof slot !== 'string' || typeof partId !== 'string') return;
    const result = golemCraft.equipPart(p, slot, partId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('golem_result', result);
  });

  socket.on('golem_equip_core', (coreId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof coreId !== 'string') return;
    const result = golemCraft.equipCore(p, coreId);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('golem_result', result);
  });

  socket.on('golem_assemble', () => {
    const p = players[playerId]; if (!p) return;
    const result = golemCraft.assemble(p);
    if (result.success) {
      recalcStats(p);
      savePlayer(p);
      io.emit('server_msg', { msg: `⚙️ ${p.displayName}: ${result.rank?.rankName || '골렘'} 조립 완료!`, type: 'rare' });
      io.emit('player_update', p);
    }
    socket.emit('golem_result', result);
  });

  socket.on('golem_toggle', () => {
    const p = players[playerId]; if (!p) return;
    const result = golemCraft.toggleActive(p);
    if (result.success) {
      recalcStats(p);
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('golem_result', result);
  });
}

module.exports = { registerGolemHandlers };
