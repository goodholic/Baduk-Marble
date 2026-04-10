// 고대 혈맹 소켓 핸들러 — v2.42

function registerBloodlineHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, bloodline, recalcStats } = ctx;

  socket.on('bloodline_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('bloodline_status_result', bloodline.getStatus(p));
  });

  socket.on('bloodline_choose', (type) => {
    const p = players[playerId]; if (!p) return;
    if (typeof type !== 'string') return;
    const result = bloodline.chooseBloodline(p, type);
    if (result.success) {
      recalcStats(p);
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.bloodline.icon} ${p.displayName}에게서 ${result.bloodline.name}의 피가 각성했다!`, type: 'legendary' });
      io.emit('player_update', p);
    }
    socket.emit('bloodline_result', result);
  });

  socket.on('bloodline_awaken', () => {
    const p = players[playerId]; if (!p) return;
    const result = bloodline.awakenStage(p);
    if (result.success) {
      recalcStats(p);
      p.hp = p.maxHp;
      savePlayer(p);
      const msgType = result.stage === 3 ? 'legendary' : 'rare';
      io.emit('server_msg', { msg: `${result.bloodline.icon} ${p.displayName}: ${result.stageData.name}! [${result.bloodline.name} ${result.stage}단계]`, type: msgType });
      if (result.hasTransform) {
        io.emit('server_msg', { msg: `${result.bloodline.icon} ${p.displayName}이(가) 변신 능력을 획득했다!`, type: 'legendary' });
      }
      io.emit('player_update', p);
    }
    socket.emit('bloodline_result', result);
  });

  socket.on('bloodline_transform', () => {
    const p = players[playerId]; if (!p || !p.isAlive) return;
    const result = bloodline.transform(p);
    if (result.success) {
      recalcStats(p);
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.bloodline.icon} ${p.displayName}: ${result.transform.name}!`, type: 'legendary' });
      io.emit('bloodline_transform_fx', { playerId, type: p._bloodline.type, color: result.bloodline.color });
      io.emit('player_update', p);
    }
    socket.emit('bloodline_result', result);
  });

  socket.on('bloodline_skill', (skillIndex) => {
    const p = players[playerId]; if (!p || !p.isAlive) return;
    const idx = parseInt(skillIndex) || 0;
    const result = bloodline.useSkill(p, idx);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.bloodline.icon} ${p.displayName}: ${result.skill.name}!`, type: 'normal' });
      io.emit('bloodline_skill_fx', { playerId, skillName: result.skill.name, type: p._bloodline.type, color: result.bloodline.color });
      io.emit('player_update', p);
    }
    socket.emit('bloodline_skill_result', result);
  });
}

module.exports = { registerBloodlineHandlers };
