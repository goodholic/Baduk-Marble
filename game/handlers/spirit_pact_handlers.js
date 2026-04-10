// 정령 계약 소켓 핸들러 — v2.52

function registerSpiritPactHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, spiritPact } = ctx;

  socket.on('spirit_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('spirit_status_result', spiritPact.getStatus(p));
  });

  socket.on('spirit_contract', (spiritId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof spiritId !== 'string') return;
    const result = spiritPact.contractSpirit(p, spiritId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.spirit.icon} ${p.displayName}이(가) ${result.spirit.name}과(와) 정령 계약!`, type: 'rare' });
      io.emit('player_update', p);
    }
    socket.emit('spirit_result', result);
  });

  socket.on('spirit_fuse', (fusionId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof fusionId !== 'string') return;
    const result = spiritPact.fuseSpirits(p, fusionId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.fusion.icon} ${p.displayName}: ${result.fusion.name} 정령 합체!`, type: 'legendary' });
      io.emit('player_update', p);
    }
    socket.emit('spirit_result', result);
  });

  socket.on('spirit_summon', (data) => {
    const p = players[playerId]; if (!p) return;
    if (typeof data !== 'object' || !data) return;
    const result = spiritPact.summonSpirit(p, data.id, data.type);
    if (result.success) {
      savePlayer(p);
      io.emit('spirit_summon_fx', { playerId, icon: result.spirit.icon, color: result.spirit.color, element: result.spirit.element });
      io.emit('player_update', p);
    }
    socket.emit('spirit_result', result);
  });

  socket.on('spirit_dismiss', () => {
    const p = players[playerId]; if (!p) return;
    const result = spiritPact.dismissSpirit(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('spirit_result', result);
  });
}

module.exports = { registerSpiritPactHandlers };
