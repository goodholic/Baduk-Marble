// 신의 축복 소켓 핸들러 — v2.45

function registerDivineBlessingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, divineBlessing } = ctx;

  socket.on('divine_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('divine_status_result', divineBlessing.getStatus(p));
  });

  socket.on('divine_choose', (godId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof godId !== 'string') return;
    const result = divineBlessing.chooseGod(p, godId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.god.icon} ${p.displayName}이(가) ${result.god.name}에게 귀의했다!`, type: 'legendary' });
      io.emit('player_update', p);
    }
    socket.emit('divine_result', result);
  });

  socket.on('divine_pray', () => {
    const p = players[playerId]; if (!p) return;
    const result = divineBlessing.pray(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('divine_result', result);
  });

  socket.on('divine_miracle', () => {
    const p = players[playerId]; if (!p || !p.isAlive) return;
    const result = divineBlessing.miracle(p);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.god.icon} ${p.displayName}: ${result.miracle.name}!`, type: 'legendary' });
      io.emit('divine_miracle_fx', { playerId, godId: result.god.domain, color: result.god.color });
      io.emit('player_update', p);
    }
    socket.emit('divine_miracle_result', result);
  });

  socket.on('divine_offering', (type) => {
    const p = players[playerId]; if (!p) return;
    if (typeof type !== 'string') return;
    const result = divineBlessing.offering(p, type);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('divine_result', result);
  });
}

module.exports = { registerDivineBlessingHandlers };
