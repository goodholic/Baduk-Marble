// 낚시 소켓 핸들러 — v1.83 (server.js에서 분리)
// ctx = { io, players, playerId, savePlayer, trackQuest, codexDiscover,
//         getZone, isNight, MAX_GOLD, fishing }

const FISHING_ZONES = ['fishing', 'riverbank', 'coral'];

function registerFishingHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, trackQuest, codexDiscover,
          getZone, MAX_GOLD, fishing } = ctx;

  socket.on('fishing_status', () => {
    const p = players[playerId];
    if (!p) return;
    const z = getZone(p.x, p.y);
    socket.emit('fishing_status_result', {
      inFishingZone: FISHING_ZONES.includes(z.id),
      zoneName: z.name,
      fishCount: p.fishCount || 0,
      ownedRods: p.rods || ['rod_wooden'],
      activeRod: p.activeRod || 'rod_wooden',
      isNight: !!ctx.isNight,
      rods: Object.entries(fishing.FISHING_RODS).map(([id, r]) => ({ id, ...r })),
      baits: Object.entries(fishing.FISHING_BAIT).map(([id, b]) => ({ id, ...b })),
    });
  });

  socket.on('fishing_cast', (data) => {
    const p = players[playerId];
    if (!p) return;
    const z = getZone(p.x, p.y);
    if (!FISHING_ZONES.includes(z.id)) {
      socket.emit('fishing_result', { success: false, msg: '낚시 가능 지역이 아닙니다 (낚시 만/강변/산호초)' });
      return;
    }
    const rodId = (data && data.rod) || p.activeRod || 'rod_wooden';
    if (!fishing.FISHING_RODS[rodId]) {
      socket.emit('fishing_result', { success: false, msg: '존재하지 않는 낚싯대' });
      return;
    }
    if (!p.rods) p.rods = ['rod_wooden'];
    if (!p.rods.includes(rodId)) {
      socket.emit('fishing_result', { success: false, msg: '보유하지 않은 낚싯대' });
      return;
    }
    const baitId = data && data.bait;
    if (baitId) {
      if (!fishing.FISHING_BAIT[baitId]) {
        socket.emit('fishing_result', { success: false, msg: '존재하지 않는 미끼' });
        return;
      }
      if (!p.inventory || !p.inventory[baitId]) {
        socket.emit('fishing_result', { success: false, msg: '미끼 부족' });
        return;
      }
      p.inventory[baitId]--;
      if (p.inventory[baitId] <= 0) delete p.inventory[baitId];
    }
    p.currentZone = z.id;
    const prevNight = globalThis.isNight;
    globalThis.isNight = ctx.isNight;
    const result = fishing.catchFish(p, rodId, baitId);
    globalThis.isNight = prevNight;

    if (!result.success) {
      socket.emit('fishing_result', { success: false, msg: result.msg || '잡지 못했다' });
      return;
    }

    p.gold = Math.min(MAX_GOLD, (p.gold || 0) + result.value);
    p.exp = (p.exp || 0) + result.expGain;

    if (typeof trackQuest === 'function') trackQuest(p, 'fish_catch', 1);
    if (typeof codexDiscover === 'function') codexDiscover(p, 'fish', result.fish.name);

    savePlayer(p);
    socket.emit('fishing_result', {
      success: true,
      fish: result.fish,
      value: result.value,
      expGain: result.expGain,
      totalCount: p.fishCount,
    });
    io.emit('player_update', p);

    if (result.fish.rarity === 'legendary' || result.fish.rarity === 'mythic') {
      io.emit('server_msg', {
        msg: `[낚시] ${p.displayName}이(가) ${result.fish.name}을(를) 낚았습니다!`,
        type: 'rare',
      });
    }
  });

  socket.on('fishing_buy_rod', (rodId) => {
    const p = players[playerId];
    if (!p) return;
    const rod = fishing.FISHING_RODS[rodId];
    if (!rod) {
      socket.emit('fishing_result', { success: false, msg: '존재하지 않는 낚싯대' });
      return;
    }
    if (!p.rods) p.rods = ['rod_wooden'];
    if (p.rods.includes(rodId)) {
      socket.emit('fishing_result', { success: false, msg: '이미 보유 중' });
      return;
    }
    if (rod.price.gold) {
      if ((p.gold || 0) < rod.price.gold) { socket.emit('fishing_result', { success: false, msg: '골드 부족' }); return; }
      p.gold -= rod.price.gold;
    }
    if (rod.price.diamonds) {
      if ((p.diamonds || 0) < rod.price.diamonds) { socket.emit('fishing_result', { success: false, msg: '다이아 부족' }); return; }
      p.diamonds -= rod.price.diamonds;
    }
    p.rods.push(rodId);
    p.activeRod = rodId;
    savePlayer(p);
    socket.emit('fishing_result', { success: true, msg: `${rod.name} 구매 완료!`, rodId });
    io.emit('player_update', p);
  });
}

module.exports = { registerFishingHandlers, FISHING_ZONES };
