// 펫 교배 소켓 핸들러 — v1.86
function registerBreedingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, breeding } = ctx;

  socket.on('breeding_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('breeding_status_result', breeding.getStatus(p));
  });

  socket.on('breeding_breed', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.parent1 || !data.parent2) {
      socket.emit('breeding_result', { success: false, msg: '두 펫 미지정' });
      return;
    }
    const result = breeding.breed(p, data.parent1, data.parent2);
    if (result.success) {
      if (!p.bredOffspring) p.bredOffspring = [];
      p.bredOffspring.push({ ...result.offspring, bornAt: Date.now() });
      savePlayer(p);
      io.emit('player_update', p);
      if (result.type === 'hybrid') {
        io.emit('server_msg', {
          msg: `[교배] ${p.displayName}이(가) 특별 하이브리드 ${result.offspring.name}을(를) 발견했습니다!`,
          type: 'rare',
        });
      } else if (result.type === 'mutation') {
        io.emit('server_msg', {
          msg: `[교배] ${p.displayName}이(가) 변이 자손을 얻었습니다!`,
          type: 'normal',
        });
      }
    }
    socket.emit('breeding_result', result);
  });
}

module.exports = { registerBreedingHandlers };
