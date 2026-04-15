// ============================================
// 카드 거래소 — 글로벌 마켓 + 경매 + 교역로 + 암시장
// ============================================

const MARKET_FEE = 0.05; // 기본 5% 수수료
const MAX_LISTINGS = 5;
const AUCTION_MIN_INCREMENT = 0.10; // 최소 입찰 증가율 10%
const BLACK_MARKET_ROTATE_MS = 6 * 60 * 60 * 1000; // 6시간
const PRICE_HISTORY_MAX = 20;

// ── 글로벌 마켓 상태 ──────────────────────────
const globalMarket = {
  listings: [],           // 모든 플레이어 + 봇 리스팅
  priceHistory: {},       // { cardName: [{ price, time }] }
  tradeVolume: 0,         // 오늘 총 거래량
  auctions: [],           // 진행 중인 경매
  blackMarketCache: null, // { items, generatedAt }
  tradeRoutes: {},        // { playerId: [{ routeId, startedAt, endsAt, ... }] }
};

// ── 교역로 정의 ──────────────────────────────
const TRADE_ROUTES = [
  { id: 'route_silk',   name: '실크로드🐪',     cost: 5000,  duration: 3600,  reward: { gold: 2000 },                    risk: 0.10, desc: '동쪽 교역로' },
  { id: 'route_spice',  name: '향신료 항로🚢',   cost: 8000,  duration: 7200,  reward: { gold: 5000, diamonds: 3 },       risk: 0.15, desc: '남쪽 해상 교역' },
  { id: 'route_jewel',  name: '보석 광산⛏️',     cost: 15000, duration: 14400, reward: { gold: 10000, diamonds: 8 },      risk: 0.20, desc: '북쪽 광산 운송' },
  { id: 'route_magic',  name: '마법 물자🔮',     cost: 25000, duration: 21600, reward: { gold: 18000, diamonds: 15 },     risk: 0.25, desc: '마법 대륙 수출' },
  { id: 'route_dragon', name: '용의 보물🐲',     cost: 50000, duration: 28800, reward: { gold: 40000, diamonds: 30 },     risk: 0.35, desc: '드래곤 영역 밀무역' },
];

// ── 거래 평판 레벨 ───────────────────────────
const REPUTATION_LEVELS = [
  { name: '견습 상인',     minTrades: 0,   feeRate: 0.05 },
  { name: '상인',         minTrades: 10,  feeRate: 0.04 },
  { name: '대상인',       minTrades: 30,  feeRate: 0.03 },
  { name: '무역왕',       minTrades: 70,  feeRate: 0.02 },
  { name: '전설의 거상',   minTrades: 150, feeRate: 0.01 },
];

// ── 유틸 ─────────────────────────────────────
function getPlayerId(player) {
  return player.id || player.deviceId || 'unknown';
}

function getFeeRate(player) {
  const rep = getTradeReputation(player);
  return rep.feeRate;
}

function recordPriceHistory(cardName, price) {
  if (!globalMarket.priceHistory[cardName]) globalMarket.priceHistory[cardName] = [];
  const hist = globalMarket.priceHistory[cardName];
  hist.push({ price, time: Date.now() });
  if (hist.length > PRICE_HISTORY_MAX) hist.shift();
}

// ── 글로벌 마켓 초기화 (봇 리스팅) ───────────
function initGlobalMarket() {
  if (globalMarket.listings.length > 0) return; // 이미 초기화됨
  const botListings = generateBotMarket();
  globalMarket.listings.push(...botListings);
}

