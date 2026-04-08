// 우체국 소켓 핸들러 — v1.88
function registerPostofficeHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, postoffice, getZone } = ctx;

  socket.on('postoffice_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('postoffice_status_result', postoffice.getStatus(p));
  });

  socket.on('postoffice_accept', (contract) => {
    const p = players[playerId];
    if (!p) return;
    if (!contract || !contract.id) {
      socket.emit('postoffice_result', { success: false, msg: '계약 미지정' });
      return;
    }
    const z = getZone(p.x, p.y);
    if (z.id !== contract.fromZone) {
      socket.emit('postoffice_result', { success: false, msg: `${contract.fromName}에서 수락 가능` });
      return;
    }
    const result = postoffice.acceptContract(p, contract);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('postoffice_result', result);
  });

  socket.on('postoffice_deliver', (contractId) => {
    const p = players[playerId];
    if (!p) return;
    const d = postoffice.getStatus(p).active.find(c => c.id === contractId);
    if (!d) {
      socket.emit('postoffice_result', { success: false, msg: '존재하지 않는 계약' });
      return;
    }
    const z = getZone(p.x, p.y);
    if (z.id !== d.toZone) {
      socket.emit('postoffice_result', { success: false, msg: `${d.toName}로 가야 합니다` });
      return;
    }
    const result = postoffice.deliverPackage(p, contractId);
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('postoffice_result', result);
  });
}

module.exports = { registerPostofficeHandlers };
