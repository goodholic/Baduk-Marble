// 영혼 계약 소켓 핸들러 — v2.43

function registerSoulContractHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, soulContract } = ctx;

  socket.on('soul_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('soul_status_result', soulContract.getStatus(p));
  });

  socket.on('soul_contract', (soulId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof soulId !== 'string') return;
    const result = soulContract.contractSoul(p, soulId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.soul.icon} ${p.displayName}이(가) ${result.soul.name}과(와) 영혼 계약!`, type: 'legendary' });
      io.emit('player_update', p);
    } else if (result.failed && result.curse) {
      // 계약 실패 저주 적용
      const c = result.curse;
      if (c.effect === 'hpLoss') p.hp = Math.max(1, Math.floor(p.hp * (1 - c.value)));
      if (c.effect === 'mpDrain') p.mp = 0;
      if (c.effect === 'expLoss') p.exp = Math.max(0, (p.exp || 0) - c.value);
      savePlayer(p);
      io.emit('server_msg', { msg: `[영혼] ${p.displayName} 계약 실패! ${c.name}...`, type: 'danger' });
      io.emit('player_update', p);
    }
    socket.emit('soul_result', result);
  });

  socket.on('soul_summon', (soulId) => {
    const p = players[playerId]; if (!p || !p.isAlive) return;
    if (typeof soulId !== 'string') return;
    const result = soulContract.summon(p, soulId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.soul.icon} ${p.displayName}: ${result.soul.name} 소환! (Lv.${result.level})`, type: 'rare' });
      io.emit('soul_summon_fx', { playerId, soulId, icon: result.soul.icon, color: result.soul.color });
      io.emit('player_update', p);
    }
    socket.emit('soul_result', result);
  });

  socket.on('soul_skill', () => {
    const p = players[playerId]; if (!p || !p.isAlive) return;
    const result = soulContract.useSummonSkill(p);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.soul.icon} ${result.skill.name}!`, type: 'normal' });
      io.emit('soul_skill_fx', { playerId, skill: result.skill, soulId: result.soul?.id, color: result.soul?.color });
    }
    socket.emit('soul_skill_result', result);
  });

  socket.on('soul_feed', (soulId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof soulId !== 'string') return;
    const result = soulContract.feedFragment(p, soulId);
    if (result.success) savePlayer(p);
    socket.emit('soul_feed_result', result);
  });
}

module.exports = { registerSoulContractHandlers };
