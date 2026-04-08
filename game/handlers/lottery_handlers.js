// 행운의 룰렛 소켓 핸들러 — v1.82 (server.js에서 분리)
// 등록 함수: registerLotteryHandlers(socket, ctx)
// ctx = { io, players, playerId, savePlayer, trackQuest, MAX_GOLD, MAX_DIAMONDS, lottery }

function registerLotteryHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, trackQuest, MAX_GOLD, MAX_DIAMONDS, lottery } = ctx;

  // 보상을 player에 적용하는 헬퍼
  function applyLotteryReward(p, prize) {
    const r = prize.reward || {};
    if (r.gold) p.gold = Math.min(MAX_GOLD, (p.gold || 0) + r.gold);
    if (r.diamonds) p.diamonds = Math.min(MAX_DIAMONDS, (p.diamonds || 0) + r.diamonds);
    if (!p.inventory) p.inventory = {};
    for (const key of ['mat_magic', 'mat_soul', 'mat_dragon', 'food_all']) {
      if (r[key]) p.inventory[key] = (p.inventory[key] || 0) + r[key];
    }
    if (r.rare_box) p.inventory.rare_box = (p.inventory.rare_box || 0) + r.rare_box;
    if (r.hero_box) p.inventory.hero_box = (p.inventory.hero_box || 0) + r.hero_box;
  }

  socket.on('lottery_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('lottery_status_result', {
      canFreeSpin: lottery.canFreeSpin(p),
      totalSpins: p.lotteryTotalSpins || 0,
      paidSpinPrice: lottery.LOTTERY_CONFIG.paidSpinPrice,
      bulkSpinPrice: lottery.LOTTERY_CONFIG.bulkSpinPrice,
      bulkSpinCount: lottery.LOTTERY_CONFIG.bulkSpinCount,
      prizes: lottery.LOTTERY_PRIZES.map(pz => ({
        id: pz.id, name: pz.name, rarity: pz.rarity,
        color: lottery.getRarityColor(pz.rarity),
        weight: pz.weight,
      })),
    });
  });

  socket.on('lottery_free_spin', () => {
    const p = players[playerId];
    if (!p) return;
    if (!lottery.canFreeSpin(p)) {
      socket.emit('lottery_result', { success: false, msg: '오늘은 무료 스핀을 이미 사용했습니다' });
      return;
    }
    lottery.consumeFreeSpin(p);
    const prize = lottery.spinLottery();
    applyLotteryReward(p, prize);
    p.lotteryTotalSpins = (p.lotteryTotalSpins || 0) + 1;
    if (typeof trackQuest === 'function') trackQuest(p, 'lucky_spin', 1);
    savePlayer(p);
    socket.emit('lottery_result', {
      success: true, free: true, prize,
      color: lottery.getRarityColor(prize.rarity),
    });
    io.emit('player_update', p);
    if (prize.rarity === 'legendary' || prize.rarity === 'epic') {
      io.emit('server_msg', {
        msg: `[행운의 룰렛] ${p.displayName}이(가) ${prize.name}을(를) 획득했습니다!`,
        type: prize.rarity === 'legendary' ? 'rare' : 'normal',
      });
    }
  });

  socket.on('lottery_paid_spin', (data) => {
    const p = players[playerId];
    if (!p) return;
    const count = (data && data.count) === 10 ? 10 : 1;
    const result = lottery.paidSpin(p, count);
    if (!result.success) {
      socket.emit('lottery_result', { success: false, msg: result.msg });
      return;
    }
    for (const prize of result.results) applyLotteryReward(p, prize);
    if (typeof trackQuest === 'function') trackQuest(p, 'lucky_spin', count);
    savePlayer(p);
    socket.emit('lottery_result', {
      success: true, free: false, count,
      cost: result.cost,
      prizes: result.results.map(pz => ({
        ...pz,
        color: lottery.getRarityColor(pz.rarity),
      })),
    });
    io.emit('player_update', p);
    for (const prize of result.results) {
      if (prize.rarity === 'legendary') {
        io.emit('server_msg', {
          msg: `[행운의 룰렛] ${p.displayName}이(가) ${prize.name}을(를) 획득했습니다!`,
          type: 'rare',
        });
      }
    }
  });
}

module.exports = { registerLotteryHandlers };