// ── 거래소 등록 ──────────────────────────────
function listCard(player, cardId, price) {
  if (!cardId || !price || price < 100) return { ok: false, reason: '최소 가격 100G' };
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  player._marketListings = player._marketListings || [];
  if (player._marketListings.length >= MAX_LISTINGS) return { ok: false, reason: `최대 ${MAX_LISTINGS}개 등록 가능` };

  // 카드를 인벤토리에서 제거 (거래소에 올림)
  player.cards = player.cards.filter(c => c.id !== cardId);
  const listing = {
    id: `listing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    card: { ...card },
    price,
    sellerId: getPlayerId(player),
    sellerName: player.displayName || player.name || '???',
    listedAt: Date.now(),
    isBot: false,
  };
  player._marketListings.push(listing);
  globalMarket.listings.push(listing);

  return { ok: true, msg: `"${card.name}" ${price}G에 등록!`, listing };
}

// ── 거래소에서 구매 (글로벌 풀) ──────────────
function buyFromMarket(player, listingId, allPlayers) {
  const idx = globalMarket.listings.findIndex(l => l.id === listingId);
  if (idx === -1) return { ok: false, reason: '매물 없음' };

  const listing = globalMarket.listings[idx];
  const playerId = getPlayerId(player);
  if (listing.sellerId === playerId) return { ok: false, reason: '자신의 매물은 구매 불가' };
  if ((player.gold || 0) < listing.price) return { ok: false, reason: '골드 부족' };

  const fee = Math.floor(listing.price * getFeeRate(player));
  const sellerGold = listing.price - fee;

  // 구매자 처리
  player.gold -= listing.price;
  player.cards = player.cards || [];
  player.cards.push({ ...listing.card, id: `card_${Date.now()}_bought` });

  // 거래량 & 가격 기록
  globalMarket.tradeVolume++;
  recordPriceHistory(listing.card.name, listing.price);
  player._tradeCount = (player._tradeCount || 0) + 1;

  // 글로벌 마켓에서 제거
  globalMarket.listings.splice(idx, 1);

  // 판매자에게 골드 지급 (봇이 아닌 경우)
  if (!listing.isBot && allPlayers) {
    const seller = allPlayers.find(p => getPlayerId(p) === listing.sellerId);
    if (seller) {
      seller.gold = (seller.gold || 0) + sellerGold;
      seller._marketListings = (seller._marketListings || []).filter(l => l.id !== listingId);
      seller._tradeCount = (seller._tradeCount || 0) + 1;
    }
  }

  return { ok: true, msg: `"${listing.card.name}" 구매 완료! (-${listing.price}G, 수수료 ${fee}G)`, fee };
}

// ── 봇 거래소 목록 생성 ──────────────────────
function generateBotMarket() {
  const gradeNames = {
    normal: ['병사', '궁수', '도적', '수습생'],
    rare: ['정예 전사', '마법 궁수', '암살자', '사제'],
    epic: ['영웅 검사', '대마도사', '성기사', '용기사'],
    legend: ['전설의 검성', '불사조', '빛의 천사', '용왕'],
  };
  const icons = { normal: '⚔️', rare: '🛡️', epic: '💎', legend: '🌟' };
  const listings = [];

  for (let i = 0; i < 8; i++) {
    const grades = ['normal', 'normal', 'normal', 'rare', 'rare', 'epic', 'epic', 'legend'];
    const grade = grades[i];
    const names = gradeNames[grade] || gradeNames.normal;
    const name = names[Math.floor(Math.random() * names.length)];
    const basePrice = { normal: 500, rare: 2000, epic: 8000, legend: 30000 }[grade] || 500;
    const price = basePrice + Math.floor(Math.random() * basePrice * 0.5);
    const baseAtk = { normal: 30, rare: 60, epic: 100, legend: 180 }[grade] || 30;

    listings.push({
      id: `bot_listing_${Date.now()}_${i}`,
      card: {
        name, icon: icons[grade], grade,
        atk: baseAtk + Math.floor(Math.random() * 20),
        def: Math.floor(baseAtk * 0.6 + Math.random() * 15),
        hp: Math.floor(baseAtk * 4 + Math.random() * 50),
        level: 1 + Math.floor(Math.random() * 10),
      },
      price,
      sellerId: `bot_${i}`,
      sellerName: ['상인 A', '상인 B', '용병상', '떠돌이', '고물상', '보석상', '기사단', '마법사'][i],
      listedAt: Date.now(),
      isBot: true,
    });
  }
  return listings;
}

// ── 마켓 통계 (가격 추이 & 공급/수요) ────────
function getMarketStats() {
  const stats = {};
  const grades = ['normal', 'rare', 'epic', 'legend'];

  for (const grade of grades) {
    const listings = globalMarket.listings.filter(l => l.card && l.card.grade === grade);
    const prices = listings.map(l => l.price);
    const avg = prices.length > 0 ? Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

    // 해당 등급의 가격 히스토리 집계
    let trend = 'stable';
    const gradeHistory = [];
    for (const [, hist] of Object.entries(globalMarket.priceHistory)) {
      for (const entry of hist) gradeHistory.push(entry);
    }
    // 최근 5개 vs 이전 5개 비교로 트렌드 판단
    const sorted = gradeHistory.sort((a, b) => a.time - b.time);
    if (sorted.length >= 6) {
      const recent = sorted.slice(-3).reduce((s, e) => s + e.price, 0) / 3;
      const older = sorted.slice(-6, -3).reduce((s, e) => s + e.price, 0) / 3;
      if (recent > older * 1.05) trend = 'up';
      else if (recent < older * 0.95) trend = 'down';
    }

    stats[grade] = { avg, trend, volume: listings.length, supply: listings.length };
  }
  stats.totalVolume = globalMarket.tradeVolume;
  return stats;
}

// ── 경매 시스템 ──────────────────────────────
function createAuction(player, cardId, startPrice, durationMinutes) {
  if (!cardId || !startPrice || startPrice < 100) return { ok: false, reason: '최소 시작가 100G' };

  const validDurations = [5, 15, 30, 60];
  if (!validDurations.includes(durationMinutes)) return { ok: false, reason: '유효 기간: 5분, 15분, 30분, 1시간' };

  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  // 레어 이상만 경매 가능
  const auctionGrades = ['rare', 'epic', 'legend', 'myth'];
  if (!auctionGrades.includes(card.grade)) return { ok: false, reason: '레어 이상 카드만 경매 가능' };

  // 인벤토리에서 제거
  player.cards = player.cards.filter(c => c.id !== cardId);

  const auction = {
    id: `auction_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    card: { ...card },
    sellerId: getPlayerId(player),
    sellerName: player.displayName || player.name || '???',
    startPrice,
    currentPrice: startPrice,
    currentBidderId: null,
    currentBidderName: null,
    bids: [],
    createdAt: Date.now(),
    endsAt: Date.now() + durationMinutes * 60 * 1000,
    resolved: false,
  };

  globalMarket.auctions.push(auction);
  return { ok: true, msg: `"${card.name}" 경매 시작! 시작가 ${startPrice}G, ${durationMinutes}분`, auction };
}

