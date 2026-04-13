// 용병 친밀도 & 충성도 시스템 — v3.6
function registerMercenaryBondHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const BOND_STAGES = [
    { name: '경계',       min: 0,   max: 99,  statBonus: 0,    betrayChance: 0.15 },
    { name: '중립',       min: 100, max: 299, statBonus: 0.03, betrayChance: 0.08 },
    { name: '신뢰',       min: 300, max: 599, statBonus: 0.07, betrayChance: 0.03 },
    { name: '맹세',       min: 600, max: 899, statBonus: 0.12, betrayChance: 0 },
    { name: '영혼의 유대', min: 900, max: 999, statBonus: 0.20, betrayChance: 0 },
    { name: '절대 충성',   min: 1000, max: 1000, statBonus: 0.25, betrayChance: 0 },
  ];

  function getBondStage(bond) {
    for (let i = BOND_STAGES.length - 1; i >= 0; i--) {
      if (bond >= BOND_STAGES[i].min) return { ...BOND_STAGES[i], index: i };
    }
    return { ...BOND_STAGES[0], index: 0 };
  }

  function getMerc(p, mercId) {
    return (p.mercenaries || []).find(m => m.id === mercId);
  }

  // 친밀도 정보 조회
  socket.on('bond_info', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId) return;
    const merc = getMerc(p, data.mercId);
    if (!merc) return;
    const stage = getBondStage(merc.bond || 0);
    socket.emit('bond_info', {
      mercId: merc.id,
      bond: merc.bond || 0,
      loyalty: merc.loyalty ?? 80,
      stage: stage.name,
      stageIndex: stage.index,
      statBonus: stage.statBonus,
      betrayChance: stage.betrayChance,
    });
  });

  // 대화하기 (1일 1회)
  socket.on('bond_talk', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId) return;
    const merc = getMerc(p, data.mercId);
    if (!merc) return;
    const now = Date.now();
    if (merc._lastTalk && now - merc._lastTalk < 24*3600e3) {
      socket.emit('bond_talk_result', { success: false, reason: 'cooldown' });
      return;
    }
    // 대화 선택지에 따라 +1~+10 (여기서는 랜덤)
    const gain = 3 + Math.floor(Math.random() * 8);
    merc.bond = Math.min(1000, (merc.bond || 0) + gain);
    merc._lastTalk = now;
    savePlayer(p);
    socket.emit('bond_talk_result', { success: true, gain, bond: merc.bond, stage: getBondStage(merc.bond).name });
  });

  // 선물 주기
  socket.on('bond_gift', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId || !data?.itemId) return;
    const merc = getMerc(p, data.mercId);
    if (!merc) return;
    const now = Date.now();
    if (merc._lastGift && now - merc._lastGift < 4*3600e3) {
      socket.emit('bond_gift_result', { success: false, reason: 'cooldown' });
      return;
    }
    // 인벤토리 확인 & 아이템 제거
    const inv = p.inventory || [];
    const idx = inv.findIndex(i => i.id === data.itemId);
    if (idx === -1) { socket.emit('bond_gift_result', { success: false, reason: 'no_item' }); return; }

    const item = inv[idx];
    const isFavorite = merc.favorites && merc.favorites.includes(item.type);
    const gain = isFavorite ? 50 : (10 + Math.floor(Math.random() * 30));

    inv.splice(idx, 1);
    merc.bond = Math.min(1000, (merc.bond || 0) + gain);
    merc._lastGift = now;
    savePlayer(p);
    socket.emit('bond_gift_result', { success: true, gain, favorite: isFavorite, bond: merc.bond });
  });

  // 함께 훈련 (친밀도 +8)
  socket.on('bond_train_together', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId) return;
    const merc = getMerc(p, data.mercId);
    if (!merc) return;
    const now = Date.now();
    if (merc._lastBondTrain && now - merc._lastBondTrain < 12*3600e3) {
      socket.emit('bond_train_result', { success: false, reason: 'cooldown' });
      return;
    }
    merc.bond = Math.min(1000, (merc.bond || 0) + 8);
    merc._lastBondTrain = now;
    // 함께 훈련하는 다른 용병도 +3
    if (data.partnerId) {
      const partner = getMerc(p, data.partnerId);
      if (partner) partner.bond = Math.min(1000, (partner.bond || 0) + 3);
    }
    savePlayer(p);
    socket.emit('bond_train_result', { success: true, bond: merc.bond });
  });

  // 요리 대접
  socket.on('bond_cook', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId || !data?.dishId) return;
    const merc = getMerc(p, data.mercId);
    if (!merc) return;
    const now = Date.now();
    if (merc._lastCook && now - merc._lastCook < 8*3600e3) {
      socket.emit('bond_cook_result', { success: false, reason: 'cooldown' });
      return;
    }
    const isFav = merc.favoriteFoods && merc.favoriteFoods.includes(data.dishId);
    const gain = isFav ? 20 : 5;
    merc.bond = Math.min(1000, (merc.bond || 0) + gain);
    merc._lastCook = now;
    savePlayer(p);
    socket.emit('bond_cook_result', { success: true, gain, bond: merc.bond });
  });

  // 충성도 체크 (배신 판정) — 전투 시작 시 호출
  socket.on('bond_loyalty_check', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId) return;
    const merc = getMerc(p, data.mercId);
    if (!merc) return;
    const stage = getBondStage(merc.bond || 0);
    const loyalty = merc.loyalty ?? 80;

    // 충성도 0 이하면 이탈
    if (loyalty <= 0) {
      socket.emit('bond_betrayal', { mercId: merc.id, type: 'desert', reason: '충성도 소진으로 이탈' });
      return;
    }

    // 배신 확률 (충성도 50 이하 + 친밀도 낮으면 위험)
    if (loyalty < 50 && stage.betrayChance > 0) {
      const roll = Math.random();
      if (roll < stage.betrayChance * (1 - loyalty / 100)) {
        merc.loyalty = Math.max(0, loyalty - 20);
        savePlayer(p);
        socket.emit('bond_betrayal', { mercId: merc.id, type: 'betray', reason: '전투 중 배신!' });
        return;
      }
    }
    socket.emit('bond_loyalty_ok', { mercId: merc.id, loyalty, stage: stage.name });
  });

  // 급여 지급 (자동/수동)
  socket.on('bond_pay_salary', (data) => {
    const p = players[playerId];
    if (!p) return;
    const mercs = p.mercenaries || [];
    let totalCost = 0;
    for (const m of mercs) {
      const salary = (m.star || 1) * 100;
      totalCost += salary;
    }
    if ((p.gold || 0) < totalCost) {
      socket.emit('bond_pay_result', { success: false, reason: 'insufficient_gold', needed: totalCost });
      return;
    }
    p.gold -= totalCost;
    for (const m of mercs) {
      m.loyalty = Math.min(100, (m.loyalty ?? 80) + 5);
      m._lastPaid = Date.now();
    }
    savePlayer(p);
    socket.emit('bond_pay_result', { success: true, totalCost, mercCount: mercs.length });
  });
}

module.exports = { registerMercenaryBondHandlers };
