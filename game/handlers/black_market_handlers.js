// 암시장 소켓 핸들러 — v1.87
function registerBlackMarketHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, blackMarket, getCurrentBlackMarket, setCurrentBlackMarket } = ctx;

  socket.on('black_market_status', () => {
    const p = players[playerId];
    if (!p) return;
    let cur = getCurrentBlackMarket();
    if (Date.now() >= cur.expiresAt) {
      cur = blackMarket.generateMarket();
      setCurrentBlackMarket(cur);
    }
    const bought = (p.blackMarketBoughtSeed === cur.seed) ? (p.blackMarketBought || {}) : {};
    socket.emit('black_market_status_result', {
      seed: cur.seed,
      expiresAt: cur.expiresAt,
      slots: cur.slots.map((item, idx) => ({
        ...item,
        slotIdx: idx,
        bought: !!bought[idx],
      })),
      rerollPrice: blackMarket.BLACK_MARKET_CONFIG.rerollPriceDiamond,
    });
  });

  socket.on('black_market_buy', (data) => {
    const p = players[playerId];
    if (!p) return;
    let cur = getCurrentBlackMarket();
    if (Date.now() >= cur.expiresAt) {
      cur = blackMarket.generateMarket();
      setCurrentBlackMarket(cur);
    }
    const slotIdx = data && Number(data.slotIdx);
    const result = blackMarket.buyItem(p, slotIdx, cur);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      if (result.item.rarity === 'legendary') {
        io.emit('server_msg', {
          msg: `[암시장] ${p.displayName}이(가) ${result.item.name}을(를) 구매했습니다!`,
          type: 'rare',
        });
      }
    }
    socket.emit('black_market_buy_result', result);
  });

  socket.on('black_market_reroll', () => {
    const p = players[playerId];
    if (!p) return;
    const result = blackMarket.rerollMarket(p);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      socket.emit('black_market_status_result', {
        seed: result.market.seed,
        expiresAt: result.market.expiresAt,
        slots: result.market.slots.map((item, idx) => ({ ...item, slotIdx: idx, bought: false })),
        rerollPrice: blackMarket.BLACK_MARKET_CONFIG.rerollPriceDiamond,
        isPersonal: true,
      });
    } else {
      socket.emit('black_market_buy_result', result);
    }
  });
}

module.exports = { registerBlackMarketHandlers };
