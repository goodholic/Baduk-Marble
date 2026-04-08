// 레이드 소켓 핸들러 — v1.87
function registerRaidHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, raid, handleRaidFinish } = ctx;

  socket.on('raid_list', () => {
    socket.emit('raid_list_result', {
      raids: raid.RAIDS,
      active: raid.getActiveRaids(),
      weeklyLimit: raid.RAID_CONFIG.weeklyEntryLimit,
    });
  });

  socket.on('raid_create', (raidType) => {
    const p = players[playerId];
    if (!p) return;
    const r = raid.createRaid(raidType);
    if (!r) {
      socket.emit('raid_result', { success: false, msg: '존재하지 않는 레이드 종류' });
      return;
    }
    raid.joinRaid(p, r.id);
    socket.emit('raid_result', { success: true, raid: r, msg: '레이드 생성 + 자동 참가' });
    io.emit('server_msg', {
      msg: `[레이드] ${p.displayName}이(가) ${r.name} 레이드를 시작합니다! (모집 5분)`,
      type: 'normal',
    });
  });

  socket.on('raid_join', (raidId) => {
    const p = players[playerId];
    if (!p) return;
    const result = raid.joinRaid(p, raidId);
    socket.emit('raid_result', result);
  });

  socket.on('raid_start', (raidId) => {
    const p = players[playerId];
    if (!p) return;
    const result = raid.startRaid(raidId);
    if (result.success) {
      const r = raid._activeRaids[raidId];
      for (const pid of Object.keys(r.players)) {
        const pl = players[pid];
        if (pl) {
          if (!pl.raidWeekly) pl.raidWeekly = { week: '', count: 0 };
          pl.raidWeekly.count++;
          savePlayer(pl);
        }
      }
      io.emit('raid_started', { raidId, name: r.name });
    }
    socket.emit('raid_result', result);
  });

  socket.on('raid_damage', (data) => {
    const p = players[playerId];
    if (!p || !data || !data.raidId || !data.damage) return;
    const result = raid.dealDamage(data.raidId, p.id, Number(data.damage) || 0);
    if (result && result.victory !== undefined) {
      handleRaidFinish(data.raidId, result);
    }
  });
}

module.exports = { registerRaidHandlers };
