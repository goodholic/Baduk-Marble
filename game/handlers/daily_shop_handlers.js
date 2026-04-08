// 일일 상점 소켓 핸들러 — v1.85
// ctx = { io, players, playerId, savePlayer, dailyShop, getTodayDailyShop, setTodayDailyShop }

function registerDailyShopHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, dailyShop, getTodayDailyShop, setTodayDailyShop } = ctx;

  socket.on('daily_shop_status', () => {
    const p = players[playerId];
    if (!p) return;
    const todaySeed = dailyShop.getTodaySeed();
    let todayDailyShop = getTodayDailyShop();
    if (todayDailyShop.seed !== todaySeed) {
      todayDailyShop = dailyShop.generateDailyShop();
      setTodayDailyShop(todayDailyShop);
    }
    const bought = (p.dailyShopBoughtSeed === todaySeed) ? (p.dailyShopBought || {}) : {};
    socket.emit('daily_shop_status_result', {
      seed: todayDailyShop.seed,
      slots: todayDailyShop.slots.map((item, idx) => ({
        ...item,
        slotIdx: idx,
        bought: !!bought[idx],
      })),
      rerollPrice: dailyShop.DAILY_SHOP_CONFIG.rerollPriceDiamond,
    });
  });

  socket.on('daily_shop_buy', (data) => {
    const p = players[playerId];
    if (!p) return;
    const slotIdx = data && Number(data.slotIdx);
    if (typeof slotIdx !== 'number') {
      socket.emit('daily_shop_buy_result', { success: false, msg: '슬롯 미지정' });
      return;
    }
    const todaySeed = dailyShop.getTodaySeed();
    let todayDailyShop = getTodayDailyShop();
    if (todayDailyShop.seed !== todaySeed) {
      todayDailyShop = dailyShop.generateDailyShop();
      setTodayDailyShop(todayDailyShop);
    }
    const result = dailyShop.buyDailyShop(p, slotIdx, todayDailyShop);
    socket.emit('daily_shop_buy_result', result);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
    }
  });

  socket.on('daily_shop_reroll', () => {
    const p = players[playerId];
    if (!p) return;
    const cost = dailyShop.DAILY_SHOP_CONFIG.rerollPriceDiamond;
    if ((p.diamonds || 0) < cost) {
      socket.emit('daily_shop_buy_result', { success: false, msg: '다이아 부족' });
      return;
    }
    p.diamonds -= cost;
    p.dailyShopRerollCount = (p.dailyShopRerollCount || 0) + 1;
    const personalSeed = `${dailyShop.getTodaySeed()}_${p.id}_${p.dailyShopRerollCount}`;
    const personalShop = dailyShop.generateDailyShop(personalSeed);
    p.dailyShopBought = {};
    p.dailyShopBoughtSeed = personalShop.seed;
    p._personalDailyShop = personalShop;
    savePlayer(p);
    socket.emit('daily_shop_status_result', {
      seed: personalShop.seed,
      slots: personalShop.slots.map((item, idx) => ({ ...item, slotIdx: idx, bought: false })),
      rerollPrice: cost,
      isPersonal: true,
    });
    io.emit('player_update', p);
  });
}

module.exports = { registerDailyShopHandlers };