function placeBid(player, auctionId, bidAmount) {
  const auction = globalMarket.auctions.find(a => a.id === auctionId && !a.resolved);
  if (!auction) return { ok: false, reason: '경매 없음 또는 이미 종료' };

  if (auction.sellerId === getPlayerId(player)) return { ok: false, reason: '자신의 경매에 입찰 불가' };
  if (Date.now() > auction.endsAt) return { ok: false, reason: '경매 시간 종료' };

  const minBid = Math.ceil(auction.currentPrice * (1 + AUCTION_MIN_INCREMENT));
  if (bidAmount < minBid) return { ok: false, reason: `최소 입찰가: ${minBid}G (현재가의 +10%)` };
  if ((player.gold || 0) < bidAmount) return { ok: false, reason: '골드 부족' };

  // 이전 최고 입찰자에게 골드 반환 (allPlayers가 없으므로 추후 처리)
  // 여기서는 새 입찰자의 골드만 차감
  player.gold -= bidAmount;

  auction.bids.push({
    bidderId: getPlayerId(player),
    bidderName: player.displayName || player.name || '???',
    amount: bidAmount,
    time: Date.now(),
  });

  // 이전 입찰자 골드 반환을 위해 기록
  auction._prevBidderId = auction.currentBidderId;
  auction._prevBidAmount = auction.currentPrice !== auction.startPrice ? auction.currentPrice : 0;

  auction.currentPrice = bidAmount;
  auction.currentBidderId = getPlayerId(player);
  auction.currentBidderName = player.displayName || player.name || '???';

  return {
    ok: true,
    msg: `${bidAmount}G 입찰 완료! 현재 최고가`,
    auction: {
      id: auction.id,
      cardName: auction.card.name,
      currentPrice: auction.currentPrice,
      currentBidderName: auction.currentBidderName,
      endsAt: auction.endsAt,
      bidCount: auction.bids.length,
    },
  };
}

