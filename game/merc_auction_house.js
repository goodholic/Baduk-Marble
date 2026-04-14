// v5.5 — 용병 경매장 시스템
// 플레이어 간 용병 거래, 실시간 경매, 즉시 구매, 임대

const AUCTION_FEE = 0.05; // 5% 수수료
const AUCTION_DURATION = 3600; // 1시간
const MAX_LISTINGS = 5;

const LISTING_TYPES = {
  auction:  { name: '경매', icon: '🔨', desc: '입찰 경쟁, 최고가 낙찰', minBidIncrement: 0.1 },
  buyout:   { name: '즉시 구매', icon: '💰', desc: '정가에 즉시 구매' },
  rental:   { name: '임대', icon: '📋', desc: '일정 기간 대여, 기간 후 반환', durations: [3600, 86400, 604800] },
  trade:    { name: '교환', icon: '🔄', desc: '다른 용병과 1:1 교환 제안' },
};

// 희귀도별 최소 가격 가이드
const PRICE_GUIDE = {
  normal: { min: 1000, avg: 3000 },
  elite:  { min: 5000, avg: 15000 },
  rare:   { min: 15000, avg: 50000 },
  boss:   { min: 50000, avg: 150000 },
  legend: { min: 150000, avg: 500000 },
  myth:   { min: 500000, avg: 2000000 },
};

// 용병 감정가 (자동 가치 평가)
function appraiseMerc(merc) {
  const base = PRICE_GUIDE[merc.grade || 'normal']?.avg || 3000;
  let mul = 1.0;
  mul += (merc.level || 1) * 0.02;
  if (merc.awakened) mul += 0.5;
  if (merc.generation >= 3) mul += (merc.generation - 2) * 0.3;
  if (merc.hereditaryTraits?.length) mul += merc.hereditaryTraits.length * 0.15;
  if (merc.hidden) mul += 1.0;
  if (merc.captured) mul += 0.3;
  return Math.floor(base * mul);
}

// 경매 히스토리 (최근 거래 내역)
const HISTORY_MAX = 50;

function createListing(player, mercId, type, price, duration) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const listings = player.auctionListings || [];
  if (listings.length >= MAX_LISTINGS) return { ok: false, reason: `최대 ${MAX_LISTINGS}개 등록 가능` };

  const appraised = appraiseMerc(merc);
  const listing = {
    id: `auc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    sellerId: player.id, sellerName: player.name,
    merc: { id: merc.id, name: merc.name, grade: merc.grade, level: merc.level, class: merc.class, generation: merc.generation, awakened: merc.awakened },
    type, price, appraised,
    currentBid: type === 'auction' ? price : null,
    highBidder: null,
    duration: duration || AUCTION_DURATION,
    createdAt: Date.now(),
    status: 'active',
  };

  listings.push(listing);
  player.auctionListings = listings;
  return { ok: true, listing };
}

function placeBid(listing, player, amount) {
  if (listing.type !== 'auction') return { ok: false, reason: '경매가 아닙니다' };
  if (listing.status !== 'active') return { ok: false, reason: '종료된 경매' };
  const minBid = listing.currentBid * (1 + LISTING_TYPES.auction.minBidIncrement);
  if (amount < minBid) return { ok: false, reason: `최소 입찰가: ${Math.ceil(minBid)}G` };
  if ((player.gold || 0) < amount) return { ok: false, reason: '골드 부족' };

  player.gold -= amount;
  listing.currentBid = amount;
  listing.highBidder = { id: player.id, name: player.name };
  return { ok: true, bid: amount };
}

function register(io, socket, player) {
  socket.on('auction_list', () => {
    socket.emit('auction_list', { types: LISTING_TYPES, priceGuide: PRICE_GUIDE, fee: AUCTION_FEE, myListings: player.auctionListings || [] });
  });
  socket.on('auction_create', (data) => {
    const result = createListing(player, data.mercId, data.type, data.price, data.duration);
    socket.emit('auction_create_result', result);
    if (result.ok) io.emit('server_msg', `🔨 [경매] ${player.name}이(가) "${result.listing.merc.name}" 등록! (${result.listing.type})`);
  });
  socket.on('auction_appraise', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('auction_appraise', { ok: false });
    socket.emit('auction_appraise', { ok: true, value: appraiseMerc(merc) });
  });
}

module.exports = { LISTING_TYPES, PRICE_GUIDE, AUCTION_FEE, appraiseMerc, createListing, placeBid, register };
