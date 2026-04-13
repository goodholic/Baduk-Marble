// 무역 카라반 실시간 PvP 시스템 — v3.9
function registerCaravanPvpHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;
  if (!ctx.activeCaravans) ctx.activeCaravans = {};

  const ROUTES = {
    grassland:  { name: '초원 무역로',    from: 'aden',     to: 'harbor',   travelMs: 120e3, profitMult: 1.3, raidChance: 0.1 },
    mountain:   { name: '산악 무역로',    from: 'mountain', to: 'oasis',    travelMs: 240e3, profitMult: 1.8, raidChance: 0.3 },
    shortcut:   { name: '위험한 지름길',  from: 'aden',     to: 'oasis',    travelMs: 180e3, profitMult: 2.5, raidChance: 0.5 },
    sea:        { name: '해상 무역로',    from: 'harbor',   to: 'pirate',   travelMs: 300e3, profitMult: 2.2, raidChance: 0.6 },
    dark:       { name: '암흑 밀수로',    from: 'dark',     to: 'dark2',    travelMs: 360e3, profitMult: 3.0, raidChance: 0.8 },
    dragon:     { name: '용의 무역로',    from: 'volcano',  to: 'dragon',   travelMs: 480e3, profitMult: 4.0, raidChance: 0.9 },
    dimension:  { name: '차원 무역로',    from: 'rift',     to: 'otherworld',travelMs: 600e3, profitMult: 5.0, raidChance: 0.7 },
  };

  const CARAVAN_EVENTS = [
    { name: '폭우', effect: 'speed-20%', desc: '마차 속도 감소' },
    { name: 'NPC 산적', effect: 'combat_npc', desc: 'NPC 전투 (쉬움)' },
    { name: '숨겨진 상인', effect: 'bonus_gold', desc: '추가 골드 +500' },
    { name: '지름길 발견', effect: 'speed+30%', desc: '이동 시간 단축' },
    { name: '마차 고장', effect: 'delay_30s', desc: '30초 정지' },
    { name: '행운의 바람', effect: 'profit+20%', desc: '이익률 +20%' },
  ];

  // 카라반 출발
  socket.on('caravan_start', (data) => {
    const p = players[playerId];
    if (!p || !data?.routeId || !data?.investment) return;
    const route = ROUTES[data.routeId];
    if (!route) return;
    if ((p.gold || 0) < data.investment) { socket.emit('caravan_error', { reason: 'gold' }); return; }

    p.gold -= data.investment;
    const caravanId = `caravan_${playerId}_${Date.now()}`;
    const caravan = {
      id: caravanId,
      ownerId: playerId,
      ownerName: p.name || p.displayName,
      route: data.routeId,
      routeName: route.name,
      investment: data.investment,
      escorts: (data.mercIds || []).slice(0, 5),
      startTime: Date.now(),
      arrivalTime: Date.now() + route.travelMs,
      progress: 0,
      profitMult: route.profitMult,
      alive: true,
      events: [],
    };

    ctx.activeCaravans[caravanId] = caravan;
    savePlayer(p);

    socket.emit('caravan_started', { caravanId, route: route.name, arrivalTime: caravan.arrivalTime });
    // 전 서버에 카라반 이동 공지
    io.emit('caravan_spotted', { caravanId, ownerName: caravan.ownerName, route: route.name, progress: 0 });

    // 이동 시뮬레이션
    const tickInterval = setInterval(() => {
      const c = ctx.activeCaravans[caravanId];
      if (!c || !c.alive) { clearInterval(tickInterval); return; }

      c.progress = Math.min(100, ((Date.now() - c.startTime) / route.travelMs) * 100);

      // 랜덤 이벤트 (10% 확률 매 틱)
      if (Math.random() < 0.05 && c.events.length < 3) {
        const evt = CARAVAN_EVENTS[Math.floor(Math.random() * CARAVAN_EVENTS.length)];
        c.events.push(evt);
        io.to(playerId).emit('caravan_event', { caravanId, event: evt });
        if (evt.effect === 'bonus_gold') c.profitMult += 0.2;
      }

      // 위치 브로드캐스트 (약탈자가 볼 수 있게)
      io.emit('caravan_position', { caravanId, ownerName: c.ownerName, route: c.route, progress: Math.round(c.progress) });

      // 도착
      if (c.progress >= 100) {
        clearInterval(tickInterval);
        arriveCaravan(caravanId);
      }
    }, 10000); // 10초마다 업데이트
  });

  // 카라반 도착 → 판매
  function arriveCaravan(caravanId) {
    const c = ctx.activeCaravans[caravanId];
    if (!c || !c.alive) return;
    const p = players[c.ownerId];
    if (!p) return;

    const profit = Math.floor(c.investment * c.profitMult);
    p.gold = Math.min(999999999, (p.gold || 0) + profit);
    if (!p.tradeProfit) p.tradeProfit = 0;
    p.tradeProfit += profit - c.investment;
    if (!p.tradeCount) p.tradeCount = 0;
    p.tradeCount++;
    savePlayer(p);

    io.to(c.ownerId).emit('caravan_arrived', { caravanId, profit, investment: c.investment, netProfit: profit - c.investment });
    io.emit('caravan_complete', { ownerName: c.ownerName, route: c.routeName, profit });
    delete ctx.activeCaravans[caravanId];
  }

  // 약탈 시도
  socket.on('caravan_raid', (data) => {
    const p = players[playerId];
    if (!p || !data?.caravanId) return;
    const c = ctx.activeCaravans[data.caravanId];
    if (!c || !c.alive) { socket.emit('caravan_error', { reason: 'not_found' }); return; }
    if (c.ownerId === playerId) { socket.emit('caravan_error', { reason: 'own_caravan' }); return; }

    // 전투 시뮬레이션 (약탈자 용병 vs 호위 용병)
    const raiderMercs = (p.mercenaries || []).filter(m => (data.mercIds || []).includes(m.id));
    const escortMercs = c.escorts.map(id => {
      const owner = players[c.ownerId];
      return owner?.mercenaries?.find(m => m.id === id);
    }).filter(Boolean);

    const raiderPower = raiderMercs.reduce((s, m) => s + (m.star * 100) + ((m.level || 1) * 10) + Math.random() * 50, 0);
    const escortPower = escortMercs.reduce((s, m) => s + (m.star * 100) + ((m.level || 1) * 10) + Math.random() * 50, 0);

    if (raiderPower > escortPower) {
      // 약탈 성공
      const loot = Math.floor(c.investment * (0.5 + Math.random() * 0.3));
      p.gold = Math.min(999999999, (p.gold || 0) + loot);
      p.karma = (p.karma || 0) + 20;
      savePlayer(p);

      c.alive = false;
      socket.emit('caravan_raid_result', { success: true, loot });
      io.to(c.ownerId).emit('caravan_raided', { caravanId: c.id, raiderName: p.name, lootLost: loot });
      io.emit('server_toast', { msg: `☠️ ${p.name}이(가) ${c.ownerName}의 카라반을 약탈했습니다!` });
      delete ctx.activeCaravans[data.caravanId];
    } else {
      // 약탈 실패
      p.karma = (p.karma || 0) + 10;
      savePlayer(p);
      socket.emit('caravan_raid_result', { success: false, reason: '호위대에 격퇴당했습니다!' });
      io.to(c.ownerId).emit('caravan_defended', { caravanId: c.id, raiderName: p.name });
      io.emit('server_toast', { msg: `🛡️ ${c.ownerName}의 호위대가 약탈자 ${p.name}을(를) 격퇴!` });
    }
  });

  // 활성 카라반 목록
  socket.on('caravan_list', () => {
    const list = Object.values(ctx.activeCaravans).map(c => ({
      id: c.id, ownerName: c.ownerName, route: c.routeName, progress: Math.round(c.progress), investment: c.investment,
    }));
    socket.emit('caravan_list', list);
  });
}

module.exports = { registerCaravanPvpHandlers };