function resolveAuctions(allPlayers) {
  const now = Date.now();
  const resolved = [];

  for (const auction of globalMarket.auctions) {
    if (auction.resolved || now < auction.endsAt) continue;
    auction.resolved = true;

    if (!auction.currentBidderId || auction.bids.length === 0) {
      // 입찰자 없음 — 카드 반환
      if (allPlayers) {
        const seller = allPlayers.find(p => getPlayerId(p) === auction.sellerId);
        if (seller) {
          seller.cards = seller.cards || [];
          seller.cards.push(auction.card);
        }
      }
      resolved.push({ auctionId: auction.id, result: 'no_bids', card: auction.card.name });
      continue;
    }

    // 낙찰 — 카드를 낙찰자에게, 골드를 판매자에게
    const fee = Math.floor(auction.currentPrice * MARKET_FEE);
    if (allPlayers) {
      const winner = allPlayers.find(p => getPlayerId(p) === auction.currentBidderId);
      if (winner) {
        winner.cards = winner.cards || [];
        winner.cards.push({ ...auction.card, id: `card_${Date.now()}_auction` });
        winner._tradeCount = (winner._tradeCount || 0) + 1;
      }
      const seller = allPlayers.find(p => getPlayerId(p) === auction.sellerId);
      if (seller) {
        seller.gold = (seller.gold || 0) + auction.currentPrice - fee;
        seller._tradeCount = (seller._tradeCount || 0) + 1;
      }
    }

    globalMarket.tradeVolume++;
    recordPriceHistory(auction.card.name, auction.currentPrice);

    resolved.push({
      auctionId: auction.id,
      result: 'sold',
      card: auction.card.name,
      price: auction.currentPrice,
      winner: auction.currentBidderName,
      fee,
    });
  }

  // 종료된 경매 정리
  globalMarket.auctions = globalMarket.auctions.filter(a => !a.resolved);
  return resolved;
}

// ── 교역로 시스템 ────────────────────────────
function startTradeRoute(player, routeId) {
  const route = TRADE_ROUTES.find(r => r.id === routeId);
  if (!route) return { ok: false, reason: '교역로 없음' };
  if ((player.gold || 0) < route.cost) return { ok: false, reason: `골드 부족 (필요: ${route.cost}G)` };

  const playerId = getPlayerId(player);
  globalMarket.tradeRoutes[playerId] = globalMarket.tradeRoutes[playerId] || [];

  // 동일 교역로 중복 불가
  const active = globalMarket.tradeRoutes[playerId];
  if (active.find(r => r.routeId === routeId && !r.resolved)) {
    return { ok: false, reason: '이미 진행 중인 교역로' };
  }
  // 최대 3개 동시 진행
  const activeCount = active.filter(r => !r.resolved).length;
  if (activeCount >= 3) return { ok: false, reason: '최대 3개 교역로 동시 운영 가능' };

  player.gold -= route.cost;

  const entry = {
    routeId: route.id,
    routeName: route.name,
    cost: route.cost,
    startedAt: Date.now(),
    endsAt: Date.now() + route.duration * 1000,
    reward: route.reward,
    risk: route.risk,
    resolved: false,
  };
  active.push(entry);

  return { ok: true, msg: `${route.name} 교역 출발! (${route.duration / 60}분 소요, 위험도 ${Math.floor(route.risk * 100)}%)`, route: entry };
}

function checkTradeRoutes(player) {
  const playerId = getPlayerId(player);
  const routes = globalMarket.tradeRoutes[playerId] || [];
  const now = Date.now();
  const results = [];

  for (const route of routes) {
    if (route.resolved) continue;
    if (now < route.endsAt) {
      // 아직 진행 중
      const remaining = Math.ceil((route.endsAt - now) / 1000);
      results.push({ routeId: route.routeId, name: route.routeName, status: 'in_progress', remainingSec: remaining });
      continue;
    }

    // 완료!
    route.resolved = true;
    const failed = Math.random() < route.risk;

    if (failed) {
      results.push({ routeId: route.routeId, name: route.routeName, status: 'failed', msg: '교역 실패! 투자금을 잃었습니다...' });
    } else {
      const reward = route.reward;
      player.gold = (player.gold || 0) + (reward.gold || 0);
      player.diamonds = (player.diamonds || 0) + (reward.diamonds || 0);
      results.push({
        routeId: route.routeId, name: route.routeName, status: 'success',
        msg: `교역 성공! +${reward.gold || 0}G ${reward.diamonds ? `+${reward.diamonds}💎` : ''}`,
        reward,
      });
    }
  }

  // 해결된 항목 정리
  globalMarket.tradeRoutes[playerId] = routes.filter(r => !r.resolved);
  return results;
}

