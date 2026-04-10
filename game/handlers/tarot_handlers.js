// 예언의 타로 소켓 핸들러 — v2.41 (v2.12 확장)
function registerTarotHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, tarot } = ctx;

  socket.on('tarot_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('tarot_status_result', tarot.getStatus(p));
  });

  socket.on('tarot_read', () => {
    const p = players[playerId]; if (!p) return;
    const result = tarot.read(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.combo) {
        io.emit('server_msg', {
          msg: `🔮 ${p.displayName}: 타로 조합 [${result.combo.icon} ${result.combo.name}] 발동!`,
          type: result.combo.rarity === 'legendary' ? 'legendary' : 'rare',
        });
      }
    }
    socket.emit('tarot_result', result);
  });

  // v2.41: 운명의 도전
  socket.on('tarot_gambit', () => {
    const p = players[playerId]; if (!p) return;
    const result = tarot.gambit(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.cursed) {
        io.emit('server_msg', { msg: `💀 ${p.displayName}의 운명의 도전이 역습당했다!`, type: 'danger' });
      } else if (result.won) {
        io.emit('server_msg', { msg: `🎉 ${p.displayName}의 운명의 도전 성공! 보너스 2배!`, type: 'rare' });
      }
    }
    socket.emit('tarot_gambit_result', result);
  });

  // v2.41: 역방향 수용
  socket.on('tarot_embrace_reversed', () => {
    const p = players[playerId]; if (!p) return;
    const result = tarot.embraceReversed(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('tarot_embrace_result', result);
  });

  // v2.41: 마일스톤 수령
  socket.on('tarot_claim_milestone', (score) => {
    const p = players[playerId]; if (!p) return;
    const s = parseInt(score);
    if (isNaN(s)) return;
    const result = tarot.claimMilestone(p, s);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('server_msg', { msg: `🔮 ${p.displayName}: ${result.milestone.icon} ${result.milestone.name} 달성!`, type: 'rare' });
    }
    socket.emit('tarot_milestone_result', result);
  });
}

module.exports = { registerTarotHandlers };
