// 경매장 시스템 — v1.25
// 입찰식 경매 — 시작가, 최소 인상폭, 종료 시 자동 정산
// 막판 입찰 시 자동 시간 연장 (스나이핑 방지)
// 등록 수수료 + 낙찰 수수료 (양쪽 부담)

const AUCTION_CONFIG = {
  durations: {
    short:  3600 * 1000,        // 1시간
    medium: 6 * 3600 * 1000,    // 6시간
    long:   24 * 3600 * 1000,   // 24시간
  },
  listingFeePct: 0.02,    // 등록 수수료 2% (시작가 기준, 환불 안 됨)
  successFeePct: 0.05,    // 낙찰 수수료 5% (낙찰가 기준, 판매자 부담)
  minBidIncrementPct: 0.05, // 최소 입찰 인상폭 5%
  snipeWindowMs: 5 * 60 * 1000, // 종료 5분 전 입찰 시 5분 연장
  snipeExtensionMs: 5 * 60 * 1000,
  maxActiveListingsPerPlayer: 10,
};

let auctions = {};        // { auctionId: {...} }
let auctionIdCounter = 1;

function listAuction(player, itemId, itemName, startPrice, durationKey = 'medium') {
  if (!player.inventory || !player.inventory[itemId]) {
    return { success: false, msg: '아이템을 보유하지 않음' };
  }
  if (startPrice <= 0) return { success: false, msg: '시작가는 양수여야 함' };

  // 활성 등록 수 제한
  const myActive = Object.values(auctions).filter(a => a.sellerId === player.id && a.status === 'active');
  if (myActive.length >= AUCTION_CONFIG.maxActiveListingsPerPlayer) {
    return { success: false, msg: `등록 한도 초과 (${AUCTION_CONFIG.maxActiveListingsPerPlayer}개)` };
  }

  const fee = Math.floor(startPrice * AUCTION_CONFIG.listingFeePct);
  if (player.gold < fee) return { success: false, msg: `등록 수수료 ${fee}G 부족` };

  player.gold -= fee;
  player.inventory[itemId]--;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];

  const duration = AUCTION_CONFIG.durations[durationKey] || AUCTION_CONFIG.durations.medium;
  const auctionId = `auction_${auctionIdCounter++}`;
  auctions[auctionId] = {
    id: auctionId,
    sellerId: player.id,
    sellerName: player.displayName,
    itemId,
    itemName,
    startPrice,
    currentBid: 0,
    currentBidderId: null,
    currentBidderName: null,
    listedAt: Date.now(),
    expiresAt: Date.now() + duration,
    status: 'active',
    bidHistory: [],
  };
  return { success: true, auctionId, fee };
}

function placeBid(player, auctionId, bidAmount) {
  const a = auctions[auctionId];
  if (!a || a.status !== 'active') return { success: false, msg: '존재하지 않거나 종료된 경매' };
  if (a.sellerId === player.id) return { success: false, msg: '자기 경매에는 입찰 불가' };
  if (Date.now() > a.expiresAt) return { success: false, msg: '경매 시간 종료' };

  const minBid = a.currentBid > 0
    ? Math.ceil(a.currentBid * (1 + AUCTION_CONFIG.minBidIncrementPct))
    : a.startPrice;
  if (bidAmount < minBid) return { success: false, msg: `최소 ${minBid}G 이상` };
  if (player.gold < bidAmount) return { success: false, msg: '골드 부족' };

  // 이전 최고 입찰자에게 환불
  if (a.currentBidderId) {
    // 환불은 외부에서 처리 (player 객체 접근 필요)
  }

  // 골드 에스크로 (입찰자 골드 차감)
  player.gold -= bidAmount;

  a.currentBid = bidAmount;
  a.currentBidderId = player.id;
  a.currentBidderName = player.displayName;
  a.bidHistory.push({ bidder: player.displayName, amount: bidAmount, at: Date.now() });

  // 스나이핑 방지: 종료 5분 이내 입찰 시 5분 연장
  const remaining = a.expiresAt - Date.now();
  if (remaining < AUCTION_CONFIG.snipeWindowMs) {
    a.expiresAt += AUCTION_CONFIG.snipeExtensionMs;
    return { success: true, extended: true, newExpiresAt: a.expiresAt };
  }
  return { success: true, extended: false };
}

function settleAuction(auctionId) {
  const a = auctions[auctionId];
  if (!a || a.status !== 'active') return null;
  if (Date.now() < a.expiresAt) return null; // 아직 진행 중

  a.status = 'settled';
  if (!a.currentBidderId) {
    // 유찰 — 판매자에게 아이템 반환 (외부에서 처리)
    return { type: 'failed', sellerId: a.sellerId, itemId: a.itemId };
  }

  const fee = Math.floor(a.currentBid * AUCTION_CONFIG.successFeePct);
  const sellerPayout = a.currentBid - fee;
  return {
    type: 'success',
    sellerId: a.sellerId,
    sellerPayout,
    fee,
    buyerId: a.currentBidderId,
    itemId: a.itemId,
    finalPrice: a.currentBid,
  };
}

function getActiveAuctions(filter = {}) {
  return Object.values(auctions).filter(a => {
    if (a.status !== 'active') return false;
    if (filter.itemId && a.itemId !== filter.itemId) return false;
    if (filter.sellerId && a.sellerId !== filter.sellerId) return false;
    return true;
  });
}

function tickAuctions() {
  // 만료된 경매 자동 정산 (외부 타이머에서 호출)
  const settled = [];
  for (const a of Object.values(auctions)) {
    if (a.status === 'active' && Date.now() >= a.expiresAt) {
      const result = settleAuction(a.id);
      if (result) settled.push({ auctionId: a.id, ...result });
    }
  }
  return settled;
}

module.exports = {
  AUCTION_CONFIG,
  listAuction,
  placeBid,
  settleAuction,
  getActiveAuctions,
  tickAuctions,
  _auctions: auctions, // 디버그/테스트용
};