// ── 암시장 ───────────────────────────────────
function getBlackMarket(player) {
  const now = Date.now();

  // 6시간마다 갱신
  if (!globalMarket.blackMarketCache || now - globalMarket.blackMarketCache.generatedAt > BLACK_MARKET_ROTATE_MS) {
    const mythNames = ['태초의 용', '시간의 지배자', '심연의 군주', '천상의 수호자', '혼돈의 마왕'];
    const epicNames = ['영웅 검사', '대마도사', '성기사', '용기사', '암흑 기사'];
    const specialItems = ['경험치 부스터 2x', '골드 부스터 2x', '신비한 열쇠', '운명의 주사위', '전설의 제련석'];

    const items = [];

    // 1. 신화급 할인 (사기 위험)
    const mythName = mythNames[Math.floor(Math.random() * mythNames.length)];
    items.push({
      id: `bm_myth_${now}`,
      type: 'myth_discount',
      name: `[의심스러운] ${mythName}`,
      desc: '출처불명의 신화 카드 — 가짜일 수 있음 (20% 사기 확률)',
      card: { name: mythName, icon: '🌌', grade: 'myth', atk: 250, def: 200, hp: 900, level: 1 },
      price: 20000 + Math.floor(Math.random() * 10000),
      scamChance: 0.20,
    });

    // 2. 훔친 에픽 카드 (50% 할인)
    const epicName = epicNames[Math.floor(Math.random() * epicNames.length)];
    const epicBase = 8000;
    items.push({
      id: `bm_stolen_${now}`,
      type: 'stolen_goods',
      name: `[장물] ${epicName}`,
      desc: '도둑에게 구매한 에픽 카드 — 반값!',
      card: { name: epicName, icon: '💎', grade: 'epic', atk: 100 + Math.floor(Math.random() * 30), def: 70, hp: 400, level: 1 },
      price: Math.floor(epicBase * 0.5),
      scamChance: 0.05,
    });

    // 3. 밀수품 (특수 아이템)
    const specialName = specialItems[Math.floor(Math.random() * specialItems.length)];
    items.push({
      id: `bm_contraband_${now}`,
      type: 'contraband',
      name: `[밀수품] ${specialName}`,
      desc: '정규 시장에서 구할 수 없는 희귀 아이템',
      specialItem: specialName,
      price: 10000 + Math.floor(Math.random() * 5000),
      scamChance: 0.10,
    });

    globalMarket.blackMarketCache = { items, generatedAt: now };
  }

  // 평판에 따라 할인
  const rep = getTradeReputation(player);
  const discount = rep.level >= 3 ? 0.10 : rep.level >= 2 ? 0.05 : 0;
  const items = globalMarket.blackMarketCache.items.map(item => ({
    ...item,
    price: Math.floor(item.price * (1 - discount)),
    discountApplied: discount > 0 ? `${Math.floor(discount * 100)}%` : null,
  }));

  return { items, nextRotation: globalMarket.blackMarketCache.generatedAt + BLACK_MARKET_ROTATE_MS };
}

function buyBlackMarket(player, itemId) {
  const bm = getBlackMarket(player);
  const item = bm.items.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '아이템 없음 또는 이미 판매됨' };
  if ((player.gold || 0) < item.price) return { ok: false, reason: '골드 부족' };

  player.gold -= item.price;

  // 사기 판정
  const scammed = Math.random() < (item.scamChance || 0);
  if (scammed) {
    return { ok: true, scammed: true, msg: `사기당했습니다! ${item.price}G를 잃고 가짜 물건을 받았습니다... 💀` };
  }

  // 정상 구매
  player._tradeCount = (player._tradeCount || 0) + 1;

  if (item.card) {
    player.cards = player.cards || [];
    player.cards.push({ ...item.card, id: `card_${Date.now()}_bm` });
    return { ok: true, scammed: false, msg: `"${item.card.name}" 암시장 구매 성공! 🌙` };
  }

  if (item.specialItem) {
    player.items = player.items || [];
    player.items.push({ name: item.specialItem, obtainedAt: Date.now(), source: 'black_market' });
    return { ok: true, scammed: false, msg: `"${item.specialItem}" 획득! 🌙` };
  }

  return { ok: true, scammed: false, msg: '구매 완료!' };
}

