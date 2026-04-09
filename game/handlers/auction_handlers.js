// 경매장 소켓 핸들러 — v1.84 (server.js에서 분리)
// ctx = { io, players, playerId, savePlayer, MAX_GOLD, auction, EQUIP_STATS, TRADE_GOODS }

function registerAuctionHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, auction, EQUIP_STATS, TRADE_GOODS } = ctx;

  socket.on('auction_list', (filter) => {
    const list = auction.getActiveAuctions(filter || {});
    socket.emit('auction_list_result', {
      auctions: list.map(a => ({
        id: a.id,
        sellerName: a.sellerName,
        itemId: a.itemId,
        itemName: a.itemName,
        startPrice: a.startPrice,
        currentBid: a.currentBid,
        currentBidderName: a.currentBidderName,
        expiresAt: a.expiresAt,
        bidCount: a.bidHistory.length,
      })),
    });
  });

  socket.on('auction_create', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.itemId || !data.startPrice) {
      socket.emit('auction_create_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    const startPrice = Math.floor(Number(data.startPrice));
    if (!Number.isFinite(startPrice) || startPrice < 1 || startPrice > MAX_GOLD) {
      socket.emit('auction_create_result', { success: false, msg: '잘못된 시작가' });
      return;
    }
    let itemName = data.itemId;
    if (EQUIP_STATS[data.itemId]) itemName = EQUIP_STATS[data.itemId].name;
    else if (TRADE_GOODS[data.itemId]) itemName = TRADE_GOODS[data.itemId].name;
    const result = auction.listAuction(p, data.itemId, itemName, startPrice, data.duration || 'medium');
    socket.emit('auction_create_result', result);
    if (result.success) {
      savePlayer(p);
      io.emit('player_update', p);
      io.emit('auction_listed', { auctionId: result.auctionId, itemName, sellerName: p.displayName });
    }
  });

  socket.on('auction_bid', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!data || !data.auctionId || !data.amount) {
      socket.emit('auction_bid_result', { success: false, msg: '필수 정보 누락' });
      return;
    }
    // 입찰 전 이전 입찰자 기록 (환불용)
    const a = auction._auctions[data.auctionId];
    const prevBidderId = a ? a.currentBidderId : null;
    const prevBid = a ? (a.currentBid || 0) : 0;

    const result = auction.placeBid(p, data.auctionId, Number(data.amount));
    socket.emit('auction_bid_result', result);

    if (result.success) {
      // 이전 입찰자 환불 (prevBid가 0이면 건너뜀)
      if (prevBidderId && prevBidderId !== p.id && prevBid > 0 && players[prevBidderId]) {
        const prev = players[prevBidderId];
        prev.gold = Math.min(MAX_GOLD, (prev.gold || 0) + prevBid);
        savePlayer(prev);
        try {
          io.to(prevBidderId).emit('auction_outbid', {
            auctionId: data.auctionId, refunded: prevBid, newBid: data.amount,
          });
        } catch (_) {}
        io.emit('player_update', prev);
      }
      savePlayer(p);
      io.emit('player_update', p);
      if (result.extended) {
        io.emit('auction_extended', { auctionId: data.auctionId, newExpiresAt: result.newExpiresAt });
      }
    }
  });

  socket.on('auction_my', () => {
    const p = players[playerId];
    if (!p) return;
    const selling = auction.getActiveAuctions({ sellerId: p.id });
    const bidding = Object.values(auction._auctions).filter(a => a.status === 'active' && a.currentBidderId === p.id);
    socket.emit('auction_my_result', {
      selling: selling.map(a => ({ id: a.id, itemName: a.itemName, currentBid: a.currentBid, expiresAt: a.expiresAt })),
      bidding: bidding.map(a => ({ id: a.id, itemName: a.itemName, currentBid: a.currentBid, expiresAt: a.expiresAt })),
    });
  });
}

module.exports = { registerAuctionHandlers };
