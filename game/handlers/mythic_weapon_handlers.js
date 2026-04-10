// 신화 무기 각성 소켓 핸들러 — v2.53

function registerMythicWeaponHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, mythicWeapon } = ctx;

  socket.on('mythweapon_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('mythweapon_status_result', mythicWeapon.getStatus(p));
  });

  socket.on('mythweapon_awaken', (weaponId) => {
    const p = players[playerId]; if (!p) return;
    if (typeof weaponId !== 'string') return;
    const result = mythicWeapon.awakenWeapon(p, weaponId);
    if (result.success) {
      savePlayer(p);
      io.emit('server_msg', { msg: `${result.weapon.icon} ${p.displayName}: ${result.weapon.name} 각성! — ${result.dialogue}`, type: 'legendary' });
      io.emit('player_update', p);
    }
    socket.emit('mythweapon_result', result);
  });

  socket.on('mythweapon_talk', () => {
    const p = players[playerId]; if (!p) return;
    const result = mythicWeapon.talk(p);
    if (result.success) savePlayer(p);
    socket.emit('mythweapon_talk_result', result);
  });
}

module.exports = { registerMythicWeaponHandlers };
