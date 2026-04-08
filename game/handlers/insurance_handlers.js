// 장비 보험 소켓 핸들러 — v1.88
function registerInsuranceHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, insurance } = ctx;

  socket.on('insurance_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('insurance_status_result', insurance.getStatus(p));
  });

  socket.on('insurance_buy', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.equipId) {
      socket.emit('insurance_result', { success: false, msg: '장비 미지정' });
      return;
    }
    const result = insurance.buyInsurance(p, data.equipId, !!data.autoRenew);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('insurance_result', result);
  });

  socket.on('insurance_check', (equipId) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('insurance_check_result', { equipId, insured: insurance.isInsured(p, equipId) });
  });
}

module.exports = { registerInsuranceHandlers };