// ── 거래 평판 ────────────────────────────────
function getTradeReputation(player) {
  const trades = player._tradeCount || 0;
  let level = 0;
  let current = REPUTATION_LEVELS[0];

  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (trades >= REPUTATION_LEVELS[i].minTrades) {
      current = REPUTATION_LEVELS[i];
      level = i;
      break;
    }
  }

  const next = REPUTATION_LEVELS[level + 1] || null;
  return {
    level,
    name: current.name,
    feeRate: current.feeRate,
    feePercent: `${Math.floor(current.feeRate * 100)}%`,
    totalTrades: trades,
    nextLevel: next ? { name: next.name, tradesNeeded: next.minTrades - trades } : null,
  };
}

// ── 소켓 등록 ────────────────────────────────
function register(io, socket, player, allPlayers) {
  // 글로벌 마켓 초기화
  initGlobalMarket();

  // 거래소 둘러보기 (글로벌 풀)
  socket.on('market_browse', () => {
    const playerId = getPlayerId(player);
    socket.emit('market_browse', {
      listings: globalMarket.listings.filter(l => l.sellerId !== playerId),
      myListings: player._marketListings || [],
      auctions: globalMarket.auctions.filter(a => !a.resolved).map(a => ({
        id: a.id, card: a.card, startPrice: a.startPrice,
        currentPrice: a.currentPrice, currentBidderName: a.currentBidderName,
        endsAt: a.endsAt, bidCount: a.bids.length, sellerName: a.sellerName,
      })),
      fee: getFeeRate(player),
      maxListings: MAX_LISTINGS,
    });
  });

  // 카드 등록
  socket.on('market_list_card', (data) => {
    const result = listCard(player, data.cardId, data.price);
    socket.emit('market_list_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      // 다른 플레이어에게 새 매물 알림
      socket.broadcast.emit('market_new_listing', { listing: result.listing });
    }
  });

  // 구매
  socket.on('market_buy', (data) => {
    const result = buyFromMarket(player, data.listingId, allPlayers);
    socket.emit('market_buy_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      socket.broadcast.emit('market_sold', { listingId: data.listingId });
    }
  });

  // 마켓 통계
  socket.on('market_stats', () => {
    socket.emit('market_stats', getMarketStats());
  });

  // 경매 생성
  socket.on('market_create_auction', (data) => {
    const result = createAuction(player, data.cardId, data.startPrice, data.duration || 15);
    socket.emit('market_auction_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      io.emit('market_new_auction', { auction: result.auction });
    }
  });

  // 경매 입찰
  socket.on('market_bid', (data) => {
    const result = placeBid(player, data.auctionId, data.amount);
    socket.emit('market_bid_result', result);
    if (result.ok) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
      io.emit('market_bid_update', result.auction);
    }
  });

  // 교역로 시작
  socket.on('trade_route_start', (data) => {
    const result = startTradeRoute(player, data.routeId);
    socket.emit('trade_route_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 교역로 상태 확인
  socket.on('trade_route_check', () => {
    const results = checkTradeRoutes(player);
    socket.emit('trade_route_status', { routes: results, available: TRADE_ROUTES });
    // 교역 완료 시 골드 업데이트
    if (results.some(r => r.status === 'success' || r.status === 'failed')) {
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 암시장 둘러보기
  socket.on('black_market_browse', () => {
    const bm = getBlackMarket(player);
    socket.emit('black_market_browse', bm);
  });

  // 암시장 구매
  socket.on('black_market_buy', (data) => {
    const result = buyBlackMarket(player, data.itemId);
    socket.emit('black_market_buy_result', result);
    socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 거래 평판 조회
  socket.on('trade_reputation', () => {
    socket.emit('trade_reputation', getTradeReputation(player));
  });
}

// ── 경매 자동 해결 (서버에서 주기적 호출) ────
function tickAuctions(allPlayers) {
  return resolveAuctions(allPlayers);
}

module.exports = {
  listCard,
  buyFromMarket,
  generateBotMarket,
  register,
  MARKET_FEE,
  globalMarket,
  initGlobalMarket,
  getMarketStats,
  createAuction,
  placeBid,
  resolveAuctions,
  tickAuctions,
  startTradeRoute,
  checkTradeRoutes,
  getBlackMarket,
  buyBlackMarket,
  getTradeReputation,
  TRADE_ROUTES,
  REPUTATION_LEVELS,
};
