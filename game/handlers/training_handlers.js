// 일일 훈련 소켓 핸들러 — v1.86
const TRAINING_DRILLS_NAMES = {
  combat:'전투 훈련', defense:'방어 훈련', agility:'민첩 훈련',
  wisdom:'지혜 훈련', lucky:'행운 훈련'
};

function registerTrainingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, training } = ctx;

  socket.on('training_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('training_status_result', training.getStatus(p));
  });

  socket.on('training_perform', (drillId) => {
    const p = players[playerId];
    if (!p) return;
    const result = training.performTraining(p, drillId);
    if (result.success) {
      if (result.tempBuff) {
        if (!p.activeBuffs) p.activeBuffs = {};
        p.activeBuffs[`training_${drillId}`] = {
          ...result.tempBuff,
          name: TRAINING_DRILLS_NAMES[drillId] || drillId,
          startTime: Date.now(),
          endTime: Date.now() + result.tempBuff.duration * 1000,
        };
      }
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('training_perform_result', result);
  });

  socket.on('training_refill', () => {
    const p = players[playerId];
    if (!p) return;
    const result = training.refillStamina(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    socket.emit('training_refill_result', result);
  });
}

module.exports = { registerTrainingHandlers, TRAINING_DRILLS_NAMES };
